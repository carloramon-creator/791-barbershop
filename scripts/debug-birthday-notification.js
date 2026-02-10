const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mock WhatsAppClient logic
const getBaseUrl = (phoneNumberId) => `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

const normalizeNumber = (phone) => {
    return phone.replace(/\D/g, '');
};

const sendTemplate = async (creds, to, templateName, langCode, components) => {
    if (!creds.accessToken || !creds.phoneNumberId) {
        console.error('[WHATSAPP] Credenciais ausentes');
        return null;
    }

    const cleanTo = normalizeNumber(to);

    const payload = {
        messaging_product: 'whatsapp',
        to: cleanTo,
        type: 'template',
        template: {
            name: templateName,
            language: { code: langCode },
            components
        }
    };

    try {
        const url = getBaseUrl(creds.phoneNumberId);
        console.log(`[WHATSAPP_CLIENT] Fazendo POST para ${url} enviando para ${cleanTo}`);
        console.log('Payload:', JSON.stringify(payload, null, 2));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${creds.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[WHATSAPP_API_ERROR]', JSON.stringify(data, null, 2));
            return { success: false, error: data };
        }

        console.log('[WHATSAPP_CLIENT] Template enviado com sucesso:', data.messages?.[0]?.id);
        return { success: true, data };
    } catch (error) {
        console.error('[WHATSAPP_FETCH_ERROR]', error);
        return { success: false, error };
    }
};

// Check Firebase credentials
function checkFirebase() {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        console.log('Firebase credentials present in env.');
        return true;
    } else {
        console.log('Firebase credentials MISSING in env.');
        return false;
    }
}

async function testBirthdayNotification() {
    const targetId = '6661f50b-c49f-41e0-bd41-a9790860e242'; // Carlos Ramon
    console.log(`Iniciando teste para o cliente: ${targetId}`);

    // Check Firebase
    checkFirebase();

    // 1. Fetch Client
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, phone, tenant_id')
        .eq('id', targetId)
        .single();

    if (clientError) {
        console.error('Erro ao buscar cliente:', clientError);
        return;
    }

    // 2. Fetch WhatsApp Config
    const { data: config, error: configError } = await supabase
        .from('whatsapp_configs')
        .select('phone_number_id, access_token')
        .eq('tenant_id', client.tenant_id)
        .maybeSingle();

    if (!config) {
        console.error('Configuração WhatsApp não encontrada.');
        return;
    }

    const creds = {
        accessToken: config.access_token,
        phoneNumberId: config.phone_number_id
    };

    console.log('Tentando enviar Template (1 parametro)...');
    // Teste 1: Apenas Nome
    await sendTemplate(creds, client.phone, 'parabens_fidelidade', 'pt_BR', [
        {
            type: 'body',
            parameters: [{ type: 'text', text: client.name.split(' ')[0] }]
        }
    ]);
}

testBirthdayNotification();
