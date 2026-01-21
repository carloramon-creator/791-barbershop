import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';

export async function OPTIONS(req: Request) {
    return addCorsHeaders(req, new NextResponse(null, { status: 200 }));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { user } = await getCurrentUserAndTenant();

        // Verificar se é super admin
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('is_system_admin')
            .eq('id', user.id)
            .single();

        if (!userData || !userData.is_system_admin) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Acesso negado: Requer privilégios de Super Admin' }, { status: 403 }));
        }

        const body = await req.json();
        // Em Next 15, params pode ser promise awaitable
        const { id: tenantId } = await params;

        // Validar campos permitidos para segurança
        const allowedFields = ['plan', 'subscription_status', 'trial_ends_at', 'name', 'active', 'settings'];
        const updates: any = {};

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Nenhum campo válido para atualização' }, { status: 400 }));
        }

        console.log(`[SYSTEM] Admin ${user.id} updating tenant ${tenantId}:`, updates);

        const { error } = await supabaseAdmin
            .from('tenants')
            .update(updates)
            .eq('id', tenantId);

        if (error) {
            console.error('[SYSTEM] Error updating tenant:', error);
            throw error;
        }

        return addCorsHeaders(req, NextResponse.json({ success: true, updates }));
    } catch (error: any) {
        console.error('[SYSTEM] Failed to update tenant:', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { user: currentUser } = await getCurrentUserAndTenant();

        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('is_system_admin')
            .eq('id', currentUser.id)
            .single();

        if (!userData || !userData.is_system_admin) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Acesso negado' }, { status: 403 }));
        }

        const { id: tenantId } = await params;

        console.log(`[SYSTEM] Admin ${currentUser.id} initializing full deletion for tenant ${tenantId}`);

        // 1. Buscar todos os usuários vinculados ao tenant
        const { data: usersToDelete, error: fetchUsersError } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .eq('tenant_id', tenantId);

        if (fetchUsersError) {
            console.error('[SYSTEM] Erro ao buscar usuários para exclusão:', fetchUsersError);
        }

        // 2. Excluir usuários do Supabase Auth (CRÍTICO)
        if (usersToDelete && usersToDelete.length > 0) {
            console.log(`[SYSTEM] Removendo ${usersToDelete.length} usuários do Auth para o tenant ${tenantId}`);
            for (const user of usersToDelete) {
                try {
                    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
                    if (authError) {
                        console.error(`[SYSTEM] Falha ao deletar usuário ${user.email} (${user.id}) no Auth:`, authError.message);
                    }
                } catch (e: any) {
                    console.error(`[SYSTEM] Erro crítico ao processar deleção de Auth para ${user.id}:`, e.message);
                }
            }
        }

        // 3. Excluir o registro do tenant (o banco deve lidar com CASCADE para o restante das tabelas)
        const { error } = await supabaseAdmin
            .from('tenants')
            .delete()
            .eq('id', tenantId);

        if (error) {
            console.error('[SYSTEM] Erro ao excluir tenant do banco:', error);
            throw error;
        }

        console.log(`[SYSTEM] Tenant ${tenantId} e seus usuários foram excluídos com sucesso.`);

        return addCorsHeaders(req, NextResponse.json({ success: true, usersRemoved: usersToDelete?.length || 0 }));
    } catch (error: any) {
        console.error('[SYSTEM] Failed to delete tenant:', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
