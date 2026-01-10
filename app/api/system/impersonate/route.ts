import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function GET(req: Request) {
    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const tenantId = searchParams.get('tenant_id');
        const stop = searchParams.get('stop');

        if (stop === 'true') {
            const response = NextResponse.redirect(new URL('/geral/barbearias', req.url));
            response.cookies.delete('impersonate_tenant_id');
            return response;
        }

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID não informado' }, { status: 400 });
        }

        const response = NextResponse.redirect(new URL('/dashboard', req.url));

        response.cookies.set('impersonate_tenant_id', tenantId, {
            path: '/',
            maxAge: 60 * 60 * 24, // 1 dia
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
        });

        console.log(`[IMPERSONATE] Cookie setado para: ${tenantId}`);
        return response;
    } catch (error: any) {
        console.error('[IMPERSONATE ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
