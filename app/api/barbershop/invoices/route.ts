import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { supabaseAdmin } from '@/lib/supabase-server';
import { InterAPIV3 } from '@/lib/inter-api-v3'; // Using V3

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function GET(req: Request) {
    try {
        const { tenant, user } = await getCurrentUserAndTenant();
        if (!tenant || !user) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Não autenticado' }, { status: 401 }));
        }

        // 1. Busca Configuração Inter (para o check automático)
        const { data: settingsData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'inter_config')
            .single();

        const config = settingsData?.value;
        const cert = config?.crt?.replace(/\\n/g, '\n');
        const key = config?.key?.replace(/\\n/g, '\n');

        // 2. Antes de listar, tenta sincronizar faturas pendentes recentes (últimos 3 dias)
        // Isso resolve o pedido do usuário para check automático sem clique
        if (config && cert && key) {
            const inter = new InterAPIV3({
                clientId: config.client_id,
                clientSecret: config.client_secret,
                cert,
                key,
                accountNumber: config.account_number || config.accountNumber
            });

            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const { data: pendingRecent } = await supabaseAdmin
                .from('finance')
                .select('*')
                .eq('tenant_id', tenant.id)
                .eq('is_paid', false)
                .ilike('description', 'SaaS%')
                .gte('created_at', threeDaysAgo.toISOString());

            if (pendingRecent && pendingRecent.length > 0) {
                console.log(`[AUTO-SYNC] Verificando ${pendingRecent.length} faturas pendentes para ${tenant.name}`);

                for (const inv of pendingRecent) {
                    const txid = inv.metadata?.txid;
                    if (!txid) continue;

                    try {
                        const details = await inter.getBillingBySolicitacao(txid);
                        const finalDetails = details.cobranca ? { ...details.cobranca, boleto: details.boleto, pix: details.pix } : details;
                        const situacao = finalDetails?.situacao || finalDetails?.status;

                        const isPaid = situacao === 'PAGO' ||
                            situacao === 'RECEBIDO' ||
                            situacao === 'CONCLUIDA' ||
                            situacao === 'RECEBIDA';

                        const isCanceled = situacao === 'CANCELADO' ||
                            situacao === 'EXPIRADO' ||
                            situacao === 'REJEITADA';

                        if (isPaid) {
                            console.log(`[AUTO-SYNC] ✅ PAGO detectado para TXID: ${txid}`);
                            // Libera Tenant
                            const description = inv.description || '';
                            let plan = 'basic';
                            if (description.toLowerCase().includes('premium')) plan = 'premium';
                            else if (description.toLowerCase().includes('completo')) plan = 'complete';

                            const periodEnd = new Date();
                            periodEnd.setDate(periodEnd.getDate() + 31);

                            await supabaseAdmin.from('tenants').update({
                                plan,
                                subscription_status: 'active',
                                subscription_current_period_end: periodEnd.toISOString()
                            }).eq('id', tenant.id);

                            await supabaseAdmin.from('finance').update({
                                is_paid: true,
                                metadata: { ...inv.metadata, status_inter: situacao }
                            }).eq('id', inv.id);
                        } else if (isCanceled && inv.metadata?.status_inter !== situacao) {
                            console.log(`[AUTO-SYNC] 🔴 CANCELADO detectado para TXID: ${txid}`);
                            await supabaseAdmin.from('finance').update({
                                metadata: { ...inv.metadata, status_inter: situacao }
                            }).eq('id', inv.id);
                        }
                    } catch (e) {
                        // Ignora erros individuais de consulta para não travar a listagem
                        console.warn(`[AUTO-SYNC] Erro ao consultar TXID ${txid}:`, e);
                    }
                }
            }
        }

        // 3. Buscar faturas atualizadas
        const { data: invoices, error } = await supabaseAdmin
            .from('finance')
            .select('*')
            .eq('tenant_id', tenant.id)
            .ilike('description', 'SaaS%')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return addCorsHeaders(req, NextResponse.json({ invoices: invoices || [] }));
    } catch (error: any) {
        console.error('[GET INVOICES ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
