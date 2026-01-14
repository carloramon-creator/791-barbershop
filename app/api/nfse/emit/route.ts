import { NextResponse } from 'next/server';
import nfseService from '@/lib/nfse/nfse-service';
import { addCorsHeaders } from '@/lib/server-utils';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { dpsData, pfxBase64, passphrase } = body;

        // Nota: A API Key aqui é interna, mas como estamos no mesmo processo,
        // poderíamos até chamar o serviço diretamente. Mantemos a rota para flexibilidade.
        // Em produção, essa rota deve ser protegida ou acessível apenas internamente.

        if (!dpsData || !pfxBase64 || !passphrase) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Dados insuficientes' }, { status: 400 }));
        }

        const result = await nfseService.emitNfse(dpsData, pfxBase64, passphrase);

        return addCorsHeaders(req, NextResponse.json({ success: true, result }));
    } catch (error: any) {
        console.error('[API-NFSE-EMIT] Erro:', error.message);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
