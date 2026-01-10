import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from './supabase-server';
import { Plan } from './backend-types';

/**
 * UTILITY PRINCIPAL DE AUTENTICAÇÃO (SSR)
 */
export async function getCurrentUserAndTenant() {
    try {
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();

        console.log(`[AUTH-DEBUG] Verificando cookies. Total: ${allCookies.length}`);

        // Logs específicos para depuração (vão aparecer no log da Railway)
        allCookies.forEach(c => {
            if (c.name.includes('auth') || c.name.includes('token') || c.name.includes('impersonate')) {
                console.log(`[AUTH-DEBUG] Cookie encontrado: ${c.name} (Value Start: ${c.value?.substring(0, 10)}...)`);
            }
        });

        let userAuthId: string | null = null;
        let userObj: any = null;

        // 1. TENTATIVA PADRÃO
        const client = await supabase();
        const { data: { user }, error: authError } = await client.auth.getUser();

        if (user && !authError) {
            userAuthId = user.id;
            userObj = user;
            console.log(`[AUTH-DEBUG] Sessão validada pelo Supabase SDK: ${user.email}`);
        } else {
            console.log(`[AUTH-DEBUG] Supabase SDK falhou. Erro: ${authError?.message || 'No user'}. Tentando extração manual...`);

            // 2. BUSCA MANUAL EM TODOS OS COOKIES (Brute Force para tokens JWT)
            for (const c of allCookies) {
                const val = c.value?.trim();
                if (!val || val.length < 40) continue;

                let token: string | null = null;
                try {
                    const decoded = decodeURIComponent(val);
                    if (decoded.startsWith('[') && decoded.includes('.')) {
                        token = JSON.parse(decoded)[0];
                    } else if (decoded.startsWith('{')) {
                        const parsed = JSON.parse(decoded);
                        token = parsed.access_token || parsed.token;
                    } else if (decoded.split('.').length === 3) {
                        token = decoded.replace(/^"|"$/g, '');
                    }
                } catch (e) {
                    if (val.split('.').length === 3) token = val;
                }

                if (token && token.length > 50 && token.includes('.')) {
                    console.log(`[AUTH-DEBUG] Testando token no cookie ${c.name}...`);
                    const { data: { user: adminUser }, error: adminError } = await supabaseAdmin.auth.getUser(token);
                    if (adminUser && !adminError) {
                        userAuthId = adminUser.id;
                        userObj = adminUser;
                        console.log(`[AUTH-DEBUG] Sucesso! Token validado para ${adminUser.email}`);
                        break;
                    }
                }
            }
        }

        if (!userAuthId) {
            throw new Error('Usuário não autenticado ou sessão expirada');
        }

        // 3. BUSCAR PERFIL NO BANCO
        const { data: userData, error: profileError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userAuthId)
            .single();

        if (profileError || !userData) {
            throw new Error(`Perfil não localizado no banco para ${userAuthId}.`);
        }

        // --- TRAVA DE SEGURANÇA RAMON ---
        const isSystemAdmin =
            userData.is_system_admin === true ||
            userData.email === 'ramon@791solucoes.com.br' ||
            userData.role === 'admin';

        let tenantIdToUse = userData.tenant_id;

        // 4. SUPORTE A IMPERSONATE (TRAVADO PARA ADMIN)
        const impersonateCookie = cookieStore.get('impersonate_tenant_id');
        if (isSystemAdmin && impersonateCookie?.value) {
            console.log(`[AUTH-DEBUG] Ativando Impersonate para Tenant: ${impersonateCookie.value}`);
            tenantIdToUse = impersonateCookie.value;
        }

        if (!tenantIdToUse && !isSystemAdmin) {
            throw new Error('Acesso negado: Nenhuma barbearia vinculada à sua conta.');
        }

        // 5. CARREGAR TENANT
        let tenantData = null;
        if (tenantIdToUse) {
            const { data: tenant } = await supabaseAdmin
                .from('tenants')
                .select('*')
                .eq('id', tenantIdToUse)
                .single();
            tenantData = tenant;
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
        console.error('[AUTH-ERROR]', error.message);
        throw error;
    }
}

/** Permissões */
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

export async function checkRole(requiredRole: 'owner' | 'barber' | 'staff') {
    const { role } = await getCurrentUserAndTenant();
    const rolesPriority = { owner: 3, barber: 2, staff: 1 };
    if (rolesPriority[role as keyof typeof rolesPriority] < rolesPriority[requiredRole]) {
        throw new Error('Acesso negado');
    }
}

export function checkRolePermission(roleOrRoles: string | string[], permission: string) {
    const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    return roles.includes('admin') || roles.includes('system_admin') || roles.includes('owner');
}

/** Utils */
export function getStatusColor(status: string) {
    switch (status) {
        case 'waiting': return 'text-yellow-500';
        case 'attending': return 'text-emerald-500';
        case 'finished': return 'text-slate-400';
        case 'canceled': return 'text-red-500';
        default: return 'text-slate-300';
    }
}

export async function getDynamicBarberAverages(tenantId: string) {
    try {
        const { data } = await supabaseAdmin.from('barbers').select('id, avg_time_minutes').eq('tenant_id', tenantId);
        const averages: Record<string, number> = {};
        (data || []).forEach(b => averages[b.id] = b.avg_time_minutes || 30);
        return averages;
    } catch { return {}; }
}

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
    if (idOrSlug.length > 30 && idOrSlug.includes('-')) return idOrSlug;
    const { data } = await supabaseAdmin.from('tenants').select('id').ilike('slug', idOrSlug).maybeSingle();
    return data?.id || null;
}
