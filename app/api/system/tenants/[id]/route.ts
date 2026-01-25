import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';

export async function OPTIONS(req: Request) {
    return addCorsHeaders(req, new NextResponse(null, { status: 200 }));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { user } = await getCurrentUserAndTenant();

        // Verificar se é super admin
        const { data: userData } = await getSupabaseAdmin()
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
        const allowedFields = ['plan', 'subscription_status', 'subscription_current_period_end', 'name', 'active', 'settings'];
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

        const { error } = await getSupabaseAdmin()
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

        const { data: userData } = await getSupabaseAdmin()
            .from('users')
            .select('is_system_admin')
            .eq('id', currentUser.id)
            .single();

        if (!userData || !userData.is_system_admin) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Acesso negado' }, { status: 403 }));
        }

        const { id: tenantId } = await params;

        console.log(`[SYSTEM] Admin ${currentUser.id} initializing robust deletion for tenant ${tenantId}`);

        // 1. Buscar todos os usuários vinculados ao tenant
        const { data: usersToDelete, error: fetchUsersError } = await getSupabaseAdmin()
            .from('users')
            .select('id, email')
            .eq('tenant_id', tenantId);

        if (fetchUsersError) {
            console.error('[SYSTEM] Erro ao buscar usuários:', fetchUsersError);
        }

        // 2. Limpeza profunda por usuário
        if (usersToDelete && usersToDelete.length > 0) {
            console.log(`[SYSTEM] Iniciando limpeza de ${usersToDelete.length} usuários para o tenant ${tenantId}`);

            for (const u of usersToDelete) {
                try {
                    console.log(`[SYSTEM] Removendo dependências do banco para user ${u.id} (${u.email})`);

                    // a. Remover da tabela de barbeiros (se existir)
                    await getSupabaseAdmin().from('barbers').delete().eq('user_id', u.id).eq('tenant_id', tenantId);

                    // b. Remover da tabela de usuários (nossa customizada)
                    await getSupabaseAdmin().from('users').delete().eq('id', u.id).eq('tenant_id', tenantId);

                    // c. Remover do Supabase Auth (Obrigatório para liberar o e-mail)
                    const { error: authError } = await getSupabaseAdmin().auth.admin.deleteUser(u.id);
                    if (authError) {
                        console.error(`[SYSTEM] Erro ao deletar no Auth: ${authError.message}`);
                    } else {
                        console.log(`[SYSTEM] Usuário ${u.email} removido do Auth com sucesso.`);
                    }
                } catch (err: any) {
                    console.error(`[SYSTEM] Falha crítica ao limpar usuário ${u.id}:`, err.message);
                }
            }
        }

        // 3. Excluir o registro do tenant
        console.log(`[SYSTEM] Excluindo registro do tenant ${tenantId} do banco de dados`);
        const { error: tenantDeleteError } = await getSupabaseAdmin()
            .from('tenants')
            .delete()
            .eq('id', tenantId);

        if (tenantDeleteError) {
            console.error('[SYSTEM] Erro ao excluir tenant:', tenantDeleteError);
            throw tenantDeleteError;
        }

        console.log(`[SYSTEM] ✅ Tenant ${tenantId} excluído com sucesso.`);

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            usersRemoved: usersToDelete?.length || 0
        }));
    } catch (error: any) {
        console.error('[SYSTEM] Falha geral na exclusão do tenant:', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
