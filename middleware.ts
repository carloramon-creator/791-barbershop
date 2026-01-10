import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const origin = request.headers.get('origin')
    const path = request.nextUrl.pathname

    // Log para depuração no Railway
    console.log(`[MIDDLEWARE] ${request.method} ${path} | Origin: ${origin}`)

    // Configuração de CORS para a API
    if (path.startsWith('/api')) {
        // Tratar preflight
        if (request.method === 'OPTIONS') {
            const response = new NextResponse(null, { status: 204 })
            response.headers.set('Access-Control-Allow-Origin', origin || '*')
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            response.headers.set('Access-Control-Allow-Headers', '*')
            response.headers.set('Access-Control-Allow-Credentials', 'true')
            return response
        }

        // Response normal com headers CORS
        const response = NextResponse.next()
        response.headers.set('Access-Control-Allow-Origin', origin || '*')
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', '*')
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        return response
    }

    return NextResponse.next()
}

// Aplicar em todas as rotas de API
export const config = {
    matcher: '/api/:path*',
}
