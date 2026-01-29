import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const clientId = params.id;

        if (!clientId) {
            return NextResponse.json({ error: 'ID do cliente não fornecido' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Buscar dados básicos do cliente (incluindo telefone para busca em agendamentos)
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .eq('tenant_id', tenant.id)
            .single();

        if (clientError || !client) {
            return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
        }

        // 2. Buscar histórico de diversas fontes
        const [salesRes, vendasRes, appointmentsRes, queueRes] = await Promise.all([
            // Vendas de serviços (vincular com itens da venda se necessário)
            supabase
                .from('sales')
                .select(`
                    *,
                    barbers(name),
                    client_queue(client_name)
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
                .order('created_at', { ascending: false }),

            // Agendamentos (pode estar por ID ou por telefone se for agendamento externo)
            supabase
                .from('appointments')
                .select('*, barbers(name)')
                .or(`client_id.eq.${clientId},client_phone.eq.${client.phone}`)
                .eq('tenant_id', tenant.id)
                .order('start_time', { ascending: false }),

            // Entradas na fila (para ver serviços iniciados/cancelados/não faturados)
            supabase
                .from('client_queue')
                .select('*, barbers(name)')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false })
        ]);

        // 3. Consolidar e formatar o histórico
        const history: any[] = [];

        // Adicionar Vendas de Serviços
        salesRes.data?.forEach(sale => {
            history.push({
                id: sale.id,
                type: 'service_sale',
                date: sale.created_at,
                title: 'Serviço Realizado',
                amount: sale.total_amount,
                method: sale.payment_method,
                barber: sale.barbers?.name,
                status: sale.status,
                details: sale.client_queue?.client_name
            });
        });

        // Adicionar Vendas Diretas
        vendasRes.data?.forEach(venda => {
            history.push({
                id: venda.id,
                type: 'product_sale',
                date: venda.created_at,
                title: 'Compra de Produtos',
                amount: venda.total,
                method: venda.metodo_pagamento,
                vendedor: venda.vendedor?.name,
                items: venda.itens?.map((i: any) => `${i.quantidade}x ${i.produto?.name}`).join(', ')
            });
        });

        // Adicionar Agendamentos (filtrar os que já viraram venda/faturamento para não duplicar se possível, 
        // ou mostrar como "Agendamento" vs "Serviço")
        appointmentsRes.data?.forEach(appt => {
            // Evitar duplicidade se já estiver em sales (opcional, por simplicidade mostramos todos)
            history.push({
                id: appt.id,
                type: 'appointment',
                date: appt.start_time,
                title: 'Agendamento Horário',
                status: appt.status,
                barber: appt.barbers?.name,
                notes: appt.notes
            });
        });

        // Adicionar Entradas na Fila (que não viraram venda ou para detalhar o status)
        queueRes.data?.forEach(q => {
            // Se já tem uma venda vinculada, talvez não precise mostrar a fila isolada
            // Mas para histórico completo, é bom.
            history.push({
                id: q.id,
                type: 'queue_entry',
                date: q.created_at,
                title: 'Entrada na Fila',
                status: q.status,
                barber: q.barbers?.name,
                service: q.service_name
            });
        });

        // Ordenar tudo por data decrescente
        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({
            client: {
                id: client.id,
                name: client.name,
                phone: client.phone
            },
            history
        });

    } catch (error: any) {
        console.error('[CLIENT HISTORY ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
