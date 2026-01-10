
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { InterAPIV3 } from './lib/inter-api-v3';
import { supabaseAdmin } from './lib/supabase-server';

async function checkInter() {
    const txid = 'aebc0ab0-06ac-4d5d-bd36-6289d0ce0ec2'; // ID do Pix
    console.log(`🕵️ Buscando detalhes do Pix TXID: ${txid}`);

    // Config do Inter
    const { data: settingsData } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'inter_config')
        .single();

    const config = settingsData?.value;
    const cert = config?.crt?.replace(/\\n/g, '\n');
    const key = config?.key?.replace(/\\n/g, '\n');

    const inter = new InterAPIV3({
        clientId: config.client_id,
        clientSecret: config.client_secret,
        cert,
        key
    });

    try {
        console.log('Chamando getBillingBySolicitacao...');
        const details = await inter.getBillingBySolicitacao(txid);
        console.log('\n📦 RESPOSTA ESTRUTURADA DO INTER:');
        console.log(JSON.stringify(details, null, 2));

        const isPaid = details?.situacao === 'PAGO' || details?.situacao === 'RECEBIDO' || details?.status === 'CONCLUIDA' || details?.status === 'RECEBIDA';
        console.log(`\n✅ INTERPRETAÇÃO: Está pago? ${isPaid}`);

        if (isPaid) {
            console.log('🎉 TÁ PAGO! Vamos atualizar o banco por aqui mesmo.');
            await supabaseAdmin.from('finance').update({ is_paid: true, metadata: { ...details, checked_at: new Date() } })
                .eq('metadata->>txid', txid);
            console.log('💾 Banco atualizado!');
        }

    } catch (e: any) {
        console.error('❌ ERRO AO CONSULTAR INTER:', e.response?.data || e.message);
    }
}

checkInter();
