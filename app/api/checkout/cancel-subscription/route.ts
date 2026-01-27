import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { AsaasClient } from '@/lib/asaas-client';
import { InterAPIV3 } from '@/lib/inter-api-v3';

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function POST(req: Request) {
    try {
        const { tenant, roles } = await getCurrentUserAndTenant();

        if (!tenant || !roles.includes('owner')) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Acesso negado' }, { status: 403 }));
        }

        const metadata = (tenant.metadata as any) || {};
        const idRec = metadata.id_rec;
        const asaasSubId = tenant.asaas_subscription_id;

        console.log(`[CANCEL SUBSCRIPTION] Tenant ${tenant.id} | Asaas: ${asaasSubId} | Inter: ${idRec}`);

        // --- 1. Cancelar no Asaas (se houver) ---
        if (asaasSubId) {
            try {
                const { data: settingsData } = await getSupabaseAdmin()
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'asaas_config')
                    .single();

                const dbConfig = settingsData?.value;
                const asaas = new AsaasClient({
                    apiKey: dbConfig?.apiKey || process.env.ASAAS_API_KEY || '',
                    environment: dbConfig?.environment || 'sandbox'
                });

                await asaas.cancelSubscription(asaasSubId);
                console.log(`[CANCEL SUBSCRIPTION] Assinatura Asaas ${asaasSubId} cancelada.`);
            } catch (err: any) {
                console.warn('[CANCEL SUBSCRIPTION] Erro ao cancelar no Asaas:', err.message);
            }
        }

        // --- 2. Cancelar no Inter (Pix Automático) ---
        if (idRec) {
            try {
                const { data: settingsData } = await getSupabaseAdmin()
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'inter_config')
                    .single();

                const dbConfig = settingsData?.value;
                const cert = (dbConfig?.crt || '').replace(/\\n/g, '\n');
                const key = (dbConfig?.key || '').replace(/\\n/g, '\n');

                if (dbConfig?.pix_key && cert && key) {
                    const inter = new InterAPIV3({
                        clientId: dbConfig?.client_id || '',
                        clientSecret: dbConfig?.client_secret || '',
                        cert,
                        key,
                        accountNumber: dbConfig?.account_number
                    });

                    await inter.cancelRecurrenceAgreement(idRec);
                    console.log(`[CANCEL SUBSCRIPTION] Acordo Inter ${idRec} cancelado.`);
                }
            } catch (err: any) {
                console.warn('[CANCEL SUBSCRIPTION] Erro ao cancelar no Inter:', err.message);
            }
        }

        // --- 3. Atualizar Localmente ---
        // Mantemos o 'canceled' mas o cliente ainda acessa se tiver 'subscription_current_period_end' no futuro
        const { error: updateError } = await getSupabaseAdmin()
            .from('tenants')
            .update({
                subscription_status: 'canceled',
                // Limpamos os IDs para evitar tentativas de cobrança futura
                asaas_subscription_id: null,
                metadata: { ...metadata, id_rec: null, canceled_at: new Date().toISOString() }
            })
            .eq('id', tenant.id);

        if (updateError) throw updateError;

        return addCorsHeaders(req, NextResponse.json({ success: true }));

    } catch (error: any) {
        console.error('[CANCEL SUBSCRIPTION ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
