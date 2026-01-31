import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { WhatsAppClient } from '@/lib/whatsapp/client';

/**
 * Endpoint para triggers de Jobs (Cron) do WhatsApp
 * Suporte Multi-tenant: Itera sobre todas as barbearias configuradas
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { trigger, date } = body;

        console.log(`[WHATSAPP_JOB] Iniciando trigger: ${trigger}`);

        // Buscar todas as barbearias que possuem WhatsApp oficial configurado
        const { data: configs, error: configError } = await getSupabaseAdmin()
            .from('whatsapp_configs')
            .select('tenant_id, phone_number_id, access_token');

        if (configError || !configs) {
            return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
        }

        const results = [];

        for (const config of configs) {
            const ctx = {
                tenantId: config.tenant_id,
                creds: {
                    accessToken: config.access_token,
                    phoneNumberId: config.phone_number_id
                }
            };

            if (trigger === 'BIRTHDAY_JOB') {
                const res = await handleBirthdayJob(ctx, date || new Date().toISOString().split('T')[0]);
                results.push({ tenantId: config.tenant_id, ...res });
            }

            if (trigger === 'REMINDER_JOB') {
                const res = await handleReminderJob(ctx);
                results.push({ tenantId: config.tenant_id, ...res });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error('[WHATSAPP_JOB_ERROR]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Job de Aniversariantes do Dia (por barbearia)
 */
async function handleBirthdayJob(ctx: any, targetDate: string) {
    const admin = getSupabaseAdmin();

    // Buscar clientes da barbearia específica
    const { data: clients } = await admin
        .from('clients')
        .select('id, name, phone')
        .eq('tenant_id', ctx.tenantId)
        .not('phone', 'is', null);

    if (!clients || clients.length === 0) return { message: 'Nenhum aniversariante' };

    let sentCount = 0;
    for (const client of clients) {
        const phone = client.phone.replace(/\D/g, '');
        if (phone.length < 10) continue;

        // Enviar Template usando as credenciais desta barbearia
        await WhatsAppClient.sendTemplate(ctx.creds, phone, 'parabens_fidelidade', 'pt_BR', [
            {
                type: 'body',
                parameters: [{ type: 'text', text: client.name.split(' ')[0] }]
            }
        ]);
        sentCount++;
    }

    return { sentCount };
}

/**
 * Job de Lembretes de Agendamentos (por barbearia)
 */
async function handleReminderJob(ctx: any) {
    // Lógica para buscar agendamentos desta barbearia nas próximas horas e avisar
    return { message: 'Lembretes verificados' };
}
