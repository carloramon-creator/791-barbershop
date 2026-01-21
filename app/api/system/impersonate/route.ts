import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const tenantId = searchParams.get('tenant_id');
        const stop = searchParams.get('stop');

        const ua = req.headers.get('user-agent');
        const cookieHeader = req.headers.get('cookie');
        console.log(`[IMPERSONATE-DEBUG] UA: ${ua}`);
        console.log(`[IMPERSONATE-DEBUG] Cookie header length: ${cookieHeader?.length || 0}`);

        // 1. Validar Sessão de Admin
        let authResult;
        try {
            authResult = await getCurrentUserAndTenant();
        } catch (e: any) {
            console.error(`[IMPERSONATE-DEBUG] Falha na detecção de sessão: ${e.message}`);
            console.error(`[IMPERSONATE-DEBUG] Stack trace: ${e.stack}`);

            // Logar nomes das cookies para diagnóstico (sem valores por segurança)
            const cookieNames = cookieHeader?.split(';').map(c => c.split('=')[0].trim()) || [];
            console.log(`[IMPERSONATE-DEBUG] Cookies presentes na falha: ${cookieNames.join(', ') || 'NENHUMA'}`);

            return addCorsHeaders(req, NextResponse.json({
                error: 'Sessão expirada no servidor de API.',
                details: e.message,
                hint: 'Por favor, faça logout e entre novamente.'
            }, { status: 401 }));
        }

        const { isSystemAdmin, user } = authResult;
        console.log(`[IMPERSONATE-DEBUG] Usuário identified: ${user?.email}, isSystemAdmin: ${isSystemAdmin}`);

        if (!isSystemAdmin) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Acesso negado: Somente administradores' }, { status: 403 }));
        }

        // 2. Parar Impersonate
        if (stop === 'true') {
            const resp = NextResponse.redirect(new URL('/geral/barbearias', req.url));
            resp.cookies.delete('impersonate_tenant_id');
            return addCorsHeaders(req, resp);
        }

        if (!tenantId) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Tenant ID não informado' }, { status: 400 }));
        }

        // 3. Iniciar Impersonate (Setar Cookie e Redirecionar)
        console.log(`[IMPERSONATE-DEBUG] Setando tenant: ${tenantId}`);

        // Redireciona para o dashboard com o cookie setado
        const response = NextResponse.redirect(new URL('/dashboard', req.url));

        response.cookies.set('impersonate_tenant_id', tenantId, {
            path: '/',
            maxAge: 60 * 60 * 24, // 1 dia
            httpOnly: true,
            secure: true, // Sempre secure em produção/staging
            sameSite: 'lax',
        });

        return addCorsHeaders(req, response);
    } catch (error: any) {
        console.error('[IMPERSONATE ERROR]', error.message);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
