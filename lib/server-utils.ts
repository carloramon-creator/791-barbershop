import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from './supabase-server';
import { Plan } from './backend-types';

/**
 * UTILITY PRINCIPAL DE AUTENTICAÇÃO (SSR)
 * Refatorado para segurança máxima e resiliência.
 */
export async function getCurrentUserAndTenant() {
    try {
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();

        let userAuthId: string | null = null;
        let userObj: any = null;

        // 1. TENTATIVA PADRÃO via @supabase/ssr
        const client = await supabase();
        const { data: { user }, error: authError } = await client.auth.getUser();

        if (user && !authError) {
            userAuthId = user.id;
            userObj = user;
        } else {
            // 2. BUSCA MANUAL "BRUTE FORCE" (Apenas se o SSR falhar)
            for (const c of allCookies) {
                if (!c.value || c.value.length < 50) continue;

                let token: string | null = null;
                try {
                    const decoded = decodeURIComponent(c.value);
                    if (decoded.trim().startsWith('[')) token = JSON.parse(decoded)[0];
                    else if (decoded.trim().startsWith('{')) token = JSON.parse(decoded).access_token;
                    else token = decoded.replace(/^"|"$/g, '');
                } catch (e) {
                    token = c.value.replace(/^"|"$/g, '');
                }

                if (token && token.split('.').length === 3) {
                    const { data: { user: adminUser }, error: adminError } = await supabaseAdmin.auth.getUser(token);
                    if (adminUser && !adminError) {
                        userAuthId = adminUser.id;
                        userObj = adminUser;
                        break;
                    }
                }
            }
        }

        if (!userAuthId) {
            throw new Error('Usuário não autenticado ou sessão expirada');
        }

        // 3. BUSCAR PERFIL NO BANCO (Ignorando RLS via Admin)
        const { data: userData, error: profileError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userAuthId)
            .single();

        if (profileError || !userData) {
            throw new Error('Perfil de usuário não localizado.');
        }

        // --- TRAVA DE SEGURANÇA CRÍTICA ---
        // Apenas usuários marcados EXPLICITAMENTE como is_system_admin ou com e-mail do Ramon
        // podem ter acesso às funções de Super Admin e Impersonate.
        const isSystemAdmin =
            userData.is_system_admin === true ||
            userData.email === 'ramon@791solucoes.com.br';

        // ----------------------------------

        let tenantIdToUse = userData.tenant_id;

        // 4. SUPORTE A IMPERSONATE (TRAVADO PARA ADMIN)
        const impersonateId = cookieStore.get('impersonate_tenant_id')?.value;
        if (isSystemAdmin && impersonateId) {
            tenantIdToUse = impersonateId;
        }

        if (!tenantIdToUse && !isSystemAdmin) {
            throw new Error('Sua conta não possui uma barbearia vinculada.');
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
        console.error('[AUTH-CRITICAL]', error.message);
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
    const userRole = (role || 'staff') as keyof typeof rolesPriority;
    if (rolesPriority[userRole] < rolesPriority[requiredRole]) {
        throw new Error('Acesso negado');
    }
}

export function checkRolePermission(roleOrRoles: string | string[], permission: string) {
    const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    // Apenas donos de barbearia (owner) ou Admins do sistema podem gerenciar usuários/finanças
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
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    return res;
}

export async function resolveTenantId(idOrSlug: string) {
    if (!idOrSlug) return null;
    if (idOrSlug.length > 30 && idOrSlug.includes('-')) return idOrSlug;
    const { data } = await supabaseAdmin.from('tenants').select('id').ilike('slug', idOrSlug).maybeSingle();
    return data?.id || null;
}
