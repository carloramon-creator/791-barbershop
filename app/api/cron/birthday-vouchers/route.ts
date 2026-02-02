import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { firebaseAdmin } from '@/lib/firebase-admin';
import { WhatsAppClient } from '@/lib/whatsapp/client';

export const dynamic = 'force-dynamic';

/**
 * Job diário para enviar vouchers de aniversário
 * Deve ser configurado para rodar às 08:30
 */
export async function GET(req: Request) {
    try {
        // Validação de segurança (opcional: usar CRON_SECRET)
        const { searchParams } = new URL(req.url);
        if (process.env.CRON_SECRET && searchParams.get('secret') !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        // 1. Buscar clientes que fazem aniversário hoje
        // Usamos extração de mês/dia para ignorar o ano
        const { data: birthdayClients, error: fetchError } = await supabase
            .from('clients')
            .select('id, name, phone, fcm_token, tenant_id, birth_date')
            .filter('birth_date', 'not.is', null);

        if (fetchError) throw fetchError;

        // Filtragem robusta pela data (ignorando fuso horário)
        const filteredClients = birthdayClients?.filter(c => {
            if (!c.birth_date) return false;
            // c.birth_date é YYYY-MM-DD
            const parts = c.birth_date.split('-');
            if (parts.length !== 3) return false;
            const bMonth = parseInt(parts[1], 10);
            const bDay = parseInt(parts[2], 10);
            return bMonth === month && bDay === day;
        }) || [];

        const results = {
            processed: 0,
            vouchers_created: 0,
            pushes_sent: 0,
            errors: [] as string[]
        };

        for (const client of filteredClients) {
            try {
                results.processed++;
                const voucherCode = `BDAY-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

                // 2. Criar o Voucher (Válido por 30 dias, 10% de desconto por padrão ou valor do tenant)
                // TODO: No futuro buscar configuração de 'birthday_reward' do tenant
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30);

                const { error: voucherError } = await supabase
                    .from('client_vouchers')
                    .insert({
                        tenant_id: client.tenant_id,
                        client_id: client.id,
                        code: voucherCode,
                        discount_type: 'percentage',
                        discount_value: 10,
                        is_birthday: true,
                        expires_at: expiresAt.toISOString()
                    });

                if (voucherError) throw voucherError;
                results.vouchers_created++;

                // 3. Enviar Push Notification
                if (client.fcm_token && firebaseAdmin.apps.length > 0) {
                    await firebaseAdmin.messaging().send({
                        token: client.fcm_token,
                        notification: {
                            title: `Parabéns, ${client.name}! 🎂`,
                            body: `Hoje o presente é por nossa conta! Use o cupom ${voucherCode} e ganhe 10% de desconto em qualquer serviço.`,
                        },
                        android: { priority: 'high' },
                        apns: { payload: { aps: { sound: 'default' } } },
                        webpush: {
                            fcmOptions: {
                                link: `https://app.791barber.com/queue/status` // Onde ele vê o status/notificação
                            }
                        }
                    });
                    results.pushes_sent++;
                }

                // 4. Enviar WhatsApp (Novo)
                const { data: config } = await supabase
                    .from('whatsapp_configs')
                    .select('phone_number_id, access_token')
                    .eq('tenant_id', client.tenant_id)
                    .maybeSingle();

                if (config && config.access_token && config.phone_number_id) {
                    const creds = {
                        accessToken: config.access_token,
                        phoneNumberId: config.phone_number_id
                    };

                    const cleanPhone = client.phone.replace(/\D/g, '');
                    if (cleanPhone.length >= 10) {
                        const welcomeName = client.name.split(' ')[0];
                        await WhatsAppClient.sendButtons(
                            creds,
                            cleanPhone,
                            `Parabéns, ${welcomeName}! 🎂✨\n\nHoje o presente é por nossa conta! Você ganhou um cupom de *10% de desconto* para usar em qualquer serviço nos próximos 30 dias.\n\nCupom: *${voucherCode}*`,
                            [
                                { id: 'BIRTHDAY_AGENDAR', title: 'Agendar Agora ✂️' }
                            ]
                        );
                    }
                }

            } catch (err: any) {
                results.errors.push(`${client.id}: ${err.message}`);
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('[CRON BDAY ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
