import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';
import { generatePixPayload } from '@/lib/pix';

/**
 * Cria uma venda para um items items da fila.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: queueId } = await params;
    try {
        const { tenant, role, user } = await getCurrentUserAndTenant();
        if (role !== 'owner' && role !== 'barber') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const body = await req.json();
        const { services, products, payment_method } = body;

        // Usar getSupabaseAdmin() para garantir a inserção sem bloqueio de RLS
        const client = getSupabaseAdmin();

        // 1. Buscar info da fila (e validar tenant)
        const { data: queueItem, error: fetchError } = await client
            .from('client_queue')
            .select('id, barber_id, client_id, tenant_id') // Adicionado tenant_id
            .eq('id', queueId)
            .single();

        if (fetchError || !queueItem) return NextResponse.json({ error: 'Atendimento não encontrado' }, { status: 404 });

        // SEGURANÇA: Validar Tenant
        if (queueItem.tenant_id !== tenant.id) {
            return NextResponse.json({ error: 'Acesso não autorizado a este recurso.' }, { status: 403 });
        }

        // 2. Calcular total
        let totalAmount = 0;
        let servicesTotal = 0; // NEW: Track services separately
        const salesItems: any[] = [];

        // Processar Serviços
        if (services && services.length > 0) {
            const { data: dbServices } = await client
                .from('services')
                .select('id, price, name')
                .in('id', services.map((s: any) => s.id));

            if (dbServices) {
                for (const s of services) {
                    const dbService = dbServices.find((ds: any) => ds.id === s.id);
                    if (dbService) {
                        const price = Number(dbService.price);
                        const itemTotal = price * s.qty;
                        totalAmount += itemTotal;
                        servicesTotal += itemTotal;
                        salesItems.push({
                            item_type: 'service',
                            item_id: s.id,
                            quantity: s.qty,
                            price: price
                        });
                    }
                }
            }
        }

        // Processar Produtos
        if (products && products.length > 0) {
            const { data: dbProducts } = await client
                .from('products')
                .select('id, price, name')
                .in('id', products.map((p: any) => p.id));

            if (dbProducts) {
                for (const p of products) {
                    const dbProduct = dbProducts.find((dp: any) => dp.id === p.id);
                    if (dbProduct) {
                        const price = Number(dbProduct.price);
                        totalAmount += price * p.qty;
                        salesItems.push({
                            item_type: 'product',
                            item_id: p.id,
                            quantity: p.qty,
                            price: price
                        });
                    }
                }
            }
        }

        // --- NEW: LÓGICA DE CUPOM ---
        let discountAmount = 0;
        let voucherId = null;
        const voucherCode = body.voucher_code;

        if (voucherCode && servicesTotal > 0) {
            // Buscamos o voucher. Se for global (client_id null), não filtramos por used_at aqui,
            // pois o controle de uso é feito via histórico de vendas por cliente.
            const { data: voucher } = await client
                .from('client_vouchers')
                .select('*')
                .eq('code', voucherCode.trim().toUpperCase())
                .eq('tenant_id', tenant.id)
                .gte('expires_at', new Date().toISOString())
                .or(`used_at.is.null,client_id.is.null`) // Vouchers globais não têm client_id e podem não ter used_at
                .single();

            if (voucher) {
                // Verificar se o voucher é deste cliente ou genérico (se client_id for null)
                if (!voucher.client_id || voucher.client_id === queueItem.client_id) {

                    // Se for voucher GLOBAL (client_id is null), verificar se este cliente já usou este voucher antes
                    if (!voucher.client_id) {
                        const { data: previousUsage } = await client
                            .from('sales')
                            .select('id')
                            .eq('client_id', queueItem.client_id)
                            .eq('voucher_id', voucher.id)
                            .maybeSingle();

                        if (previousUsage) {
                            // Cliente já usou este cupom global. Ignorar desconto.
                            return;
                        }
                    }

                    if (voucher.discount_type === 'percentage') {
                        discountAmount = (servicesTotal * Number(voucher.discount_value)) / 100;
                    } else {
                        discountAmount = Math.min(Number(voucher.discount_value), servicesTotal);
                    }
                    voucherId = voucher.id;
                    totalAmount = Math.max(0, totalAmount - discountAmount);

                    // Marcar voucher como usado APENAS se for individual (client_id definido)
                    if (voucher.client_id) {
                        await client.from('client_vouchers').update({ used_at: new Date().toISOString() }).eq('id', voucher.id);
                    }
                }
            }
        }

        // 3. Calcular Comissão
        let commissionValue = 0;
        let commissionRate = 50;
        let commissionType = 'percentage';

        const { data: barberData } = await client
            .from('barbers')
            .select('user_id')
            .eq('id', queueItem.barber_id)
            .single();

        if (barberData && barberData.user_id) {
            const { data: userData } = await client
                .from('users')
                .select('commission_value, commission_type')
                .eq('id', barberData.user_id)
                .single();

            if (userData) {
                commissionRate = Number(userData.commission_value ?? 50);
                commissionType = userData.commission_type || 'percentage';
            }
        }

        // Cálculo da comissão sobre o valor LÍQUIDO do serviço
        const netServicesTotal = Math.max(0, servicesTotal - discountAmount);
        if (commissionType === 'percentage') {
            commissionValue = (netServicesTotal * commissionRate) / 100;
        } else {
            commissionValue = commissionRate;
        }

        // 4. Criar Venda (Sale)
        const { data: sale, error: saleError } = await client
            .from('sales')
            .insert({
                tenant_id: tenant.id,
                client_queue_id: queueId,
                barber_id: queueItem.barber_id,
                client_id: queueItem.client_id,
                total_amount: totalAmount,
                discount_amount: discountAmount,
                voucher_id: voucherId,
                commission_value: commissionValue,
                payment_method,
                status: 'completed',
                created_by: user.id
            })
            .select()
            .single();

        if (saleError) throw saleError;

        // 4. Criar Itens da Venda (Sale Items)
        if (salesItems.length > 0) {
            const itemsToInsert = salesItems.map(item => ({
                tenant_id: tenant.id,
                sale_id: sale.id,
                ...item
            }));

            const { error: itemsError } = await client
                .from('sale_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            // 5. Atualizar estoque e gerar movimentações
            const productItems = salesItems.filter(i => i.item_type === 'product');
            if (productItems.length > 0) {
                const movementsToInsert = productItems.map(item => ({
                    tenant_id: tenant.id,
                    product_id: item.item_id,
                    type: 'exit',
                    quantity: item.quantity,
                    price: item.price,
                    description: `Venda #${sale.id.slice(-4)}`
                }));

                await client.from('product_movements').insert(movementsToInsert);

                // ATUALIZAÇÃO EXPLÍCITA DE ESTOQUE (Fallback/Direct)
                // Para garantir que o estoque baixe mesmo se o trigger falhar
                for (const item of productItems) {
                    const { error: rpcError } = await client.rpc('decrement_stock', { p_id: item.item_id, p_qty: item.quantity });

                    if (rpcError) {
                        // Fallback se RPC não existir ou falhar: update direto
                        const { data: prod } = await client.from('products').select('stock_quantity').eq('id', item.item_id).single();
                        if (prod) {
                            await client.from('products').update({ stock_quantity: (prod.stock_quantity || 0) - item.quantity }).eq('id', item.item_id);
                        }
                    }
                }
            }
        }

        // 6. Se for Pix, gerar payload REAL
        let pixResponse = null;
        if (payment_method === 'pix') {
            // Buscar chaves do tenant
            const { data: tenantInfo } = await client
                .from('tenants')
                .select('pix_key, name, bank_account_holder')
                .eq('id', tenant.id)
                .single();

            if (tenantInfo?.pix_key) {
                const merchantName = tenantInfo.bank_account_holder || tenantInfo.name;
                // Gerar payload QRCPS (BR Code)
                const copyText = generatePixPayload(
                    tenantInfo.pix_key,
                    merchantName,
                    'BRASIL', // Cidade (pode vir do banco depois, por enquanto BRASIL funciona na maioria)
                    totalAmount,
                    sale.id.replace(/-/g, '').substring(0, 25) // TxId (max 25)
                );

                pixResponse = {
                    copyText: copyText,
                    qrBase64: null // Frontend gera o QR visualmente
                };
            } else {
                pixResponse = {
                    copyText: '',
                    warning: 'Chave PIX não configurada. Vá em Configurações para adicionar.'
                };
            }
        }

        return NextResponse.json({
            message: 'Venda registrada com sucesso',
            saleId: sale.id,
            pix: pixResponse
        });

    } catch (error: any) {
        console.error('[CREATE_SALE_ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
