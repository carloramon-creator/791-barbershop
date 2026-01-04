'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Api } from '@/lib/api';
import { Sale, Barber } from '@/lib/types';
import { Loader2, Printer } from 'lucide-react';
import { ReportHeader, ReportFooter } from '@/components/reports/report-header';

// Auxiliar para decodificar items (serviços/produtos) se o backend não entregar mastigado
// Assumindo que o endpoint /api/sales traga sales com sale_items.
// Se não, teremos que buscar. O tipo Sale varia.
// Vou assumir que o backend entregue itens. Se não, precisarei ajustar.

function BarberReportContent() {
    const searchParams = useSearchParams();
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const ids = searchParams.get('ids')?.split(',') || [];

    const [sales, setSales] = useState<any[]>([]); // Usando any para flexibilidade com joins
    const [loading, setLoading] = useState(true);
    const [barbers, setBarbers] = useState<Barber[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                // Buscamos todas as vendas (idealmente filtraríamos no backend)
                // e todos os barbeiros para pegar nomes
                const [allSales, allBarbers] = await Promise.all([
                    Api.getSales(),
                    Api.getBarbers()
                ]);

                setBarbers(allBarbers || []);

                // Filtragem Client-Side
                const filtered = (allSales || []).filter((s: any) => {
                    const date = s.created_at.split('T')[0];
                    const barberMatch = ids.length === 0 || ids.includes(s.barber_id);
                    const dateMatch = (!start || date >= start) && (!end || date <= end);
                    return barberMatch && dateMatch;
                });

                // Precisamos buscar os ITENS das vendas para detalhar "consumo do cliente"
                // O endpoint getSales normal não traz items? 
                // Assumindo que traga ou que faremos fetch individual é ruim.
                // Vou assumir que o usuário aceita um sumário se o backend não der os itens.
                // Mas o requisito é "consumo detalhado".
                // Se o backend não der items, não temos como mostrar.
                // Verifiquei getSales e ele faz `select('*, barbers(name)')`. Não traz items.
                // SOLUÇÃO: Vou ter que hackear: Para cada venda filtrada, buscar os itens? Isso mataria a performance.
                // MELHOR: Criar um endpoint novo ou alterar getSales para incluir items.
                // Como sou Antigravity, vou alterar getSales para incluir sale_items.

                setSales(filtered);
            } catch (e) {
                console.error(e);
                alert('Erro ao carregar dados.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [start, end, ids]);

    const groupedByBarber = sales.reduce((acc: any, sale) => {
        const bId = sale.barber_id;
        if (!acc[bId]) acc[bId] = [];
        acc[bId].push(sale);
        return acc;
    }, {});

    const getBarberName = (id: string) => barbers.find(b => b.id === id)?.name || 'Desconhecido';

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-12">
            <div className="flex justify-between items-start print:hidden">
                <div>
                    <h1 className="text-2xl font-bold">Relatório de Produção / Comissões</h1>
                    <p className="text-sm text-gray-500">Período: {start ? new Date(start).toLocaleDateString('pt-BR') : 'Início'} até {end ? new Date(end).toLocaleDateString('pt-BR') : 'Hoje'}</p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800"
                >
                    <Printer size={16} /> Imprimir / PDF
                </button>
            </div>

            {Object.keys(groupedByBarber).length === 0 && (
                <p className="text-center text-gray-500 py-12">Nenhuma movimentação encontrada neste período.</p>
            )}

            {Object.entries(groupedByBarber).map(([bId, bSales]) => {
                const salesList = bSales as any[];
                const totalValue = salesList.reduce((acc, s) => acc + Number(s.total_amount), 0);
                const totalCommission = salesList.reduce((acc, s) => acc + Number(s.commission_value || 0), 0);

                return (
                    <div key={bId} className="break-inside-avoid page-break-after-always">
                        <div className="border-b-2 border-black pb-2 mb-4 flex justify-between items-end">
                            <h2 className="text-xl font-bold uppercase">{getBarberName(bId)}</h2>
                            <div className="text-right">
                                <span className="text-xs text-gray-500">Total Produzido</span>
                                <div className="font-bold text-lg">R$ {totalValue.toFixed(2)}</div>
                            </div>
                        </div>

                        <table className="w-full text-sm text-left mb-6">
                            <thead>
                                <tr className="bg-gray-100 border-b border-gray-300">
                                    <th className="py-2 px-2">Data</th>
                                    <th className="py-2 px-2">Cliente</th>
                                    <th className="py-2 px-2">Pagamento</th>
                                    <th className="py-2 px-2 text-right">Valor Venda</th>
                                    <th className="py-2 px-2 text-right">Comissão</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {salesList.map(sale => (
                                    <>
                                        <tr key={sale.id} className="bg-white">
                                            <td className="py-2 px-2 border-t border-gray-100">{new Date(sale.created_at).toLocaleDateString('pt-BR')} {new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="py-2 px-2 border-t border-gray-100 font-medium uppercase font-mono text-xs text-gray-600">
                                                {sale.client_queue?.client_name || 'BALCÃO'}
                                            </td>
                                            <td className="py-2 px-2 border-t border-gray-100 capitalize">{sale.payment_method === 'credit_card' ? 'Cartão' : sale.payment_method}</td>
                                            <td className="py-2 px-2 border-t border-gray-100 text-right font-bold">R$ {Number(sale.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            <td className="py-2 px-2 border-t border-gray-100 text-right text-gray-500">R$ {Number(sale.commission_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                        {/* Detalhes dos Itens */}
                                        {sale.sale_items && sale.sale_items.length > 0 && (
                                            <tr className="bg-gray-50/50">
                                                <td colSpan={5} className="py-1 px-4 text-xs">
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500">
                                                        {sale.sale_items.map((item: any, idx: number) => (
                                                            <span key={idx} className="flex items-center gap-1">
                                                                <span className="font-bold">• {item.products?.name || item.services?.name || 'Item'}</span>
                                                                <span className="italic">({item.quantity}x R$ {Number(item.price).toFixed(2)})</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-black font-bold bg-gray-50">
                                    <td colSpan={3} className="py-3 px-2 text-right">SUBTOTAL</td>
                                    <td className="py-3 px-2 text-right">R$ {totalValue.toFixed(2)}</td>
                                    <td className="py-3 px-2 text-right">R$ {totalCommission.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center text-sm border border-gray-200">
                            <div>
                                <span className="font-bold">Resumo:</span> {salesList.length} atendimentos realizados.
                            </div>
                            <div className="flex gap-4">
                                <div>Liquidado: <span className="font-bold">R$ {(totalValue - totalCommission).toFixed(2)}</span></div>
                                <div>À Pagar (Comissão): <span className="font-bold text-blue-600">R$ {totalCommission.toFixed(2)}</span></div>
                            </div>
                        </div>
                    </div>
                );
            })}
            <ReportFooter />
        </div>
    );
}

export default function BarberReportPage() {
    return (
        <Suspense fallback={<div className="p-8">Carregando...</div>}>
            <BarberReportContent />
        </Suspense>
    );
}
