import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function debugWhats() {
    const phone = '554891305547';
    console.log(`Buscando agendamentos para ${phone}...`);

    const { data: appts, error } = await supabase
        .from('appointments')
        .select('tenant_id, client_name')
        .eq('client_phone', phone)
        .limit(1);

    if (!appts || appts.length === 0) {
        console.error('Nenhum agendamento encontrado para esse telefone.');
        return;
    }

    const tenantId = appts[0].tenant_id;
    console.log(`Tenant ID encontrado: ${tenantId}`);

    const { data: config } = await supabase
        .from('whatsapp_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

    if (!config) {
        console.error('Nenhuma configuração de WhatsApp encontrada para este Tenant!');
        return;
    }

    console.log('Configuração encontrada:');
    console.log('Phone ID:', config.phone_number_id);
    console.log('Token:', config.access_token ? config.access_token.substring(0, 10) + '...' : 'NULL');
    console.log('WABA ID:', config.whatsapp_business_account_id);

    if (!config.access_token || !config.phone_number_id) {
        console.error('Configuração incompleta (sem token ou phone_id).');
        return;
    }

    // Tentar envio
    try {
        console.log('Tentando enviar mensagem de teste via Facebook API...');
        const url = `https://graph.facebook.com/v17.0/${config.phone_number_id}/messages`;

        const payload = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: 'Teste de diagnóstico automático do sistema 791Barber. Se recebeu, a config está OK.' }
        };

        const res = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${config.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ ENVIO COM SUCESSO!');
        console.log('Response:', res.data);

    } catch (e: any) {
        console.error('❌ ERRO NO ENVIO:');
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Data:', JSON.stringify(e.response.data, null, 2));
        } else {
            console.error(e.message);
        }
    }
}

debugWhats();
