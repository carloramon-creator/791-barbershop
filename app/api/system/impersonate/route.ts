import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const tenantId = searchParams.get('tenant_id');
        const stop = searchParams.get('stop');

        // Verifica se quem está tentando é admin
        const { isSystemAdmin } = await getCurrentUserAndTenant();

        if (!isSystemAdmin) {
            return NextResponse.json({ error: 'Acesso negado: Somente administradores' }, { status: 403 });
        }

        if (stop === 'true') {
            const resp = NextResponse.redirect(new URL('/geral/barbearias', req.url));
            resp.cookies.delete('impersonate_tenant_id');
            return resp;
        }

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID não informado' }, { status: 400 });
        }

        // Redireciona para o dashboard com o cookie setado
        const response = NextResponse.redirect(new URL('/dashboard', req.url));

        response.cookies.set('impersonate_tenant_id', tenantId, {
            path: '/',
            maxAge: 60 * 60 * 24, // 1 dia
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        return response;
    } catch (error: any) {
        console.error('[IMPERSONATE ERROR]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
