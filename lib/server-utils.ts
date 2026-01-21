import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, getSupabaseAdmin } from './supabase-server';
import { Plan } from './backend-types';

/**
 * UTILITY PRINCIPAL DE AUTENTICAÇÃO (SSR)
 * Design resiliênte para evitar falhas de sessão no Railway/Vercel.
 */
export async function getCurrentUserAndTenant() {
    try {
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();

        let userAuthId: string | null = null;
        let userObj: any = null;

        // 1. Tentar ler o token do Header Authorization (prioridade para chamadas via API)
        const headerStore = await headers();
        const authHeader = headerStore.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const { data: { user: adminUser }, error: adminError } = await supabaseAdmin.auth.getUser(token);
            if (adminUser && !adminError) {
                userAuthId = adminUser.id;
                userObj = adminUser;
                console.log(`[AUTH] Sessão via Authorization Header (Admin: ${adminUser.email})`);
            }
        }

        // 2. Tentar via SDK (Supabase SSR) - MÉTODO OFICIAL E MAIS CONFIÁVEL
        if (!userAuthId) {
            try {
                const client = await supabase();
                const { data: { user: sdkUser }, error: sdkError } = await client.auth.getUser();
                if (sdkUser && !sdkError) {
                    userAuthId = sdkUser.id;
                    userObj = sdkUser;
                    console.log(`[AUTH] Sessão via SDK (SSR: ${sdkUser.email})`);
                } else if (sdkError) {
                    console.log(`[AUTH] SDK Session mismatch: ${sdkError.message}`);
                }
            } catch (sdkErr) {
                console.log(`[AUTH] SDK Critical Failure:`, sdkErr);
            }
        }

        // 3. Tentar ler o token manualmente dos cookies (FALLBACK RADICAL)
        if (!userAuthId) {
            console.log(`[AUTH] Iniciando varredura bruta de ${allCookies.length} cookies (Fallback)...`);

            // Reconstruir cookies fragmentados (Supabase SSR divide tokens longos em chunks .0, .1 ou -0, -1)
            const chunkedGroups: Record<string, string[]> = {};
            for (const c of allCookies) {
                const isAuthCookie = c.name.includes('auth-token') || c.name.startsWith('sb-') || c.name.includes('supabase-auth');
                if (!isAuthCookie) continue;

                // Tenta detectar o índice do chunk (. index ou - index)
                const parts = c.name.split(/[.-]/);
                const lastPart = parts[parts.length - 1];
                const index = /^\d+$/.test(lastPart) ? parseInt(lastPart, 10) : 0;

                // O nome base é tudo exceto o índice se ele existir
                const baseName = index > 0 || (parts.length > 1 && /^\d+$/.test(lastPart))
                    ? c.name.substring(0, c.name.lastIndexOf(c.name.includes('.') ? '.' : '-'))
                    : c.name;

                if (!chunkedGroups[baseName]) chunkedGroups[baseName] = [];
                chunkedGroups[baseName][index] = c.value;
            }

            for (const baseName in chunkedGroups) {
                const fullValue = chunkedGroups[baseName].join('');
                if (!fullValue || fullValue.length < 40) continue;

                try {
                    const val = decodeURIComponent(fullValue);
                    let token = val;

                    if (val.startsWith('[')) {
                        try { token = JSON.parse(val)[0]; } catch { }
                    } else if (val.startsWith('{')) {
                        try {
                            const parsed = JSON.parse(val);
                            token = parsed.access_token || parsed.token || parsed[0] || val;
                        } catch { }
                    } else if (val.includes('"access_token"')) {
                        const match = val.match(/"access_token"\s*:\s*"([^"]+)"/);
                        if (match) token = match[1];
                    } else {
                        token = val.replace(/^"|"$/g, '');
                    }

                    if (token && token.split('.').length === 3) {
                        const { data: { user: adminUser }, error: adminError } = await supabaseAdmin.auth.getUser(token);
                        if (adminUser && !adminError) {
                            console.log(`[AUTH] Sucesso via Fallback Manual [${baseName}] (Usuário: ${adminUser.email})`);
                            userAuthId = adminUser.id;
                            userObj = adminUser;
                            break;
                        }
                    }
                } catch (e) { }
            }
        }

        if (!userAuthId) {
            throw new Error('Usuário não autenticado ou sessão expirada');
        }

        // 3. Buscar Perfil no Banco
        const { data: userData, error: profileError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userAuthId)
            .single();

        if (profileError || !userData) {
            console.error(`[AUTH] Perfil não encontrado para ID: ${userAuthId}. Erro: ${profileError?.message || 'Sem dados'}`);
            throw new Error('Perfil do sistema não localizado.');
        }

        // Segurança Ramon
        const userEmail = (userData.email || '').toLowerCase();
        const isSystemAdmin =
            userData.is_system_admin === true ||
            userEmail === 'ramon@791solucoes.com.br' ||
            userData.role === 'admin';

        let tenantIdToUse = userData.tenant_id;

        // 4. IMPERSONATE
        const impersonateCookie = cookieStore.get('impersonate_tenant_id');
        if (isSystemAdmin && impersonateCookie?.value) {
            tenantIdToUse = impersonateCookie.value;
        }

        if (!tenantIdToUse && isSystemAdmin) {
            console.log('[AUTH] Admin without tenant_id, attempting fallback...');
            const { data: fallback } = await supabaseAdmin.from('tenants').select('id').limit(1).maybeSingle();
            tenantIdToUse = fallback?.id;
        }

        if (!tenantIdToUse && !isSystemAdmin) {
            throw new Error('Sua conta não possui uma barbearia vinculada.');
        }

        // 5. Carregar Dados da Barbearia
        let tenantData = null;
        if (tenantIdToUse) {
            // Primeiro busca o tenant básico (sempre funciona)
            const { data: tenant } = await supabaseAdmin
                .from('tenants')
                .select('*')
                .eq('id', tenantIdToUse)
                .single();

            if (tenant) {
                // Tenta buscar o plano do sistema separadamente
                let systemPlan = null;
                if (tenant.plan) {
                    const { data: sPlan } = await supabaseAdmin
                        .from('system_plans')
                        .select('menu_permissions, staff_limit')
                        .eq('slug', tenant.plan)
                        .maybeSingle();
                    systemPlan = sPlan;
                }
                // Carregar Add-ons Ativos
                const { data: addons } = await supabaseAdmin
                    .from('tenant_addons')
                    .select('id, addon_id, system_addons(slug)')
                    .eq('tenant_id', tenantIdToUse)
                    .eq('status', 'active');

                tenantData = {
                    ...tenant,
                    system_plan: systemPlan || { menu_permissions: [], staff_limit: 0 },
                    active_addons: addons?.map((a: any) => a.system_addons?.slug).filter(Boolean) || []
                };
            }
        }

        return {
            user: { ...userObj, id: userAuthId, email: userData.email, role: userData.role },
            tenant: tenantData,
            tenantId: tenantIdToUse,
            isSystemAdmin,
            role: userData.role,
            roles: userData.roles || [userData.role]
        };

    } catch (error: any) {
        throw error;
    }
}

