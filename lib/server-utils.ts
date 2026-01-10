import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from './supabase-server';
import { Plan } from './backend-types';

/**
 * UTILITY PRINCIPAL DE AUTENTICAÇÃO (SSR)
 */
export async function getCurrentUserAndTenant() {
    try {
        console.log('[AUTH] Verificando sessão no servidor...');
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
            console.log('[AUTH] ✅ Sessão padrão encontrada:', user.id);
        } else {
            console.log('[AUTH] ⚠️ Sessão padrão falhou, tentando busca manual de token...');

            // 2. BUSCA MANUAL DE TOKEN (Fallback para situações de chunking ou proxy)
            // Agrupar cookies por base name (ex: sb-xxx-auth-token)
            const tokenGroups: Record<string, string[]> = {};

            allCookies.forEach(c => {
                if (c.name.includes('auth-token') || c.name.includes('access-token')) {
                    const baseName = c.name.split('.')[0];
                    if (!tokenGroups[baseName]) tokenGroups[baseName] = [];
                    // Adicionamos o nome completo para ordenar depois
                    tokenGroups[baseName].push(c.name + '|||' + c.value);
                }
            });

            // Tentar cada grupo de cookies
            for (const baseName in tokenGroups) {
                const group = tokenGroups[baseName];
                group.sort((a, b) => a.localeCompare(b)); // Ordena .0, .1...
                const combinedValue = group.map(item => item.split('|||')[1]).join('');

                let token: string | null = null;
                try {
                    const decoded = decodeURIComponent(combinedValue);
                    if (decoded.trim().startsWith('[')) {
                        token = JSON.parse(decoded)[0];
                    } else if (decoded.trim().startsWith('{')) {
                        token = JSON.parse(decoded).access_token || JSON.parse(decoded).token;
                    } else {
                        token = decoded.replace(/^"|"$/g, '');
                    }
                } catch (e) {
                    token = combinedValue.replace(/^"|"$/g, '');
                }

                if (token && token.length > 40) {
                    const { data: { user: adminUser }, error: adminError } = await supabaseAdmin.auth.getUser(token);
                    if (adminUser && !adminError) {
                        userAuthId = adminUser.id;
                        userObj = adminUser;
                        console.log(`[AUTH] ✅ Token validado manualmente (Grupo: ${baseName})`);
                        break;
                    }
                }
            }
        }

        if (!userAuthId) {
            // Última tentativa: Verificar se há um Authorization header (caso venha de proxy)
            const headerList = await headers();
            const authHeader = headerList.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                const { data: { user: headerUser } } = await supabaseAdmin.auth.getUser(token);
                if (headerUser) {
                    userAuthId = headerUser.id;
                    userObj = headerUser;
                    console.log('[AUTH] ✅ Token validado via Header');
                }
            }
        }

        if (!userAuthId) {
            console.error('[AUTH] ❌ Falha crítica: Nenhum token válido encontrado.');
            throw new Error('Usuário não autenticado ou sessão expirada');
        }

        // 3. BUSCAR PERFIL COMPLETO via Admin para ignorar RLS
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userAuthId)
            .single();

        if (userError || !userData) {
            throw new Error('Perfil de usuário não localizado no banco.');
        }

        // 4. DETERMINAR ADMIN STATUS
        const isSystemAdmin = userData.is_system_admin === true || userData.role === 'admin';
        let tenantIdToUse = userData.tenant_id;

        // 5. SUPORTE A IMPERSONATE
        const impersonateId = cookieStore.get('impersonate_tenant_id')?.value;
        if (isSystemAdmin && impersonateId) {
            console.log(`[AUTH] 🕵️ MODO ADMIN: ${impersonateId}`);
            tenantIdToUse = impersonateId;
        }

        if (!tenantIdToUse && !isSystemAdmin) {
            throw new Error('Sem barbearia vinculada.');
        }

        // 6. CARREGAR DADOS DO TENANT
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
        console.error('[AUTH ERROR]', error.message);
        throw error;
    }
}

/**
 * Funções de Verificação de Permissão
 */
export function assertPlan(tenant: any, requiredPlan: Plan) {
    if (!tenant) throw new Error('Dados da barbearia ausentes.');
    const plans: Record<Plan, number> = { basic: 1, premium: 2, complete: 3, trial: 1 };
    const current = plans[tenant.plan as Plan] || 1;
    const required = plans[requiredPlan];
    if (current < required) {
        throw new Error(`Este recurso exige o plano ${requiredPlan.toUpperCase()}`);
    }
}

export const assertPlanAtLeast = (planName: string, requiredPlan: Plan) => {
    const plans: Record<Plan, number> = { basic: 1, premium: 2, complete: 3, trial: 1 };
    const current = plans[planName as Plan] || 1;
    const required = plans[requiredPlan];
    if (current < required) {
        throw new Error(`Este recurso exige o plano ${requiredPlan.toUpperCase()}`);
    }
};

export async function checkRole(requiredRole: 'owner' | 'barber' | 'staff') {
    const { role } = await getCurrentUserAndTenant();
    const rolesPriority = { owner: 3, barber: 2, staff: 1 };
    const userRole = (role || 'staff') as keyof typeof rolesPriority;
    if (rolesPriority[userRole] < rolesPriority[requiredRole]) {
        throw new Error('Acesso negado: Permissão insuficiente');
    }
}

export function checkRolePermission(roleOrRoles: string | string[], permission: string) {
    const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    if (roles.includes('admin') || roles.includes('system_admin')) return true;
    if (roles.includes('owner')) return true;
    return false;
}

/**
 * Utilitários de Interface e API
 */
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
        const { data } = await supabaseAdmin
            .from('barbers')
            .select('id, avg_time_minutes')
            .eq('tenant_id', tenantId);
        const averages: Record<string, number> = {};
        (data || []).forEach(b => averages[b.id] = b.avg_time_minutes || 30);
        return averages;
    } catch (e) {
        return {};
    }
}

export function addCorsHeaders(req: Request, res: NextResponse) {
    const origin = req.headers.get('origin') || '*';
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    return res;
}

export async function resolveTenantId(idOrSlug: string): Promise<string | null> {
    if (!idOrSlug) return null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(idOrSlug)) return idOrSlug;
    const { data: tenant } = await supabaseAdmin.from('tenants').select('id').ilike('slug', idOrSlug).maybeSingle();
    return tenant?.id || null;
}
