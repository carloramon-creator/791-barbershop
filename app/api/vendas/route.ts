import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

/**
 * POST /api/vendas
 * Criar nova venda direta de produtos
 */
export async function POST(req: Request) {
    try {
        const cookieStore = cookies();
        const supabase = getSupabaseAdmin();

        // Get user from session
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        // Get user's tenant
        const { data: userData } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        if (!userData?.tenant_id) {
            return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });
        }

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

        // Verificar se tenant tem plano Premium
        const { data: tenant } = await supabase
            .from('tenants')
            .select('id, plan')
            .eq('id', userData.tenant_id)
            .single();

        if (!tenant || tenant.plan !== 'premium') {
            return NextResponse.json({
                error: 'Módulo de vendas disponível apenas no Plano Premium'
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
                tenant_id: userData.tenant_id,
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

        if (vendaError) {
            console.error('[VENDAS API] Erro ao criar venda:', vendaError);
            throw vendaError;
        }

        // Criar itens da venda e baixar estoque
        for (const item of produtos) {
            // Inserir item
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

            // Baixar estoque
            const { data: produto } = await supabase
                .from('produtos')
                .select('estoque_atual')
                .eq('id', item.produto_id)
                .single();

            if (produto) {
                const novoEstoque = (produto.estoque_atual || 0) - item.quantidade;

                await supabase
                    .from('produtos')
                    .update({ estoque_atual: novoEstoque })
                    .eq('id', item.produto_id);
            }
        }

        // Registrar no financeiro (entrada)
        await supabase
            .from('finance')
            .insert({
                tenant_id: user.tenant_id,
                type: 'income',
                category: 'vendas_produtos',
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

        const supabase = getSupabaseAdmin();

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
