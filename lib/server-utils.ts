import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from './supabase-server';
import { Plan } from './backend-types';

export async function getCurrentUserAndTenant() {
    try {
        console.log('[BACKEND] getCurrentUserAndTenant start');

        let userAuthId: string | null = null;
        let userObj: any = null;

        // 1. Tentar pegar via standard client (mais robusto para token/cookies)
        const client = await supabase();
        const { data: { user }, error: authError } = await client.auth.getUser();

        if (!authError && user) {
            userAuthId = user.id;
            userObj = user;
            console.log('[BACKEND] ✅ User validado via standard client:', user.id);
        } else {
            console.warn('[BACKEND] ⚠️ standard client falhou:', authError?.message);
        }

        // 2. Fallback manual AGRESSIVO para Cookies (Next.js context)
        if (!userAuthId) {
            const cookieStore = await cookies();
            const allCookies = cookieStore.getAll();
            console.log('[BACKEND] 🔍 Buscando em', allCookies.length, 'cookies:', allCookies.map(c => c.name).join(', '));

            let accessToken: string | null = null;

            // Tenta encontrar token do Supabase SSR (sb-xxxxx-auth-token)
            const authCookies = allCookies.filter(c => c.name.endsWith('-auth-token'));

            if (authCookies.length > 0) {
                console.log('[BACKEND] 🍪 Cookies de auth encontrados:', authCookies.map(c => c.name));
                // Ordenar cookies por sufixo numérico (.0, .1, etc.)
                authCookies.sort((a, b) => {
                    const getIndex = (name: string) => {
                        const parts = name.split('.');
                        const last = parts[parts.length - 1];
                        return (parts.length > 1 && !isNaN(parseInt(last))) ? parseInt(last) : -1;
                    };
                    return getIndex(a.name) - getIndex(b.name);
                });

                const rawValue = authCookies.map(c => c.value).join('');
                try {
                    const decoded = decodeURIComponent(rawValue);
                    // Supabase SSR salva como array JSON: ["access_token", "refresh_token", ...]
                    if (decoded.trim().startsWith('[')) {
                        const parsed = JSON.parse(decoded);
                        accessToken = Array.isArray(parsed) ? parsed[0] : (parsed.access_token || null);
                    } else if (decoded.trim().startsWith('{')) {
                        const parsed = JSON.parse(decoded);
                        accessToken = parsed.access_token || null;
                    } else {
                        accessToken = decoded;
                    }
                } catch (e) {
                    console.error('[BACKEND] ❌ Erro ao parsear cookie de auth:', e);
                    // Tenta usar o valor bruto se parecer um JWT
                    if (rawValue.length > 50) accessToken = rawValue;
                }
            }

            // Fallback para outros cookies (session, etc)
            if (!accessToken) {
                for (const cookie of allCookies) {
                    if (cookie.name.toLowerCase().includes('session') && cookie.value.length > 100) {
                        accessToken = cookie.value;
                        console.log('[BACKEND] 🍪 Token extraído do cookie de session:', cookie.name);
                        break;
                    }
                }
            }

            if (accessToken) {
                console.log('[BACKEND] 🔐 Token encontrado. Validando via supabaseAdmin...');
                // Limpeza de caracteres se estiver escapado
                const cleanToken = accessToken.replace(/^"|"$/g, '');

                const { data: { user: verifiedUser }, error: verifyError } = await supabaseAdmin.auth.getUser(cleanToken);
                if (!verifyError && verifiedUser) {
                    userAuthId = verifiedUser.id;
                    userObj = verifiedUser;
                    console.log('[BACKEND] ✅ User validado via Admin + Token de Cookie.');
                } else {
                    console.warn('[BACKEND] ❌ Falha na validação do token manual:', verifyError?.message);
                }
            }
        }

        if (!userAuthId) {
            // TENTATIVA FINAL: Ver se há headers de auth
            const headersList = await headers();
            const authHeader = headersList.get('authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                const { data: { user: adminUser }, error: adminError } = await supabaseAdmin.auth.getUser(token);
                if (!adminError && adminUser) {
                    userAuthId = adminUser.id;
                    userObj = adminUser;
                }
            }
        }

        if (!userAuthId) {
            throw new Error('Usuário não autenticado ou sessão expirada');
        }

        console.log('[BACKEND] 👤 Autenticado:', userAuthId);

        // 3. Atualizar last_seen_at (presença) em background
        supabaseAdmin.from('users').update({ last_seen_at: new Date() }).eq('id', userAuthId).then(({ error }) => {
            if (error) console.error('[PRESENCE UPDATE ERROR]', error.message);
        });

        // 4. Buscar dados do usuário (role e tenant_id)
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userAuthId)
            .single();

        if (userError || !userData) {
            console.error('[BACKEND] User profile lookup failed:', userError?.message);
            throw new Error('Perfil de usuário não encontrado');
        }

        const isSystemAdmin = userData.is_system_admin || false;
        let tenantIdToUse = userData.tenant_id;

        // 5. Se for admin, permitir override via cookie de impersonate
        if (isSystemAdmin) {
            const cookieStore = await cookies();
            const impersonateId = cookieStore.get('impersonate_tenant_id')?.value;
            if (impersonateId) {
                console.log('[BACKEND] Admin detectado - Sobrescrevendo Tenant por:', impersonateId);
                tenantIdToUse = impersonateId;
            }
        }

        // Buscar dados da barbearia
        let tenant = null;
        if (tenantIdToUse) {
            const { data, error: tenantError } = await supabaseAdmin
                .from('tenants')
                .select('*')
                .eq('id', tenantIdToUse)
                .single();

            if (tenantError) {
                console.error('[BACKEND] Tenant not found:', tenantError.message);
                if (!isSystemAdmin) throw new Error('Barbearia não encontrada ou vinculada');
            }
            tenant = data;
        }

        if (!tenant && !isSystemAdmin) {
            throw new Error('Você ainda não tem uma barbearia vinculada.');
        }

        console.log('[BACKEND] Tenant final:', tenant?.name || 'Nenhum (MODO ADMIN)');

        if (tenant) {
            console.log('[BACKEND] Tenant found:', tenant.name, 'Plan:', tenant.plan);
        }
        const finalUser = { id: userAuthId, email: userObj?.email || userData.email || '' };

        return {
            user: finalUser,
            tenant,
            role: userData.role,
            roles: userData.roles || [userData.role],
            isSystemAdmin: isSystemAdmin
        };
    } catch (e: any) {
        console.error('[BACKEND] Critical error in getCurrentUserAndTenant:', e.message);
        throw e;
    }
}

