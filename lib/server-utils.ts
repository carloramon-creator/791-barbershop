import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from './supabase-server';
import { Plan } from './backend-types';

export async function getCurrentUserAndTenant() {
    try {
        console.log('[BACKEND] --- Autenticação Iniciada ---');
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();

        let userAuthId: string | null = null;
        let userObj: any = null;

        // 1. Tentar pegar o token diretamente dos cookies (Supabase SSR)
        const authCookies = allCookies.filter(c => c.name.includes('-auth-token'));
        let token: string | null = null;

        if (authCookies.length > 0) {
            authCookies.sort((a, b) => a.name.localeCompare(b.name));
            const raw = authCookies.map(c => c.value).join('');
            try {
                const decoded = decodeURIComponent(raw);
                if (decoded.startsWith('[')) token = JSON.parse(decoded)[0];
                else if (decoded.startsWith('{')) token = JSON.parse(decoded).access_token;
                else token = decoded.replace(/^"|"$/g, '');
            } catch (e) {
                token = raw.replace(/^"|"$/g, '');
            }
        }

        // 2. Validar token via Admin (mais robusto que o client padrão em SSR)
        if (token) {
            const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
            if (user && !authError) {
                userAuthId = user.id;
                userObj = user;
                console.log('[BACKEND] ✅ User validado via Token');
            } else if (authError) {
                console.warn('[BACKEND] ⚠️ Token inválido:', authError.message);
            }
        }

        // 3. Fallback para o client padrão (caso o token acima não tenha sido encontrado)
        if (!userAuthId) {
            const client = await supabase();
            const { data: { user }, error } = await (await client).auth.getUser();
            if (user && !error) {
                userAuthId = user.id;
                userObj = user;
                console.log('[BACKEND] ✅ User validado via Standard Client');
            }
        }

        if (!userAuthId) {
            const names = allCookies.map(c => c.name).join(', ') || 'Nenhum';
            console.error('[BACKEND] ❌ Não autenticado. Cookies presentes:', names);
            throw new Error(`Sessão expirada. (Cookies: ${names})`);
        }

        // 4. Buscar Perfil no Banco
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userAuthId)
            .single();

        if (!userData || userError) {
            throw new Error('Perfil do usuário não encontrado.');
        }

        const isSystemAdmin = userData.is_system_admin === true || userData.role === 'admin';

        // 5. Resolver Tenant (com suporte a Impersonate)
        let tenantIdToUse = userData.tenant_id;
        const impersonateId = cookieStore.get('impersonate_tenant_id')?.value;

        if (isSystemAdmin && impersonateId) {
            console.log(`[BACKEND] 🕵️ MODO ADMINISTRADOR: Simulando Barbeiria ${impersonateId}`);
            tenantIdToUse = impersonateId;
        }

        if (!tenantIdToUse && !isSystemAdmin) {
            throw new Error('Nenhuma barbearia vinculada a esta conta.');
        }

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
        console.error('[AUTH ERROR]', error.message);
        throw error;
    }
}

export function assertPlan(tenant: any, requiredPlan: Plan) {
    if (!tenant) throw new Error('Dados da barbearia não carregadores');
    const plans: Record<Plan, number> = { basic: 1, premium: 2, complete: 3, trial: 1 };
    const current = plans[tenant.plan as Plan] || 1;
    const required = plans[requiredPlan];
    if (current < required) {
        throw new Error(`Este recurso exige o plano ${requiredPlan.toUpperCase()}`);
    }
}
