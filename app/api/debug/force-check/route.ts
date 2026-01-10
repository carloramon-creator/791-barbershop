
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { InterAPIV3 } from '@/lib/inter-api-v3';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const txid = searchParams.get('txid');
        const nossoNumero = searchParams.get('nossoNumero');

        if (!txid && !nossoNumero) {
            return NextResponse.json({ error: 'Forneça ?txid=... ou ?nossoNumero=...' }, { status: 400 });
        }

        // 1. Busca Configuração
        const { data: settingsData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'inter_config')
            .single();

        const config = settingsData?.value;
        const cert = config?.crt?.replace(/\\n/g, '\n');
        const key = config?.key?.replace(/\\n/g, '\n');

        if (!config || !cert || !key) {
            return NextResponse.json({ error: 'Credenciais Inter não encontradas' }, { status: 500 });
        }

        const inter = new InterAPIV3({
            clientId: config.client_id,
            clientSecret: config.client_secret,
            cert,
            key
        });

        let details;
        let identifierType = 'none';

        // 2. Consulta no Inter
        if (txid) {
            console.log(`[FORCE CHECK] Consultando Pix txid: ${txid}`);
            // Para Pix, usamos getBillingBySolicitacao se for cobv, ou consultar pix específico
            // A V3 unifica ou tem endpoints separados. O metodo getBillingBySolicitacao busca cobranca.
            // Para consultar status do PIX em si:
            try {
                // Tenta como Cobrança V3 (se for Pix de Cobrança)
                details = await inter.getBillingBySolicitacao(txid);
                identifierType = 'txid_cobranca';
            } catch (e) {
                console.log('Não encontrado como cobrança pelo uuid, tentando endpoint de pix...');
                // Implementar consulta de Pix avulso se necessário, mas o sistema usa Cobrança Imediata (Pix Copia e Cola) que gera uma Cobrança V3
                throw e;
            }
        } else if (nossoNumero) {
            console.log(`[FORCE CHECK] Consultando NossoNumero: ${nossoNumero}`);
            // Busca detalhes (precisa implementar busca por nossoNumero especifico se o getBillingBySolicitacao for só UUID)
            // Na V3, o endpoint getBillingBySolicitacao aceita "codigoSolicitacao". 
            // Para nossoNumero, geralmente é outra rota ou filtro no list.
            // Vamos assumir que você passou o UUID no parametro txid que é o mais seguro.
            return NextResponse.json({ error: 'Use o txid (UUID) para checagem forçada por enquanto.' });
        }

        console.log('Status Inter:', details?.situacao || details?.status);

        const isPaid = details?.situacao === 'PAGO' || details?.status === 'CONCLUIDA' || details?.status === 'RECEBIDA';

        // 3. Verifica no Banco
        let charge;
        if (txid) {
            const { data } = await supabaseAdmin.from('finance').select('*').eq('metadata->>txid', txid).single();
            charge = data;
        }

        let updated = false;
        if (charge && isPaid && !charge.is_paid) {
            console.log('Atualizando status para PAGO...');

            // Logica de liberar tenant
            const description = charge.description || '';
            let plan = 'basic';
            if (description.toLowerCase().includes('premium')) plan = 'premium';
            else if (description.toLowerCase().includes('completo')) plan = 'complete';

            const periodEnd = new Date();
            periodEnd.setDate(periodEnd.getDate() + 31);

            if (charge.metadata?.tenant_id) {
                await supabaseAdmin.from('tenants').update({
                    plan: plan,
                    subscription_status: 'active',
                    subscription_current_period_end: periodEnd.toISOString()
                }).eq('id', charge.metadata.tenant_id);
            }

            await supabaseAdmin.from('finance').update({ is_paid: true, metadata: { ...charge.metadata, ...details } }).eq('id', charge.id);
            updated = true;
        }

        return NextResponse.json({
            success: true,
            interStatus: details?.situacao || details?.status,
            dbStatus: charge?.is_paid ? 'PAGO' : 'PENDENTE',
            updatedIsPaid: updated,
            raw: details
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
