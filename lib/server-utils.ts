import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from './supabase-server';
import { Plan } from './backend-types';

export async function getCurrentUserAndTenant() {
    try {
        console.log('[AUTH] Checking session...');
        const cookieStore = await cookies();

        let userAuthId: string | null = null;
        let userObj: any = null;

        // 1. TENTATIVA PADRÃO (Supabase SSR) - Geralmente funciona se os cookies estiverem certos
        const client = await supabase();
        const { data: { user }, error: authError } = await client.auth.getUser();

        if (user && !authError) {
            userAuthId = user.id;
            userObj = user;
            console.log('[AUTH] ✅ Standard session found:', user.id);
        } else {
            // 2. BUSCA MANUAL EXTENSIVA (Fallback para cookies fragmentados ou mal formados)
            const allCookies = cookieStore.getAll();
            console.log('[AUTH] ⚠️ Standard failed. Cookies present:', allCookies.map(c => c.name).join(', '));

            // Tenta encontrar qualquer pedaço de token
            const authCookies = allCookies.filter(c =>
                c.name.includes('-auth-token') ||
                c.name.includes('access-token') ||
                c.name.toLowerCase().includes('session')
            );

            if (authCookies.length > 0) {
                // Junta fragmentos (.0, .1...)
                authCookies.sort((a, b) => a.name.localeCompare(b.name));
                const raw = authCookies.map(c => c.value).join('');
                let token: string | null = null;

                try {
                    const decoded = decodeURIComponent(raw);
                    if (decoded.trim().startsWith('[')) token = JSON.parse(decoded)[0];
                    else if (decoded.trim().startsWith('{')) token = JSON.parse(decoded).access_token;
                    else token = decoded.replace(/^"|"$/g, '');
                } catch (e) {
                    token = raw.replace(/^"|"$/g, '');
                }

                if (token && token.length > 40) {
                    const { data: { user: adminUser }, error: adminError } = await supabaseAdmin.auth.getUser(token);
                    if (adminUser && !adminError) {
                        userAuthId = adminUser.id;
                        userObj = adminUser;
                        console.log('[AUTH] ✅ Manual token validation success');
                    }
                }
            }
        }

        if (!userAuthId) {
            throw new Error('Usuário não autenticado ou sessão expirada');
        }

        // 3. BUSCAR PERFIL
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userAuthId)
            .single();

        if (userError || !userData) {
            throw new Error('Perfil de usuário não localizado.');
        }

        const isSystemAdmin = userData.is_system_admin === true || userData.role === 'admin';
        let tenantIdToUse = userData.tenant_id;

        // 4. SUPORTE A IMPERSONATE (APENAS PARA ADM)
        const impersonateId = cookieStore.get('impersonate_tenant_id')?.value;
        if (isSystemAdmin && impersonateId) {
            console.log('[AUTH] 🕵️ MODO ADMINISTRADOR ATIVO:', impersonateId);
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
            user: { id: userAuthId, email: userData.email, role: userData.role },
            tenant: tenantData,
            tenantId: tenantIdToUse,
            isSystemAdmin
        };

    } catch (error: any) {
        console.error('[AUTH CRITICAL ERROR]', error.message);
        throw error;
    }
}

export function assertPlan(tenant: any, requiredPlan: Plan) {
    if (!tenant) throw new Error('Barbearia não identificada.');
    const plans: Record<Plan, number> = { basic: 1, premium: 2, complete: 3, trial: 1 };
    const current = plans[tenant.plan as Plan] || 1;
    const required = plans[requiredPlan];
    if (current < required) {
        throw new Error(`Este recurso requer o plano ${requiredPlan.toUpperCase()}`);
    }
}

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
        (data || []).forEach(b => {
            averages[b.id] = b.avg_time_minutes || 30;
        });
        return averages;
    } catch (e) {
        return {};
    }
}
