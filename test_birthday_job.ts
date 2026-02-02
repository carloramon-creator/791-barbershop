import { getSupabaseAdmin } from './lib/supabase-server';
import { WhatsAppClient } from './lib/whatsapp/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testBirthdayJob() {
    console.log('--- SIMULAÇÃO JOB ANIVERSÁRIO ---');
    const supabase = getSupabaseAdmin();
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    console.log(`Buscando aniversariantes para: ${day}/${month}`);

    const { data: birthdayClients, error: fetchError } = await supabase
        .from('clients')
        .select('id, name, phone, fcm_token, tenant_id, birth_date')
        .not('birth_date', 'is', null);

    if (fetchError) {
        console.error('Erro ao buscar clientes:', fetchError);
        return;
    }

    const filteredClients = birthdayClients?.filter(c => {
        if (!c.birth_date) return false;
        const parts = c.birth_date.split('-');
        const bMonth = parseInt(parts[1], 10);
        const bDay = parseInt(parts[2], 10);
        return bMonth === month && bDay === day;
    }) || [];

    console.log(`Encontrados ${filteredClients.length} aniversariantes.`);

    for (const client of filteredClients) {
        console.log(`\nProcessando: ${client.name} (${client.phone})`);
        const voucherCode = `BDAY-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        console.log(`Criando voucher: ${voucherCode} expira em ${expiresAt.toISOString()}`);

        const { data: voucher, error: voucherError } = await supabase
            .from('client_vouchers')
            .insert({
                tenant_id: client.tenant_id,
                client_id: client.id,
                code: voucherCode,
                discount_type: 'percentage',
                discount_value: 10,
                is_birthday: true,
                expires_at: expiresAt.toISOString()
            })
            .select()
            .single();

        if (voucherError) {
            console.error('Erro ao criar voucher:', voucherError);
        } else {
            console.log('Voucher criado com sucesso!');
        }

        // WhatsApp
        const { data: config } = await supabase
            .from('whatsapp_configs')
            .select('phone_number_id, access_token')
            .eq('tenant_id', client.tenant_id)
            .maybeSingle();

        if (config && config.access_token && config.phone_number_id) {
            console.log('Configuração WhatsApp encontrada. Enviando...');
            const creds = {
                accessToken: config.access_token,
                phoneNumberId: config.phone_number_id
            };

            const cleanPhone = client.phone.replace(/\D/g, '');
            const welcomeName = client.name.split(' ')[0];
            const result = await WhatsAppClient.sendButtons(
                creds,
                cleanPhone,
                `Parabéns, ${welcomeName}! 🎂✨\n\nHoje o presente é por nossa conta! Você ganhou um cupom de *10% de desconto* para usar em qualquer serviço nos próximos 30 dias.\n\nCupom: *${voucherCode}*`,
                [
                    { id: 'BIRTHDAY_AGENDAR', title: 'Agendar Agora ✂️' }
                ]
            );
            console.log('Resultado WhatsApp:', JSON.stringify(result, null, 2));
        } else {
            console.warn('Configuração WhatsApp NÃO encontrada para tenant:', client.tenant_id);
        }
    }
}

testBirthdayJob();
