import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getSupabaseGlassAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';

export async function GET(req: Request) {
    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        // Buscar tenants do banco principal (barber)
        const { data: tenantsBarber, error: tenantsError } = await getSupabaseAdmin()
            .from('tenants')
            .select(`
                *,
                users(*),
                barbers(status),
                whatsapp_configs(phone_number_id)
            `);
        if (tenantsError) throw tenantsError;

        // Buscar tenants do banco glass
        const { data: tenantsGlass, error: tenantsGlassError } = await getSupabaseGlassAdmin()
            .from('vidracarias')
            .select(`*, users(*)`);
        if (tenantsGlassError) throw tenantsGlassError;

        // Processar tenants do banco principal
        const tenantsWithStatsBarber = await Promise.all((tenantsBarber || []).map(async (tenant: any) => {
            const owner = tenant.users?.find((u: any) => u.role === 'owner') || tenant.users?.[0];
            const { data: stats } = await getSupabaseAdmin().rpc('get_tenant_stats', { tenant_uuid: tenant.id });
            return {
                ...tenant,
                owner: owner ? [owner] : [],
                stats: stats || {
                    total_attendances: 0,
                    total_users: 0,
                    total_sales: 0,
                    total_revenue: 0
                },
                has_whatsapp: Array.isArray(tenant.whatsapp_configs)
                    ? tenant.whatsapp_configs.length > 0
                    : !!tenant.whatsapp_configs
            };
        }));

        // Processar tenants do banco glass
        const tenantsWithStatsGlass = (tenantsGlass || []).map((tenant: any) => {
            const owner = tenant.users?.find((u: any) => u.role === 'owner') || tenant.users?.[0];
            return {
                ...tenant,
                business_type: 'glass', // Garante que o frontend reconheça como vidraçaria
                owner: owner ? [owner] : [],
                stats: {
                    total_attendances: 0,
                    total_users: (tenant.users || []).length,
                    total_sales: 0,
                    total_revenue: 0
                },
                has_whatsapp: false // Ajuste conforme necessário se houver integração WhatsApp
            };
        });

        // Unir os dois arrays
        const allTenants = [...tenantsWithStatsBarber, ...tenantsWithStatsGlass];
        const response = NextResponse.json(allTenants);
        return addCorsHeaders(req, response);
    } catch (error: any) {
        console.error('[SYSTEM TENANTS GET] Error:', error.message);
        const response = NextResponse.json({ error: error.message }, { status: 400 });
        return addCorsHeaders(req, response);
    }
}

export async function OPTIONS(req: Request) {
    return addCorsHeaders(req, NextResponse.json({}, { status: 200 }));
}
