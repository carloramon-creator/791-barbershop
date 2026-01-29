import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: clientId } = await params;
        const { tenant } = await getCurrentUserAndTenant();

        if (!clientId) {
            return NextResponse.json({ error: 'ID do cliente não fornecido' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Buscar dados básicos do cliente
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .eq('tenant_id', tenant.id)
            .single();

        if (clientError || !client) {
            return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
        }

        // 2. Buscar itens da fila atendidos (para servir de base de IDs de transação)
        const { data: queueItems } = await supabase
            .from('client_queue')
            .select(`
                *,
                barber:barbers(name)
            `)
            .eq('client_id', clientId)
            .eq('status', 'finished')
            .order('finished_at', { ascending: false });

        const queueIds = queueItems?.map(q => q.id) || [];

        // 3. Buscar faturamento real vinculado
        // Otimizado: Se houver queueIds, busca vendas que batam com client_id OU queueIds
        let salesQuery = supabase.from('sales').select(`
            *,
            barber:barbers(name),
            itens:sale_items(
                *,
                service:services(name),
                product:products(name)
            )
        `);

        if (queueIds.length > 0) {
            salesQuery = salesQuery.or(`client_id.eq.${clientId},client_queue_id.in.(${queueIds.join(',')})`);
        } else {
            salesQuery = salesQuery.eq('client_id', clientId);
        }

        const [salesRes, vendasRes] = await Promise.all([
            salesQuery.order('created_at', { ascending: false }),

            // Vendas diretas de produtos
            supabase
                .from('vendas')
                .select(`
                    *,
                    vendedor:users(name),
                    itens:venda_itens(
                        *,
                        produto:products(name)
                    )
                `)
                .eq('cliente_id', clientId)
                .order('created_at', { ascending: false })
        ]);

        // 4. Consolidar e formatar o histórico
        const history: any[] = [];
        const saleQueueIds = new Set(salesRes.data?.map(s => s.client_queue_id).filter(Boolean));

        // Adicionar Vendas de Serviços (Atendimentos completos)
        salesRes.data?.forEach(sale => {
            const items = sale.itens?.map((i: any) => ({
                name: i.service?.name || i.product?.name || 'Item desconhecido',
                quantity: i.quantity,
                price: i.price
            })) || [];

            history.push({
                id: sale.id,
                type: 'service_sale',
                date: sale.created_at,
                title: 'Atendimento Realizado',
                amount: sale.total_amount,
                method: sale.payment_method,
                barber: sale.barber?.name,
                status: sale.status,
                items
            });
        });

        // Adicionar Atendimentos da Fila (Fallbacks: se não houver venda vinculada)
        queueItems?.forEach(queue => {
            if (saleQueueIds.has(queue.id)) return;

            // Tentar extrair itens do rascunho (draft_items) para não aparecer vazio
            const draftItems = (queue.draft_items as any[]) || [];
            const items = draftItems.map(i => ({
                name: i.name || 'Item não detalhado',
                quantity: i.quantity || 1,
                price: i.price || 0
            }));

            const totalAmount = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);

            history.push({
                id: queue.id,
                type: 'service_sale',
                date: queue.finished_at || queue.created_at,
                title: totalAmount > 0 ? 'Atendimento Realizado (Fila)' : 'Atendimento Realizado (Sem venda)',
                amount: totalAmount,
                method: 'Pendente',
                barber: queue.barber?.name,
                status: 'concluido',
                items
            });
        });

        // Adicionar Vendas Diretas de Produtos (Consumo de balcão)
        vendasRes.data?.forEach(venda => {
            const items = venda.itens?.map((i: any) => ({
                name: i.produto?.name || 'Produto',
                quantity: i.quantidade,
                price: i.preco_unitario
            })) || [];

            history.push({
                id: venda.id,
                type: 'product_sale',
                date: venda.created_at,
                title: 'Venda de Produtos',
                amount: venda.total,
                method: venda.metodo_pagamento,
                vendedor: venda.vendedor?.name,
                items
            });
        });

        // Ordenar tudo por data decrescente
        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({
            client: {
                id: client.id,
                name: client.name,
                phone: client.phone,
                birth_date: client.birth_date
            },
            history
        });

    } catch (error: any) {
        console.error('[CLIENT HISTORY ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