export function assertPlanAtLeast(currentPlan: Plan, requiredPlan: Plan) {
    const order: Plan[] = ['trial', 'basic', 'complete', 'premium'];

    // Trial has access to everything for testing
    if (currentPlan === 'trial') return;

    if (order.indexOf(currentPlan) < order.indexOf(requiredPlan)) {
        throw new Error(`Seu plano atual (${currentPlan}) não permite esta funcionalidade. Faça upgrade para o plano ${requiredPlan}.`);
    }
}

export function checkRolePermission(userRoles: string | string[], action: 'view_finance' | 'manage_users' | 'manage_plan' | 'manage_all_queues' | 'edit_barbershop') {
    const roles = Array.isArray(userRoles) ? userRoles : [userRoles];

    const permissions: Record<string, string[]> = {
        owner: ['view_finance', 'manage_users', 'manage_plan', 'manage_all_queues', 'edit_barbershop'],
        staff: ['manage_all_queues', 'edit_barbershop'],
        barber: []
    };

    const hasPermission = roles.some(role => {
        const allowedActions = permissions[role] || [];
        return allowedActions.includes(action);
    });

    if (!hasPermission) {
        throw new Error('Você não tem permissão para realizar esta ação.');
    }
}

export async function getDynamicBarberAverages(tenantId: string): Promise<Record<string, number>> {
    try {
        // Busca os últimos 50 serviços finalizados do tenant para calcular a média real
        const { data: recentServices, error } = await supabaseAdmin
            .from('client_queue')
            .select('barber_id, started_at, finished_at')
            .eq('tenant_id', tenantId)
            .eq('status', 'finished')
            .not('started_at', 'is', null)
            .not('finished_at', 'is', null)
            .order('finished_at', { ascending: false })
            .limit(50);

        if (error || !recentServices) return {};

        const groupings: Record<string, number[]> = {};
        recentServices.forEach(s => {
            if (s.started_at && s.finished_at) {
                const start = new Date(s.started_at).getTime();
                const finish = new Date(s.finished_at).getTime();
                const duration = (finish - start) / 60000;

                // Ignorar durações irreais (menos de 2min ou mais de 3h)
                if (duration >= 2 && duration <= 180) {
                    if (!groupings[s.barber_id]) groupings[s.barber_id] = [];
                    groupings[s.barber_id].push(duration);
                }
            }
        });

        const averages: Record<string, number> = {};
        Object.keys(groupings).forEach(barberId => {
            const durations = groupings[barberId];
            const sum = durations.reduce((acc, d) => acc + d, 0);
            averages[barberId] = Math.round(sum / durations.length);
        });

        return averages;
    } catch (e) {
        console.error('[DYNAMIC METRICS ERROR]', e);
        return {};
    }
}

export function getStatusColor(status: string) {
    switch (status) {
        case 'waiting': return 'yellow';
        case 'attending': return 'green';
        case 'finished': return 'gray';
        case 'cancelled': return 'red';
        default: return 'gray';
    }
}

export function addCorsHeaders(req: Request, response: NextResponse) {
    const origin = req.headers.get('origin');

    // Permissive CORS for debugging, but still respecting credentials
    if (origin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
    } else {
        response.headers.set('Access-Control-Allow-Origin', '*');
    }

    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
}

/**
 * Resolve um identifier de tenant (Slug ou UUID) para o UUID real.
 */
export async function resolveTenantId(idOrSlug: string): Promise<string | null> {
    if (!idOrSlug) return null;

    // UUID Regex check
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);

    if (isUuid) {
        return idOrSlug;
    }

    // Lookup by slug (CASE INSENSITIVE)
    try {
        const { data, error } = await supabaseAdmin
            .from('tenants')
            .select('id')
            .ilike('slug', idOrSlug)
            .maybeSingle();

        if (!error && data) {
            return data.id;
        }
    } catch (e) {
        // Column might not exist yet
    }

    // One last try: lookup by name (lowercase and replaced spaces with dashes)
    const { data: dataByName } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .ilike('name', idOrSlug.replace(/-/g, ' '))
        .maybeSingle();

    return dataByName?.id || null;
}
