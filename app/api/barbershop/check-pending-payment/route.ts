import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { supabaseAdmin } from '@/lib/supabase-server';
import { InterAPIV3 } from '@/lib/inter-api-v3';

export async function OPTIONS(req: Request) {
    return addCorsHeaders(req, new NextResponse(null, { status: 200 }));
}

export async function GET(req: Request) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        if (!tenant) return addCorsHeaders(req, NextResponse.json({ error: 'Não autorizado' }, { status: 401 }));

        const { searchParams } = new URL(req.url);
        // Suporta os dois formatos pra ser robusto
        const seuNumero = searchParams.get('seu_numero') || searchParams.get('seuNumero');

        if (!seuNumero) return addCorsHeaders(req, NextResponse.json({ error: 'seu_numero ausente' }, { status: 400 }));

        const { data: charge } = await supabaseAdmin
            .from('finance')
            .select('*')
            .eq('metadata->>seu_numero', seuNumero)
            .maybeSingle();

        if (!charge) return addCorsHeaders(req, NextResponse.json({ ready: false }));

        let isReady = charge.metadata?.nosso_numero && charge.metadata.nosso_numero !== 'PENDING';
        if (charge.metadata?.method === 'pix_inter' && charge.metadata?.pix_payload) isReady = true;

        if (!isReady) {
            // 1. Configurar Inter - Buscar do DB primeiro
            const { data: settingsData } = await supabaseAdmin
                .from('system_settings')
                .select('value')
                .eq('key', 'inter_config')
                .single();

            const dbConfig = settingsData?.value;
            const clientId = dbConfig?.client_id || process.env.INTER_CLIENT_ID;
            const certRaw = dbConfig?.crt || process.env.INTER_CERT_CONTENT || '';
            const keyRaw = dbConfig?.key || process.env.INTER_KEY_CONTENT || '';
            const cert = certRaw.replace(/\\n/g, '\n');
            const key = keyRaw.replace(/\\n/g, '\n');

            if (clientId && cert && key) {
                const inter = new InterAPIV3({
                    clientId,
                    clientSecret: dbConfig?.client_secret || process.env.INTER_CLIENT_SECRET || '',
                    cert, key
                });

                try {
                    let found: any = null;
                    const txid = charge.metadata.txid;

                    // Estratégia 1: Busca direta por UUID (Mais rápido e garantido)
                    if (txid && txid !== 'N/A') {
                        try {
                            console.log(`[POLLING] Buscando direto por UUID: ${txid}`);
                            const directRes = await inter.getBillingBySolicitacao(txid);
                            // Normaliza a resposta (pode vir aninhada)
                            if (directRes.cobranca) {
                                found = {
                                    ...directRes.cobranca,
                                    boleto: directRes.boleto,
                                    pix: directRes.pix
                                };
                            } else {
                                found = directRes;
                            }
                        } catch (e) {
                            console.warn(`[POLLING] Falha na busca direta por UUID: ${txid}`);
                        }
                    }

                    // Estratégia 2: Listagem (Fallback)
                    if (!found) {
                        console.log('[POLLING] Buscando por listagem (fallback)...');
                        // Janela de segurança ampliada para evitar problemas de fuso horário (UTC vs BRT)
                        // Busca de 2 dias atrás até Amanhã
                        const dStart = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0];
                        const dEnd = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                        const response = await inter.listBillings(dStart, dEnd);
                        const items = response.cobrancas || response.content || [];
                        found = items.find((it: any) => it.seuNumero === seuNumero);
                    }

                    if (found) {
                        const isPix = charge.metadata.method === 'pix_inter';
                        const meta = {
                            ...charge.metadata,
                            nosso_numero: found.nossoNumero || found.boleto?.nossoNumero || found.cobranca?.nossoNumero,
                            codigo_barras: found.codigoBarras || found.boleto?.codigoBarras,
                            linha_digitavel: found.linhaDigitavel || found.boleto?.linhaDigitavel,
                            pix_payload: found.pixCopiaECola || found.pix?.pixCopiaECola || found.pixCopiaECola,
                            txid: found.codigoSolicitacao || found.cobranca?.codigoSolicitacao || charge.metadata.txid
                        };

                        // Só atualiza se tiver novidade útil
                        const isPaid = found.situacao === 'PAGO' || found.situacao === 'RECEBIDO' || found.status === 'CONCLUIDA' || found.status === 'RECEBIDA';
                        const isCanceled = found.situacao === 'CANCELADO' || found.situacao === 'EXPIRADO' || found.status === 'REJEITADA';

                        // Atualiza Metadata
                        if (meta.nosso_numero && meta.nosso_numero !== 'PENDING') {
                            await supabaseAdmin.from('finance').update({
                                metadata: meta,
                                is_paid: isPaid ? true : charge.is_paid
                            }).eq('id', charge.id);
                            charge.metadata = meta;
                            isReady = true;
                        } else if (isPix && meta.pix_payload) {
                            await supabaseAdmin.from('finance').update({
                                metadata: meta,
                                is_paid: isPaid ? true : charge.is_paid
                            }).eq('id', charge.id);
                            charge.metadata = meta;
                            isReady = true;
                        }

                        // Se descobriu que foi CANCELADO, podemos opcionalmente marcar algo no banco
                        // Por ora, vamos garantir que o is_paid continue falso mas o metadata salve o status
                        if (isCanceled) {
                            await supabaseAdmin.from('finance').update({
                                metadata: { ...meta, status_inter: found.situacao || found.status }
                            }).eq('id', charge.id);
                        }

                        // Se descobriu que está PAGO agora, libera o tenant
                        if (isPaid && !charge.is_paid) {
                            console.log(`[POLLING] 🔥 Pagamento detectado via Polling! Liberando tenant...`);
                            const description = charge.description || '';
                            let plan = 'basic';
                            if (description.toLowerCase().includes('premium')) plan = 'premium';
                            else if (description.toLowerCase().includes('completo')) plan = 'complete';

                            const periodEnd = new Date();
                            periodEnd.setDate(periodEnd.getDate() + 31);

                            if (charge.metadata.tenant_id) {
                                await supabaseAdmin.from('tenants').update({
                                    plan: plan,
                                    subscription_status: 'active',
                                    subscription_current_period_end: periodEnd.toISOString()
                                }).eq('id', charge.metadata.tenant_id);
                            }

                            // Garante atualização final
                            await supabaseAdmin.from('finance').update({ is_paid: true }).eq('id', charge.id);
                        }
                    }
                } catch (e) {
                    console.error('[POLLING INTER ERROR]', e);
                }
            }
        }

        if (isReady) {
            const isPix = charge.metadata.method === 'pix_inter';
            // Prioriza codigoSolicitacao (txid) para PDF, pois sempre está disponível
            const pdfUrl = charge.metadata.txid
                ? `/api/checkout/inter-boleto/pdf?codigoSolicitacao=${charge.metadata.txid}&nossoNumero=${charge.metadata.nosso_numero || ''}`
                : `/api/checkout/inter-boleto/pdf?nossoNumero=${charge.metadata.nosso_numero}`;

            return addCorsHeaders(req, NextResponse.json({
                ready: true,
                type: isPix ? 'pix' : 'boleto',
                payload: isPix ? {
                    pixPayload: charge.metadata.pix_payload,
                    amount: charge.value,
                    expiresAt: charge.metadata.expires_at || new Date().toISOString(),
                    pdfUrl
                } : {
                    nossoNumero: charge.metadata.nosso_numero,
                    codigoBarras: charge.metadata.codigo_barras,
                    linhaDigitavel: charge.metadata.linha_digitavel,
                    amount: charge.value,
                    pdfUrl
                }
            }));
        }

        return addCorsHeaders(req, NextResponse.json({ ready: false }));

    } catch (error: any) {
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
