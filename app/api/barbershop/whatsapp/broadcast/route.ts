import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';
import { WhatsAppClient } from '@/lib/whatsapp/client';

export async function POST(req: Request) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const body = await req.json();
        const { message, target, clientIds } = body;

        if (!message) {
            return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Buscar config de WhatsApp do tenant
        const { data: config } = await supabase
            .from('whatsapp_configs')
            .select('phone_number_id, access_token')
            .eq('tenant_id', tenant.id)
            .maybeSingle();

        if (!config || !config.access_token || !config.phone_number_id) {
            return NextResponse.json({ error: 'WhatsApp não configurado' }, { status: 400 });
        }

        const creds = {
            accessToken: config.access_token,
            phoneNumberId: config.phone_number_id
        };

        // 2. Determinar destinatários
        let targetClients: any[] = [];

        if (target === 'all') {
            const { data } = await supabase
                .from('clients')
                .select('id, name, phone')
                .eq('tenant_id', tenant.id)
                .not('phone', 'is', null);
            targetClients = data || [];
        } else if (target === 'specific' && Array.isArray(clientIds)) {
            const { data } = await supabase
                .from('clients')
                .select('id, name, phone')
                .eq('tenant_id', tenant.id)
                .in('id', clientIds)
                .not('phone', 'is', null);
            targetClients = data || [];
        } else if (target === 'birthdays') {
            // Lógica similar ao job de aniversário, mas para disparo manual imediato
            const now = new Date();
            const month = now.getMonth() + 1;
            const day = now.getDate();

            const { data } = await supabase
                .from('clients')
                .select('id, name, phone, birth_date')
                .eq('tenant_id', tenant.id)
                .not('phone', 'is', null)
                .not('birth_date', 'is', null);

            targetClients = (data || []).filter(c => {
                const parts = c.birth_date.split('-');
                return parseInt(parts[1], 10) === month && parseInt(parts[2], 10) === day;
            });
        }

        if (targetClients.length === 0) {
            return NextResponse.json({ error: 'Nenhum cliente selecionado ou sem telefone' }, { status: 400 });
        }

        const stats = {
            total: targetClients.length,
            sent: 0,
            error: 0
        };

        const results = [];

        // 3. Disparo (Síncrono para simplicidade inicial, mas idealmente seria um job em background se for muitos)
        for (const client of targetClients) {
            try {
                const firstName = client.name.split(' ')[0] || 'Cliente';
                const finalMessage = message.replace(/{{nome}}/g, firstName).replace(/{{name}}/g, firstName);

                const result = await WhatsAppClient.sendText(creds, client.phone, finalMessage);
                if (result && result.success) {
                    stats.sent++;
                } else {
                    stats.error++;
                }
                results.push({ clientId: client.id, success: !!result?.success });
            } catch (err) {
                stats.error++;
                results.push({ clientId: client.id, success: false, error: err });
            }
        }

        return NextResponse.json({ success: true, stats, results });

    } catch (error: any) {
        console.error('[WHATSAPP BROADCAST ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
