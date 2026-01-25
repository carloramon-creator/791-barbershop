import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const confirm = searchParams.get('confirm') === 'true';
        const limit = parseInt(searchParams.get('limit') || '10');
        const hours = parseInt(searchParams.get('hours') || '12');

        // Buscar tenants que parecem ser testes (ex: plano trial e criados há mais de X horas)
        const transitionDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

        const { data: testTenants, error: tenantError } = await getSupabaseAdmin()
            .from('tenants')
            .select('id, name, created_at, plan')
            .eq('plan', 'trial')
            .lt('created_at', transitionDate)
            .limit(limit);

        if (tenantError) throw tenantError;

        if (!confirm) {
            return NextResponse.json({
                message: 'ESTA É UMA PRÉVIA. Use ?confirm=true para excluir.',
                found: testTenants?.length || 0,
                tenants: testTenants
            });
        }

        const results = [];
        for (const tenant of (testTenants || [])) {
            console.log(`[CLEANUP] Removendo tenant: ${tenant.name} (${tenant.id})`);

            // 1. Buscar usuários do tenant
            const { data: users } = await getSupabaseAdmin()
                .from('users')
                .select('id, email')
                .eq('tenant_id', tenant.id);

            // 2. Excluir usuários do Auth (CRÍTICO para liberar emails)
            if (users) {
                for (const u of users) {
                    try {
                        const { error: authError } = await getSupabaseAdmin().auth.admin.deleteUser(u.id);
                        if (authError) console.error(`[CLEANUP] Erro ao deletar no Auth (${u.email}):`, authError.message);
                    } catch (e: any) {
                        console.error(`[CLEANUP] Falha crítica ao deletar no Auth (${u.email}):`, e.message);
                    }
                }
            }

            // 3. Excluir o tenant (o banco deve lidar com CASCADE se configurado, senão removemos manualmente as refs)
            // Nota: Se não houver CASCADE, isso pode falhar.
            const { error: deleteError } = await getSupabaseAdmin()
                .from('tenants')
                .delete()
                .eq('id', tenant.id);

            results.push({
                tenant: tenant.name,
                id: tenant.id,
                success: !deleteError,
                error: deleteError?.message,
                usersCount: users?.length || 0
            });
        }

        return NextResponse.json({
            message: 'Limpeza concluída',
            results
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
