import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { firebaseAdmin } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');
        if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const results = {
            notified_7d: 0,
            notified_3d: 0,
            notified_1d: 0,
            errors: [] as string[]
        };

        // Função auxiliar para processar notificações
        const notifyTenants = async (days: number, title: string, bodyTemplate: string) => {
            const targetDate = new Date();
            targetDate.setDate(now.getDate() + days);
            const dateStr = targetDate.toISOString().split('T')[0];

            const { data: tenants } = await getSupabaseAdmin()
                .from('tenants')
                .select('id, name, subscription_current_period_end')
                .gte('subscription_current_period_end', `${dateStr}T00:00:00`)
                .lte('subscription_current_period_end', `${dateStr}T23:59:59`)
                .eq('subscription_status', 'active');

            if (tenants) {
                for (const tenant of tenants) {
                    // Buscar proprietários da barbearia
                    const { data: owners } = await getSupabaseAdmin()
                        .from('users')
                        .select('id, fcm_token, name, email')
                        .eq('tenant_id', tenant.id)
                        .eq('role', 'owner');

                    if (owners) {
                        for (const owner of owners) {
                            try {
                                if (owner.fcm_token) {
                                    await sendPush(owner.fcm_token, {
                                        title: title,
                                        body: bodyTemplate.replace('{tenant}', tenant.name || 'sua barbearia'),
                                    });
                                }

                                // FIXME: Implementar Email (Resend) e WhatsApp (Evolution API) aqui
                                console.log(`[CRON] Notificação de expiração sent to owner ${owner.email} for tenant ${tenant.id}`);

                            } catch (e: any) {
                                results.errors.push(`${days}d-${tenant.id}-${owner.id}: ${e.message}`);
                            }
                        }
                    }

                    if (days === 7) results.notified_7d++;
                    else if (days === 3) results.notified_3d++;
                    else if (days === 1) results.notified_1d++;
                }
            }
        };

        // 1. Alerta de 7 dias
        await notifyTenants(7, "Sua assinatura vence em 7 dias", "O plano da barbearia {tenant} vence em uma semana. Renove agora para garantir o desconto!");

        // 2. Alerta de 3 dias
        await notifyTenants(3, "Sua assinatura vence em 3 dias", "Faltam apenas 3 dias para o vencimento do seu plano na {tenant}. Não deixe para a última hora!");

        // 3. Alerta de 1 dia
        await notifyTenants(1, "Atenção: Sua assinatura vence AMANHÃ", "Seu acesso ao 791 Barber na barbearia {tenant} será bloqueado amanhã. Regularize agora!");

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('[CRON EXPIRATIONS ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function sendPush(token: string, payload: { title: string, body: string }) {
    if (!firebaseAdmin.apps.length) return;

    try {
        await firebaseAdmin.messaging().send({
            token,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            android: { priority: 'high' },
            apns: { payload: { aps: { sound: 'default' } } }
        });
    } catch (e) {
        console.error('[PUSH ERROR]', e);
    }
}
