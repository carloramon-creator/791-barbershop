import { NextResponse } from 'next/server';
import { InterAPIV3 } from '@/lib/inter-api-v3';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const nossoNumero = searchParams.get('nossoNumero');
        const codigoSolicitacao = searchParams.get('codigoSolicitacao');

        const identifier = (codigoSolicitacao && codigoSolicitacao !== 'undefined' && codigoSolicitacao !== 'N/A') ? codigoSolicitacao : nossoNumero;

        if (!identifier || identifier === 'undefined') {
            return NextResponse.json({ error: 'Identificador (nossoNumero ou codigoSolicitacao) não informado' }, { status: 400 });
        }

        // 1. Configurar Inter - Buscar do DB primeiro (padronizado com a rota de criação)
        const { data: settingsData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'inter_config')
            .single();

        const dbConfig = settingsData?.value;

        const clientId = dbConfig?.client_id || process.env.INTER_CLIENT_ID;
        const clientSecret = dbConfig?.client_secret || process.env.INTER_CLIENT_SECRET || '';
        const certRaw = dbConfig?.crt || process.env.INTER_CERT_CONTENT || '';
        const keyRaw = dbConfig?.key || process.env.INTER_KEY_CONTENT || '';

        const cert = certRaw.replace(/\\n/g, '\n');
        const key = keyRaw.replace(/\\n/g, '\n');

        if (!clientId || !cert || !key) {
            return NextResponse.json({ error: 'Configuração do Inter incompleta no servidor' }, { status: 500 });
        }

        const inter = new InterAPIV3({
            clientId,
            clientSecret,
            cert,
            key
        });

        console.log(`[PDF] Baixando boleto usando id: ${identifier}`);
        const pdfBuffer = await inter.getBillingPdf(identifier!);

        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename=boleto-${nossoNumero}.pdf`,
            },
        });
    } catch (error: any) {
        console.error('[BOLETO PDF PROXY ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
