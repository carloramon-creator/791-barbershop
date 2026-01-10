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
        // Carrega o cliente SSR que deve gerenciar cookies automaticamente
        const client = await supabase();
        const { data: { user }, error: authError } = await client.auth.getUser();

        if (user && !authError) {
            userAuthId = user.id;
            userObj = user;
            console.log('[AUTH] ✅ Sessão padrão encontrada:', user.id);
        } else {
            console.log('[AUTH] ⚠️ Sessão padrão falhou. Tentando busca manual exaustiva em todos os cookies...');

            // 2. BUSCA MANUAL "BRUTE FORCE" EM TODOS OS COOKIES
            // Tentamos encontrar qualquer cookie que contenha um JWT válido de acesso
            const potentialTokens: string[] = [];

            // Agrupar por nomes base para lidar com chunks (.0, .1)
            const groups: Record<string, string[]> = {};
            allCookies.forEach(c => {
                const name = c.name;
                const value = c.value;
                if (!value || value.length < 10) return;

                // Extrai o nome base (remove .0, .1 etc)
                const baseName = name.includes('.') ? name.split('.')[0] : name;
                if (!groups[baseName]) groups[baseName] = [];
                groups[baseName].push(name + '|||' + value);
            });

            for (const base in groups) {
                const parts = groups[base];
                parts.sort((a, b) => a.localeCompare(b));
                const combined = parts.map(p => p.split('|||')[1]).join('');
                potentialTokens.push(combined);

                // Também tenta cada parte individualmente (caso não seja chunked mas tenha ponto no nome)
                parts.forEach(p => potentialTokens.push(p.split('|||')[1]));
            }

            for (const raw of potentialTokens) {
                let token: string | null = null;
                try {
                    // Tenta limpar o valor (pode vir como JSON stringified ou URI encoded)
                    const decoded = decodeURIComponent(raw);
                    if (decoded.trim().startsWith('[')) token = JSON.parse(decoded)[0];
                    else if (decoded.trim().startsWith('{')) token = JSON.parse(decoded).access_token || JSON.parse(decoded).token;
                    else if (decoded.includes('.') && decoded.split('.').length === 3) token = decoded.replace(/^"|"$/g, '');
                    else token = raw.replace(/^"|"$/g, '');
                } catch (e) {
                    token = raw.replace(/^"|"$/g, '');
                }

                if (token && token.length > 50 && token.includes('.')) {
                    const { data: { user: foundUser }, error: err } = await supabaseAdmin.auth.getUser(token);
                    if (foundUser && !err) {
                        userAuthId = foundUser.id;
                        userObj = foundUser;
                        console.log('[AUTH] ✅ Token validado manualmente via cookies brute-force');
                        break;
                    }
                }
            }
        }

        if (!userAuthId) {
            // Tenta via Authorization Header (caso o middleware ou proxy passe)
            const headerList = await headers();
            const authHeader = headerList.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                const { data: { user: headerUser } } = await supabaseAdmin.auth.getUser(token);
                if (headerUser) {
                    userAuthId = headerUser.id;
                    userObj = headerUser;
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
            // Se autenticou mas não tem perfil, pode ser um erro de sincronia ou usuário novo incompleto
            throw new Error(`Perfil não localizado para o ID ${userAuthId}`);
        }

        const isSystemAdmin = userData.is_system_admin === true || userData.role === 'admin';
        let tenantIdToUse = userData.tenant_id;

        // 4. SUPORTE A IMPERSONATE
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
        console.error('[AUTH CRITICAL ERROR]', error.message);
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
