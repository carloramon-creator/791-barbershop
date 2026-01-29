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

        // 2. Buscar histórico apenas de faturamento real
        const [salesRes, vendasRes] = await Promise.all([
            // Vendas de serviços com itens detalhados
            supabase
                .from('sales')
                .select(`
                    *,
                    barbers(name),
                    itens:sale_items(
                        *,
                        service:services(name),
                        product:products(name)
                    )
                `)
                .eq('client_id', clientId)
                .order('created_at', { ascending: false }),

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

        // 3. Consolidar e formatar o histórico
        const history: any[] = [];

        // Adicionar Vendas de Serviços
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
                barber: sale.barbers?.name,
                status: sale.status,
                items
            });
        });

        // Adicionar Vendas Diretas
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
