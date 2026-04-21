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
            .select(`*`);
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
            return {
                id: tenant.id,
                name: tenant.nome || tenant.nome_fantasia || tenant.name || '',
                city: tenant.cidade || tenant.city || '',
                created_at: tenant.created_at,
                plan: tenant.plan || 'basic',
                subscription_status: tenant.subscription_status || 'active',
                subscription_current_period_end: tenant.subscription_current_period_end || tenant.created_at,
                business_type: 'glass',
                owner: [],
                stats: {
                    total_attendances: 0,
                    total_users: 0,
                    total_sales: 0,
                    total_revenue: 0
                },
                has_whatsapp: false,
                // Campos extras do Glass
                modulos_ativos: tenant.modulos_ativos || null,
                limite_usuarios: tenant.limite_usuarios || null,
                status_assinatura: tenant.status_assinatura || null,
                mensagens_whatsapp: tenant.mensagens_whatsapp || null,
                limite_mensagens_whatsapp: tenant.limite_mensagens_whatsapp || null
            };
        });

        // Unir os dois arrays
        const allTenants = [...tenantsWithStatsBarber, ...tenantsWithStatsGlass];
        console.log('[API SYSTEM TENANTS] Tenants retornados:', JSON.stringify(allTenants, null, 2));
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
