const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBirthdays() {
    const targetId = '6661f50b-c49f-41e0-bd41-a9790860e242'; // Carlos Ramon
    console.log(`Verificando configurações para o cliente: ${targetId}`);

    // 1. Fetch Client
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, phone, tenant_id, birth_date, fcm_token')
        .eq('id', targetId)
        .single();

    if (clientError) {
        console.error('Erro ao buscar cliente:', clientError);
        return;
    }

    console.log('Cliente encontrado:', {
        name: client.name,
        phone: client.phone,
        tenantId: client.tenant_id,
        birthDate: client.birth_date
    });

    if (!client.tenant_id) {
        console.log('Cliente sem tenant_id!');
        return;
    }

    // 2. Fetch WhatsApp Config
    const { data: config, error: configError } = await supabase
        .from('whatsapp_configs')
        .select('id, phone_number_id, access_token, created_at')
        .eq('tenant_id', client.tenant_id)
        .maybeSingle();

    if (configError) {
        console.error('Erro ao buscar config WhatsApp:', configError);
        return;
    }

    if (!config) {
        console.log('Nenhuma configuração de WhatsApp encontrada para este tenant.');
    } else {
        console.log('Configuração WhatsApp encontrada:', {
            id: config.id,
            phoneNumberId: config.phone_number_id ? 'Definido' : 'Ausente',
            accessToken: config.access_token ? 'Definido' : 'Ausente',
            createdAt: config.created_at
        });
    }
}

checkBirthdays();
