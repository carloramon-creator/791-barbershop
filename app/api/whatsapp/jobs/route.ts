import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { WhatsAppClient } from '@/lib/whatsapp/client';

/**
 * Endpoint para triggers de Jobs (Cron) do WhatsApp
 * Ex: Aniversários, Lembretes, Promoções
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { trigger, date, campaignId } = body;

        console.log(`[WHATSAPP_JOB] Iniciando trigger: ${trigger}`);

        if (trigger === 'BIRTHDAY_JOB') {
            return handleBirthdayJob(date || new Date().toISOString().split('T')[0]);
        }

        if (trigger === 'REMINDER_JOB') {
            return handleReminderJob();
        }

        return NextResponse.json({ error: 'Trigger inválido' }, { status: 400 });
    } catch (error: any) {
        console.error('[WHATSAPP_JOB_ERROR]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Job de Aniversariantes do Dia
 */
async function handleBirthdayJob(targetDate: string) {
    const admin = getSupabaseAdmin();
    // 1. Buscar clientes que fazem aniversário hoje
    // Simulação de query (precisaria formatar o birth_date no DB para MM-DD)
    const { data: clients } = await admin
        .from('clients')
        .select('id, name, phone')
        .not('phone', 'is', null);

    if (!clients || clients.length === 0) return NextResponse.json({ success: true, message: 'Nenhum aniversariante' });

    let sentCount = 0;
    for (const client of clients) {
        // Transformar telefone para formato internacional se necessário
        const phone = client.phone.replace(/\D/g, '');
        if (phone.length < 10) continue;

        // 2. Enviar Template de Aniversário com Botões
        await WhatsAppClient.sendTemplate(phone, 'parabens_fidelidade', 'pt_BR', [
            {
                type: 'body',
                parameters: [{ type: 'text', text: client.name.split(' ')[0] }]
            },
            {
                type: 'button',
                sub_type: 'quick_reply',
                index: '0',
                payload: 'BIRTHDAY_AGENDAR'
            },
            {
                type: 'button',
                sub_type: 'quick_reply',
                index: '1',
                payload: 'BIRTHDAY_FILA'
            }
        ]);
        sentCount++;
    }

    return NextResponse.json({ success: true, sentCount });
}

/**
 * Job de Lembretes de Agendamentos
 */
async function handleReminderJob() {
    // Lógica para buscar agendamentos nas próximas 2 horas e avisar
    return NextResponse.json({ success: true, message: 'Lembretes enviados (simulado)' });
}
