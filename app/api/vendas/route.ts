import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

/**
 * POST /api/vendas
 * Criar nova venda direta de produtos
 */
export async function POST(req: Request) {
    try {
        const { tenant, user } = await getCurrentUserAndTenant();

        if (!tenant || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const body = await req.json();
        const {
            cliente_id,
            produtos, // [{ produto_id, quantidade, preco_unitario }]
            desconto_percentual = 0,
            metodo_pagamento
        } = body;

        // Validações
        if (!produtos || produtos.length === 0) {
            return NextResponse.json({ error: 'Nenhum produto selecionado' }, { status: 400 });
        }

        if (!metodo_pagamento) {
            return NextResponse.json({ error: 'Método de pagamento obrigatório' }, { status: 400 });
        }

        // Verificar se tenant tem plano Premium ou Add-on de Estoque
        const hasInventoryAddon = tenant?.active_addons?.includes('inventory');
        const isPremium = tenant?.plan === 'premium';

        if (!tenant || (!isPremium && !hasInventoryAddon)) {
            return NextResponse.json({
                error: 'Módulo de vendas requer Plano Premium ou Módulo de Estoque'
            }, { status: 403 });
        }

        // Calcular subtotal
        let subtotal = 0;
        for (const item of produtos) {
            subtotal += item.quantidade * item.preco_unitario;
        }

        // Calcular desconto
        const desconto_valor = (subtotal * desconto_percentual) / 100;
        const total = subtotal - desconto_valor;

        // Criar venda
        const { data: venda, error: vendaError } = await supabase
            .from('vendas')
            .insert({
                tenant_id: tenant.id,
                cliente_id: cliente_id || null,
                subtotal,
                desconto_percentual,
                desconto_valor,
                total,
                metodo_pagamento,
                vendedor_id: user.id,
                status: 'concluida'
            })
            .select()
            .single();

        // Buscar ou criar categoria de vendas no financeiro
        let categoryId = null;
        const { data: catData } = await supabase
            .from('finance_categories')
            .select('id')
            .eq('tenant_id', tenant.id)
            .eq('name', 'Vendas')
            .single();

        if (catData) {
            categoryId = catData.id;
        } else {
            const { data: newCat } = await supabase
                .from('finance_categories')
                .insert({ tenant_id: tenant.id, name: 'Vendas', type: 'revenue' })
                .select()
                .single();
            if (newCat) categoryId = newCat.id;
        }

        // Criar itens da venda, baixar estoque e registrar movimentação
        for (const item of produtos) {
            // Inserir item da venda
            const { error: itemError } = await supabase
                .from('venda_itens')
                .insert({
                    venda_id: venda.id,
                    produto_id: item.produto_id,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco_unitario,
                    subtotal: item.quantidade * item.preco_unitario
                });

            if (itemError) {
                console.error('[VENDAS API] Erro ao criar item:', itemError);
                throw itemError;
            }

            // Baixar estoque (Tabela correta: products, Coluna: stock_quantity)
            const { data: product } = await supabase
                .from('products')
                .select('stock_quantity, price')
                .eq('id', item.produto_id)
                .single();

            if (product) {
                const novoEstoque = (product.stock_quantity || 0) - item.quantidade;

                await supabase
                    .from('products')
                    .update({ stock_quantity: novoEstoque })
                    .eq('id', item.produto_id);

                // Registrar movimentação de saída
                await supabase
                    .from('product_movements')
                    .insert({
                        tenant_id: tenant.id,
                        product_id: item.produto_id,
                        type: 'exit',
                        quantity: item.quantidade,
                        price: product.price,
                        description: `Venda #${venda.id.substring(0, 8)}`
                    });
            }
        }

        // Registrar no financeiro (entrada)
        await supabase
            .from('finance')
            .insert({
                tenant_id: tenant.id,
                type: 'revenue',
                category_id: categoryId,
                value: total,
                description: `Venda de produtos #${venda.id.substring(0, 8)}`,
                date: new Date().toISOString().split('T')[0],
                is_paid: true,
                metadata: {
                    venda_id: venda.id,
                    metodo_pagamento,
                    quantidade_itens: produtos.length
                }
            });

        return NextResponse.json({
            success: true,
            venda_id: venda.id,
            total
        });

    } catch (error: any) {
        console.error('[VENDAS API ERROR]', error);
        return NextResponse.json({
            error: error.message || 'Erro ao processar venda'
        }, { status: 500 });
    }
}

/**
 * GET /api/vendas
 * Listar vendas do tenant
 */
export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const { data: userData } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        if (!userData?.tenant_id) {
            return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const { data: vendas, error } = await supabase
            .from('vendas')
            .select(`
                *,
                cliente:clients(id, name),
                vendedor:users(id, name),
                itens:venda_itens(
                    id,
                    quantidade,
                    preco_unitario,
                    subtotal,
                    produto:products(id, name)
                )
            `)
            .eq('tenant_id', userData.tenant_id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return NextResponse.json({ vendas });

    } catch (error: any) {
        console.error('[VENDAS API ERROR]', error);
        return NextResponse.json({
            error: error.message || 'Erro ao buscar vendas'
        }, { status: 500 });
    }
}
