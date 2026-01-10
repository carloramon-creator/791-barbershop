
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { InterAPIV3 } from './lib/inter-api-v3.ts';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function register() {
    console.log('🔗 Buscando credenciais do Inter...');
    const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'inter_config')
        .single();

    if (!settingsData) {
        console.error('❌ Configurações do Inter não encontradas no Supabase.');
        return;
    }

    const config = settingsData.value;
    const cert = config.crt?.replace(/\\n/g, '\n');
    const key = config.key?.replace(/\\n/g, '\n');
    const clientId = config.client_id;
    const clientSecret = config.client_secret;
    const pixKey = config.pix_key; // Assumindo que tem chave pix salva

    if (!clientId || !cert || !key) {
        console.error('❌ Credenciais incompletas.');
        return;
    }

    const inter = new InterAPIV3({
        clientId, clientSecret, cert, key
    });

    const WEBHOOK_URL = 'https://791-barbershop-production.up.railway.app/api/webhooks/inter';

    try {
        console.log('📡 Registrando Webhook de COBRANÇA (Boleto V3)...');
        await inter.registerWebhook(WEBHOOK_URL, 'boleto');
        console.log('✅ Webhook de Cobrança registrado com sucesso!');
    } catch (e: any) {
        console.error('❌ Erro ao registrar Webhook Cobrança:', e.message || e);
    }

    if (pixKey) {
        try {
            console.log(`📡 Registrando Webhook de PIX (Chave: ${pixKey})...`);
            await inter.registerWebhook(WEBHOOK_URL, 'pix', pixKey);
            console.log('✅ Webhook de PIX registrado com sucesso!');
        } catch (e: any) {
            console.error('❌ Erro ao registrar Webhook PIX:', e.message || e);
        }
    } else {
        console.warn('⚠️ Chave Pix não encontrada na configuração. Webhook Pix não registrado.');
    }
}

register();
