import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { WhatsAppClient } from '@/lib/whatsapp/client';

/**
 * Endpoint para triggers de Jobs (Cron) do WhatsApp
 * Suporte Multi-tenant: Itera sobre todas as barbearias configuradas
 */
// Suporte a GET para Vercel Cron
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const trigger = searchParams.get('trigger');
    const date = searchParams.get('date'); // Opcional, para testes

    if (!trigger) {
        return NextResponse.json({ error: 'Trigger is required' }, { status: 400 });
    }

    return await processJob(trigger, date);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { trigger, date } = body;
        return await processJob(trigger, date);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function processJob(trigger: string, date?: string | null) {
    try {
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

    // Extrair dia e mês da data alvo (YYYY-MM-DD)
    const [year, month, day] = targetDate.split('-');
    const birthdayMMDD = `${month}-${day}`;

    // Buscar clientes da barbearia específica que possuem data de nascimento
    const { data: clients } = await admin
        .from('clients')
        .select('id, name, phone, birth_date')
        .not('phone', 'is', null)
        .eq('tenant_id', ctx.tenantId)
        .not('birth_date', 'is', null);

    if (!clients || clients.length === 0) return { message: 'Nenhum cliente com data de nascimento' };

    let sentCount = 0;
    for (const client of clients) {
        // Formato esperado do birth_date: YYYY-MM-DD
        const clientBirthday = client.birth_date;
        if (!clientBirthday) continue;

        const clientMMDD = clientBirthday.substring(5, 10); // Pega o MM-DD

        if (clientMMDD === birthdayMMDD) {
            const phone = client.phone.replace(/\D/g, '');
            if (phone.length < 10) continue;

            console.log(`[BIRTHDAY_JOB] Enviando parabéns para ${client.name} (${phone})`);

            // Enviar Template usando as credenciais desta barbearia
            await WhatsAppClient.sendTemplate(ctx.creds, phone, 'parabens_fidelidade', 'pt_BR', [
                {
                    type: 'body',
                    parameters: [{ type: 'text', text: client.name.split(' ')[0] }]
                }
            ]);
            sentCount++;
        }
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
