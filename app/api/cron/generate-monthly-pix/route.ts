import { NextResponse } from 'next/server';
import { addCorsHeaders } from '@/lib/server-utils';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function GET(req: Request) {
    try {
        // Verificar autenticação via header secreto (segurança do cron)
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';

        if (authHeader !== `Bearer ${cronSecret}`) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
        }

        console.log('[CRON] Iniciando geração de Pix mensal...');

        const today = new Date().toISOString().split('T')[0];

        // Buscar assinaturas com vencimento hoje
        const { data: subscriptions, error } = await getSupabaseAdmin()
            .from('subscriptions')
            .select('*, tenants(*)')
            .eq('status', 'active')
            .eq('next_billing_date', today);

        if (error) {
            console.error('[CRON] Erro ao buscar assinaturas:', error);
            return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
        }

        if (!subscriptions || subscriptions.length === 0) {
            console.log('[CRON] Nenhuma assinatura com vencimento hoje');
            return addCorsHeaders(req, NextResponse.json({
                message: 'Nenhuma assinatura para processar',
                count: 0
            }));
        }

        console.log(`[CRON] Encontradas ${subscriptions.length} assinaturas para processar`);

        const results = [];

        for (const subscription of subscriptions) {
            try {
                const tenant = subscription.tenants;

                // Buscar dados do plano
                const { data: planData } = await getSupabaseAdmin()
                    .from('system_plans')
                    .select('*')
                    .eq('slug', subscription.plan_slug)
                    .single();

                if (!planData) {
                    console.error(`[CRON] Plano não encontrado: ${subscription.plan_slug}`);
                    continue;
                }

                // Calcular valor total (plano + addons)
                let totalAmount = Number(planData.price);

                // Adicionar valor dos addons
                if (subscription.addons && subscription.addons.length > 0) {
                    for (const addonSlug of subscription.addons) {
                        const { data: addonData } = await getSupabaseAdmin()
                            .from('system_addons')
                            .select('*')
                            .eq('slug', addonSlug)
                            .single();

                        if (addonData) {
                            totalAmount += Number(addonData.price);
                        }
                    }
                }

                // Gerar Pix via Inter API
                const pixResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/checkout/inter-pix`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${cronSecret}` // Usar autenticação interna
                    },
                    body: JSON.stringify({
                        plan: subscription.plan_slug,
                        addons: subscription.addons,
                        interval: subscription.billing_cycle,
                        tempId: `SUB${subscription.id.substring(0, 8)}${Date.now()}`,
                        is_renewal: true, // Flag para indicar que é renovação
                        tenant_id: tenant.id // Passar tenant_id para bypass de autenticação
                    })
                });

                const pixData = await pixResponse.json();

                if (pixData.error) {
                    console.error(`[CRON] Erro ao gerar Pix para ${tenant.name}:`, pixData.error);
                    results.push({
                        tenant: tenant.name,
                        status: 'error',
                        error: pixData.error
                    });
                    continue;
                }

                // Atualizar assinatura: próxima cobrança em 30 dias
                const nextBillingDate = new Date();
                nextBillingDate.setDate(nextBillingDate.getDate() + 30);

                await getSupabaseAdmin()
                    .from('subscriptions')
                    .update({
                        last_billing_date: today,
                        next_billing_date: nextBillingDate.toISOString().split('T')[0]
                    })
                    .eq('id', subscription.id);

                console.log(`[CRON] Pix gerado com sucesso para ${tenant.name}`);

                results.push({
                    tenant: tenant.name,
                    status: 'success',
                    amount: totalAmount,
                    next_billing: nextBillingDate.toISOString().split('T')[0]
                });

                // TODO: Enviar notificação (email/WhatsApp) com link do Pix

            } catch (e: any) {
                console.error(`[CRON] Erro ao processar assinatura ${subscription.id}:`, e);
                results.push({
                    tenant: subscription.tenants?.name || 'Unknown',
                    status: 'error',
                    error: e.message
                });
            }
        }

        console.log('[CRON] Processamento concluído:', results);

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            processed: results.length,
            results
        }));

    } catch (e: any) {
        console.error('[CRON] Erro geral:', e);
        return addCorsHeaders(req, NextResponse.json({ error: e.message }, { status: 500 }));
    }
}
