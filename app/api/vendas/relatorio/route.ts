import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function GET(req: Request) {
    try {
        const { tenant } = await getCurrentUserAndTenant();

        if (!tenant) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        if (!start || !end) {
            return NextResponse.json({ error: 'Período obrigatório' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Buscar vendas do período
        const { data: vendas, error } = await supabase
            .from('vendas')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('status', 'concluida')
            .gte('created_at', `${start}T00:00:00`)
            .lte('created_at', `${end}T23:59:59`);

        if (error) throw error;

        // Agrupar por método de pagamento
        const resumoPorMetodo: Record<string, { quantidade: number; total: number }> = {};

        vendas?.forEach((venda) => {
            const metodo = venda.metodo_pagamento || 'nao_informado';
            if (!resumoPorMetodo[metodo]) {
                resumoPorMetodo[metodo] = { quantidade: 0, total: 0 };
            }
            resumoPorMetodo[metodo].quantidade++;
            resumoPorMetodo[metodo].total += Number(venda.total || 0);
        });

        // Converter para array
        const resumo = Object.entries(resumoPorMetodo).map(([metodo, dados]) => ({
            metodo,
            quantidade: dados.quantidade,
            total: dados.total
        }));

        // Calcular totais
        const totais = {
            quantidade: vendas?.length || 0,
            valor: vendas?.reduce((acc, v) => acc + Number(v.total || 0), 0) || 0
        };

        return NextResponse.json({
            resumo,
            totais,
            periodo: { inicio: start, fim: end }
        });

    } catch (error: any) {
        console.error('[RELATORIO VENDAS ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
