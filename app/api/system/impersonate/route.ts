import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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

        const cookieStore = await cookies();

        if (stop === 'true') {
            (await cookieStore).delete('impersonate_tenant_id');
            return NextResponse.redirect(new URL('/geral/barbearias', req.url));
        }

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID não informado' }, { status: 400 });
        }

        (await cookieStore).set('impersonate_tenant_id', tenantId, {
            path: '/',
            maxAge: 60 * 60 * 24, // 1 dia
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        // Redirecionar para o dashboard (agora com o cookie setado)
        return NextResponse.redirect(new URL('/dashboard', req.url));
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
