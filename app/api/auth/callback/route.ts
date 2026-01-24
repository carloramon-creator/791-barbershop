import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard'; // Default to dashboard instead of root

    // PRIORIDADE: Usar domínio de produção hardcoded ou variável de ambiente
    // Evita loop de localhost:8080 quando atrás de proxy reverso
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://791barber.com';

    if (code) {
        const client = await supabase();
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(`${baseUrl}${next}`);
        } else {
            console.error('[Auth Callback] Erro ao trocar código:', error);
        }
    }

    // Redireciona para login com erro, mas usando o DOMÍNIO CORRETO
    return NextResponse.redirect(`${baseUrl}/login?error=auth-callback-error`);
}
