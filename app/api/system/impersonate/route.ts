import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const tenantId = searchParams.get('tenant_id');
        const stop = searchParams.get('stop');
        const cookieStore = await cookies();

        if (stop === 'true') {
            console.log('[IMPERSONATE] Finalizando modo oculto');
            const resp = NextResponse.redirect(new URL('/geral/barbearias', req.url));
            resp.cookies.delete('impersonate_tenant_id');
            return resp;
        }

        // Tenta autenticar o Admin manualmente nesta rota caso o global esteja falhando
        let isAdmin = false;
        const allCookies = cookieStore.getAll();
        const authCookies = allCookies.filter(c => c.name.includes('-auth-token'));

        if (authCookies.length > 0) {
            authCookies.sort((a, b) => a.name.localeCompare(b.name));
            const raw = authCookies.map(c => c.value).join('');
            try {
                const decoded = decodeURIComponent(raw);
                let token = '';
                if (decoded.startsWith('[')) {
                    token = JSON.parse(decoded)[0];
                } else if (decoded.startsWith('{')) {
                    token = JSON.parse(decoded).access_token;
                } else {
                    token = decoded.replace(/^"|"$/g, '');
                }

                if (token) {
                    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
                    if (!error && user) {
                        const { data: profile } = await supabaseAdmin.from('users').select('is_system_admin, role').eq('id', user.id).single();
                        if (profile?.is_system_admin || profile?.role === 'admin') {
                            isAdmin = true;
                        }
                    }
                }
            } catch (e) {
                console.error('[IMPERSONATE] Erro no parse manual de auth:', e);
            }
        }

        if (!isAdmin) {
            console.error('[IMPERSONATE] Falha: Usuário não é admin ou não está logado');
            return NextResponse.json({ error: 'Acesso negado: Somente administradores' }, { status: 403 });
        }

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID não informado' }, { status: 400 });
        }

        console.log(`[IMPERSONATE] Iniciando modo oculto para barbearia: ${tenantId}`);
        const response = NextResponse.redirect(new URL('/dashboard', req.url));

        response.cookies.set('impersonate_tenant_id', tenantId, {
            path: '/',
            maxAge: 60 * 60 * 24, // 1 dia
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
        });

        return response;
    } catch (error: any) {
        console.error('[IMPERSONATE ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
