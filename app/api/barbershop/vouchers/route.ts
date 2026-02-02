import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';
import { firebaseAdmin } from '@/lib/firebase-admin';
import { WhatsAppClient } from '@/lib/whatsapp/client';

/**
 * CRUD de Vouchers da Barbearia
 */
export async function GET(req: Request) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('clientId');

        let query = getSupabaseAdmin()
            .from('client_vouchers')
            .select(`
                *,
                clients (
                    name
                )
            `)
            .eq('tenant_id', tenant.id)
            .order('created_at', { ascending: false });

        if (clientId) {
            query = query.eq('client_id', clientId);
        }

        const { data: vouchers, error } = await query;
        if (error) throw error;

        return NextResponse.json(vouchers || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { tenant, user } = await getCurrentUserAndTenant();
        const body = await req.json();
        const { client_id, code, discount_type, discount_value, expires_at, is_birthday } = body;

        const { data: voucher, error } = await getSupabaseAdmin()
            .from('client_vouchers')
            .insert({
                tenant_id: tenant.id,
                client_id,
                code: code.toUpperCase(),
                discount_type,
                discount_value,
                expires_at,
                is_birthday: is_birthday || false
            })
            .select()
            .single();

        if (error) throw error;

        // --- NOTIFICAÇÃO AUTOMÁTICA ---
        if (client_id) {
            try {
                const { data: client } = await getSupabaseAdmin()
                    .from('clients')
                    .select('name, phone, fcm_token')
                    .eq('id', client_id)
                    .single();

                if (client) {
                    const firstName = client.name.split(' ')[0] || 'Cliente';
                    const discountLabel = discount_type === 'percentage' ? `${discount_value}%` : `R$ ${discount_value}`;
                    const title = is_birthday ? `Parabéns, ${firstName}! 🎂` : `Você ganhou um cupom! 🏷️`;
                    const body = `Use o código ${code.toUpperCase()} e ganhe ${discountLabel} de desconto.`;

                    // 1. Push Notification
                    if (client.fcm_token && firebaseAdmin.apps.length > 0) {
                        try {
                            await firebaseAdmin.messaging().send({
                                token: client.fcm_token,
                                notification: { title, body },
                                android: { priority: 'high' },
                                apns: { payload: { aps: { sound: 'default' } } }
                            });
                        } catch (e) { console.error('[PUSH ERROR]', e); }
                    }

                    // 2. WhatsApp
                    const { data: config } = await getSupabaseAdmin()
                        .from('whatsapp_configs')
                        .select('phone_number_id, access_token')
                        .eq('tenant_id', tenant.id)
                        .maybeSingle();

                    if (config && config.access_token && config.phone_number_id && client.phone) {
                        try {
                            const creds = { accessToken: config.access_token, phoneNumberId: config.phone_number_id };
                            const waBody = `Olá, *${firstName}*! 👋\n\n${title}\n\nUse o código *${code.toUpperCase()}* e ganhe *${discountLabel}* de desconto.${is_birthday ? '\n\nAproveite seu dia!' : ''}`;
                            await WhatsAppClient.sendText(creds, client.phone, waBody);
                        } catch (e) { console.error('[WHATSAPP ERROR]', e); }
                    }
                }
            } catch (notifyErr) {
                console.error('[NOTIFY VOUCHER ERROR]', notifyErr);
            }
        }

        return NextResponse.json(voucher);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 });

        const { error } = await getSupabaseAdmin()
            .from('client_vouchers')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenant.id);

        if (error) throw error;

        return NextResponse.json({ message: 'Voucher removido' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
