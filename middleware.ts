import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const host = request.headers.get('host');

    // Redirecionar www para domínio sem www
    if (host?.startsWith('www.')) {
        const newHost = host.replace('www.', '');
        const url = request.nextUrl.clone();
        url.host = newHost;

        return NextResponse.redirect(url, 301); // Redirect permanente
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
