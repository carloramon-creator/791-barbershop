import { InterAPIV3 } from '../lib/inter-api-v3';
import { getSupabaseAdmin } from '../lib/supabase-server';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testInterPixAutomatico() {
    console.log('\n--- 🧪 Simulando Pix Automático Inter (Homologação) ---');
    try {
        const { data: settings } = await getSupabaseAdmin()
            .from('system_settings')
            .select('value')
            .eq('key', 'inter_config')
            .single();

        const config = settings?.value;
        const clientId = config?.client_id || process.env.INTER_CLIENT_ID;
        const clientSecret = config?.client_secret || process.env.INTER_CLIENT_SECRET;
        const cert = (config?.crt || process.env.INTER_CERT_CONTENT || '').replace(/\\n/g, '\n');
        const key = (config?.key || process.env.INTER_KEY_CONTENT || '').replace(/\\n/g, '\n');

        if (!clientId || !cert || !key) {
            console.error('❌ Configurações do Inter incompletas.');
            return;
        }

        const inter = new InterAPIV3({
            clientId,
            clientSecret: clientSecret || '',
            cert,
            key,
            accountNumber: config?.account_number || config?.accountNumber
        });

        console.log('📡 1. Gerando Location para QR Code...');
        const loc = await inter.createLocation('rec');
        console.log('✅ Location ID:', loc.id);

        console.log('📡 2. Criando Acordo de Recorrência (Agreement)...');
        const payloadRec = {
            vinculo: {
                objeto: "Assinatura Teste Antigravity - 791 Barber",
                devedor: {
                    cpf: "12345678909", // CPF de teste
                    nome: "Usuário Teste Sandbox"
                },
                contrato: "TEST-001"
            },
            calendario: {
                dataInicial: new Date().toISOString().split('T')[0],
                periodicidade: "MENSAL"
            },
            valor: {
                valorRec: "1.00" // Valor simbólico para teste
            },
            politicaRetentativa: "PERMITE_3R_7D",
            loc: loc.id
        };

        const agreement = await inter.createRecurrenceAgreement(payloadRec);
        console.log('✅ Acordo Criado!');
        console.log('🆔 idRec:', agreement.idRec);
        console.log('🔗 QR Code (Payload):', agreement.pixCopiaECola || agreement.rec?.pixCopiaECola);
        console.log('📊 Status:', agreement.status);

        console.log('\n--- PRÓXIMO PASSO ---');
        console.log('Para testar o recebimento, o Pix precisa ser autorizado via App do Inter (em Homologação).');
        console.log('O Webhook configurado no Banco Inter V3 deverá receber a notificação do idRec automaticamente.');

    } catch (error: any) {
        console.error('❌ Erro no teste Pix Automático:', error.message || error);
        if (error.body) console.log('Detalhes:', error.body);
    }
}

async function main() {
    await testInterPixAutomatico();
    process.exit(0);
}

main();
