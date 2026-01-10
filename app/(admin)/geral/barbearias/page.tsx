import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';
import ClientPage from './page.client';

export const dynamic = 'force-dynamic';

export default async function TenantsPageServer() {
    let tenants = [];
    let error = null;

    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return <div className="p-20 text-center font-bold text-red-500">Acesso Negado: Área Restrita ao Administrador</div>;
        }
        // Direct Database Access (No Fetch)
        const { data, error: dbError } = await supabaseAdmin
            .from('tenants')
            .select(`
                *,
                users(*)
            `);

        if (dbError) throw dbError;

        // Process stats
        tenants = await Promise.all((data || []).map(async (tenant: any) => {
            const owner = tenant.users?.find((u: any) => u.role === 'owner') || tenant.users?.[0];
            const { data: stats } = await supabaseAdmin.rpc('get_tenant_stats', { tenant_uuid: tenant.id });

            return {
                ...tenant,
                owner: owner ? [owner] : [],
                stats: stats || {
                    total_attendances: 0,
                    total_users: 0,
                    total_sales: 0,
                    total_revenue: 0
                }
            };
        }));

    } catch (e: any) {
        console.error('[SERVER COMPONENT ERROR]', e);
        error = e.message;
    }

    return <ClientPage initialTenants={tenants} initialError={error} />;
}