/** Permissões de Plano */
export function assertPlan(tenant: any, requiredPlan: Plan) {
    if (!tenant) throw new Error('Dados da barbearia ausentes.');
    const plans: Record<Plan, number> = { basic: 1, premium: 2, complete: 3, trial: 1 };
    const current = plans[tenant.plan as Plan] || 1;
    const required = plans[requiredPlan];
    if (current < required) throw new Error(`Requer plano ${requiredPlan.toUpperCase()}`);
}

export const assertPlanAtLeast = (planName: string, requiredPlan: Plan) => {
    const plans: Record<Plan, number> = { basic: 1, premium: 2, complete: 3, trial: 1 };
    const current = plans[planName as Plan] || 1;
    const required = plans[requiredPlan];
    if (current < required) throw new Error(`Requer plano ${requiredPlan.toUpperCase()}`);
};

/** Permissões de Role */
export async function checkRole(requiredRole: 'owner' | 'barber' | 'staff') {
    const { role } = await getCurrentUserAndTenant();
    const rolesPriority = { owner: 3, barber: 2, staff: 1 };
    const userRole = (role || 'staff') as keyof typeof rolesPriority;
    if (rolesPriority[userRole] < rolesPriority[requiredRole]) {
        throw new Error('Acesso negado');
    }
}

export function checkRolePermission(roleOrRoles: string | string[], permission: string) {
    const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    return roles.includes('admin') || roles.includes('system_admin') || roles.includes('owner');
}

/** Estética de Status */
export function getStatusColor(status: string) {
    switch (status) {
        case 'waiting': return 'text-yellow-500';
        case 'attending': return 'text-emerald-500';
        case 'finished': return 'text-slate-400';
        case 'canceled': return 'text-red-500';
        default: return 'text-slate-300';
    }
}

/** Cálculo de Médias Dinâmicas */
export async function getDynamicBarberAverages(tenantId: string) {
    try {
        const { data } = await supabaseAdmin.from('barbers').select('id, avg_time_minutes').eq('tenant_id', tenantId);
        const averages: Record<string, number> = {};
        (data || []).forEach(b => averages[b.id] = b.avg_time_minutes || 30);
        return averages;
    } catch {
        return {};
    }
}

/** Headers CORS utilitário */
export function addCorsHeaders(req: Request, res: NextResponse) {
    const origin = req.headers.get('origin') || '*';
    const response = res || NextResponse.json({});
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;
}

export async function resolveTenantId(idOrSlug: string) {
    if (!idOrSlug) return null;
    const cleanId = idOrSlug.trim();
    if (cleanId.length > 30 && cleanId.includes('-')) return cleanId;

    console.log(`[RESOLVE_TENANT] Final cleanId: "${cleanId}"`);
    const admin = getSupabaseAdmin();

    // Busca exata por slug
    console.log(`[RESOLVE_TENANT] Querying Supabase for slug ilike: "${cleanId.toLowerCase()}"`);
    const { data: results, error } = await admin
        .from('tenants')
        .select('id')
        .ilike('slug', cleanId.toLowerCase());

    if (error) {
        console.error('[RESOLVE_TENANT_ERROR]', error);
        return null;
    }

    console.log(`[RESOLVE_TENANT] Results from DB:`, results);
    const data = results && results.length > 0 ? results[0] : null;

    if (!data) {
        console.log(`[RESOLVE_TENANT] No tenant found for slug: "${cleanId}"`);
        return null;
    }

    console.log(`[RESOLVE_TENANT] Success: ${cleanId} -> ${data.id}`);
    return data.id;
}
