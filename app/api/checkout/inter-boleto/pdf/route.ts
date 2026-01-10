import { NextResponse } from 'next/server';
import { InterAPIV3 } from '@/lib/inter-api-v3';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const nossoNumero = searchParams.get('nossoNumero');
        const codigoSolicitacao = searchParams.get('codigoSolicitacao');

        // Prioriza codigoSolicitacao (UUID) conforme documentação do Inter
        const solicitacaoId = (codigoSolicitacao && codigoSolicitacao !== 'undefined' && codigoSolicitacao !== 'N/A') ? codigoSolicitacao : null;
        const cleanNossoNumero = nossoNumero ? nossoNumero.replace(/\D/g, '') : null;

        console.log('[PDF] Parâmetros recebidos:', { nossoNumero, codigoSolicitacao, solicitacaoId, cleanNossoNumero });

        if (!solicitacaoId && !cleanNossoNumero) {
            return NextResponse.json({ error: 'Identificador (nossoNumero ou codigoSolicitacao) não informado' }, { status: 400 });
        }

        // 1. Configurar Inter
        const { data: settingsData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'inter_config')
            .single();

        const dbConfig = settingsData?.value;
        const clientId = dbConfig?.client_id || process.env.INTER_CLIENT_ID;
        const certRaw = dbConfig?.crt || process.env.INTER_CERT_CONTENT || '';
        const keyRaw = dbConfig?.key || process.env.INTER_KEY_CONTENT || '';
        const cert = certRaw.replace(/\\n/g, '\n');
        const key = keyRaw.replace(/\\n/g, '\n');

        if (!clientId || !cert || !key) {
            return NextResponse.json({ error: 'Configuração do Inter incompleta no servidor' }, { status: 500 });
        }

        const inter = new InterAPIV3({
            clientId,
            clientSecret: dbConfig?.client_secret || '',
            cert,
            key,
            accountNumber: dbConfig?.account_number || dbConfig?.accountNumber
        });

        // PRIORIZA codigoSolicitacao (UUID) - é o identificador correto segundo a doc do Inter
        let pdfBuffer: Buffer | null = null;
        let usedId = '';

        try {
            if (solicitacaoId) {
                console.log(`[PDF] ✅ Tentando baixar pelo Código de Solicitação (UUID): ${solicitacaoId}`);
                pdfBuffer = await inter.getBillingPdf(solicitacaoId);
                usedId = solicitacaoId;
                console.log(`[PDF] ✅ PDF baixado com sucesso usando Código de Solicitação!`);
            }
        } catch (e: any) {
            console.warn(`[PDF] ⚠️ Falha ao baixar pelo Código de Solicitação: ${e.message}`);
        }

        // Fallback: tenta pelo nossoNumero se não conseguiu pelo codigoSolicitacao
        if (!pdfBuffer && cleanNossoNumero) {
            try {
                console.log(`[PDF] 🔄 Tentando fallback pelo Nosso Número: ${cleanNossoNumero}`);
                pdfBuffer = await inter.getBillingPdf(cleanNossoNumero);
                usedId = cleanNossoNumero;
                console.log(`[PDF] ✅ PDF baixado com sucesso usando Nosso Número!`);
            } catch (e: any) {
                console.error(`[PDF] ❌ Falha no fallback pelo Nosso Número: ${e.message}`);
            }
        }

        if (!pdfBuffer) {
            console.error(`[PDF] ❌ Não foi possível baixar o PDF com nenhum dos identificadores.`);
            return NextResponse.json({
                error: 'Não foi possível baixar o PDF. Tente novamente em alguns instantes ou entre em contato com o suporte.',
                details: 'Nenhum dos identificadores (codigoSolicitacao ou nossoNumero) funcionou.'
            }, { status: 404 });
        }

        console.log(`[PDF] 🎉 Retornando PDF (${pdfBuffer.length} bytes) usando ID: ${usedId}`);

        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename=boleto-${usedId}.pdf`,
            },
        });
    } catch (error: any) {
        console.error('[BOLETO PDF PROXY ERROR]', error);
        return NextResponse.json({
            error: 'Erro ao processar solicitação de PDF',
            details: error.message
        }, { status: 500 });
    }
}
