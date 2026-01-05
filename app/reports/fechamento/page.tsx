'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Api } from '@/lib/api';
import { Loader2, Printer } from 'lucide-react';
import { Sale, Barber } from '@/lib/types';
import { supabaseClient } from '@/lib/supabase-client';
import { ReportHeader, ReportFooter } from '@/components/reports/report-header';

function ClosingReportContent() {
    const searchParams = useSearchParams();
    const barberId = searchParams.get('barberId');
    const bonus = Number(searchParams.get('bonus') || 0);

    const [sales, setSales] = useState<Sale[]>([]);
    const [barber, setBarber] = useState<any>(null); // Use any to allow join fields if needed
    const [commissionPercentage, setCommissionPercentage] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!barberId) return;
            setLoading(true);
            try {
                // Fetch data from the closing API which now returns both sales and the correct barber name
                const response = await Api.getBarberClosing(barberId);

                // If the backend returns the new format { sales, barberName }
                if (response && response.barberName) {
                    setSales(response.sales || []);
                    setBarber({ name: response.barberName });
                    setCommissionPercentage(response.commissionPercentage || 0);
                } else {
                    // Fallback for old API format or empty response
                    setSales(Array.isArray(response) ? response : []);
                }
            } catch (error) {
                console.error("Error fetching report data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // Add minimal delay to allow data to settle if called immediately after a sale
        setTimeout(fetchData, 500);
    }, [barberId]);

    if (!barberId) return <div>Barbeiro não identificado.</div>;

    const totalGross = sales.reduce((acc, sale) => acc + (sale.total_amount || 0), 0);
    const totalCommission = sales.reduce((acc, sale) => acc + (sale.commission_value || 0), 0);
    const totalPayable = totalCommission + bonus;

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-2 max-w-5xl mx-auto bg-white min-h-screen text-black print:p-0 print:max-w-none text-[12px]">
            {/* Header - Ultra Compact */}
            <div className="mb-2">
                <ReportHeader />
                <div className="flex justify-between items-end border-b border-black pb-1 mt-1">
                    <div>
                        <h1 className="text-lg font-bold uppercase leading-none">Fechamento de Caixa</h1>
                        <p className="text-gray-600 text-[10px]">Barbeiro: <span className="font-bold">{barber?.name}</span></p>
                    </div>
                    <div className="text-right text-[9px] text-gray-500">
                        <p>Gerado: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            </div>

            {/* List - Compact */}
            <table className="w-full text-left mb-4 border-collapse">
                <thead>
                    <tr className="bg-gray-100 border-y border-gray-300">
                        <th className="py-1 px-2 font-bold w-[70px]">Data</th>
                        <th className="py-1 px-2 font-bold">Cliente / Itens Detalhados</th>
                        <th className="py-1 px-2 text-right font-bold w-[100px]">Vlr. Item</th>
                        <th className="py-1 px-2 text-right font-bold w-[100px]">Comissão</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sales.map((sale) => {
                        const items = (sale as any).sale_items || [];
                        return (
                            <tr key={sale.id} className="hover:bg-gray-50 align-top border-b border-gray-50">
                                <td className="py-2 px-2 text-gray-600 leading-tight">
                                    {new Date(sale.created_at).toLocaleDateString('pt-BR')} <br />
                                    <span className="text-[9px] opacity-60">{new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </td>
                                <td className="py-2 px-2">
                                    <div className="font-bold uppercase text-[11px] mb-1">{sale.client_queue?.client_name || 'Balcão'}</div>
                                    <div className="space-y-0.5">
                                        {items.map((item: any, idx: number) => {
                                            const name = item.services?.name || item.products?.name || 'Item';
                                            const isService = item.item_type === 'service';
                                            const perc = isService ? (commissionPercentage || 0) : 0;
                                            return (
                                                <div key={idx} className="text-[10px] text-gray-700">
                                                    • {name} {perc > 0 && <span className="text-[8px] font-bold">({perc}%)</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-end pt-1 border-t border-gray-100 mt-1">
                                        <div className="text-[10px] text-gray-400 mr-2 italic">TOTAL DA VENDA:</div>
                                    </div>
                                </td>
                                <td className="py-2 px-2 text-right font-mono">
                                    <div className="space-y-0.5">
                                        {items.map((item: any, idx: number) => {
                                            const isService = item.item_type === 'service';
                                            const itemPrice = Number(item.price || 0);
                                            return (
                                                <div key={idx} className="text-[10px]">
                                                    {isService && itemPrice > 0 ? `R$ ${itemPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="font-bold text-gray-400 border-t border-gray-100 mt-1 pt-1">
                                        R$ {(sale.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                </td>
                                <td className="py-2 px-2 text-right font-mono font-bold">
                                    <div className="space-y-0.5">
                                        {items.map((item: any, idx: number) => {
                                            const isService = item.item_type === 'service';
                                            const itemPrice = Number(item.price || 0);
                                            const perc = isService ? (commissionPercentage || 0) : 0;
                                            const itemComm = isService ? (itemPrice * perc / 100) : 0;
                                            return (
                                                <div key={idx} className="text-[10px]">
                                                    {isService && itemComm > 0 ? `R$ ${itemComm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="text-emerald-800 border-t border-gray-100 mt-1 pt-1 font-black">
                                        R$ {(sale.commission_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {sales.length === 0 && (
                        <tr>
                            <td colSpan={4} className="py-4 text-center italic text-gray-400">Nenhum lançamento pendente.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Bottom Section - Ultra Compact */}
            <div className="flex justify-between items-start gap-8 mt-4 mb-4 break-inside-avoid">
                {/* Signatures Left/Center */}
                <div className="flex-1 space-y-4 pt-2">
                    <div className="max-w-[250px]">
                        <div className="border-t border-black mb-0.5"></div>
                        <p className="uppercase font-bold text-[9px] text-gray-700">{barber?.name}</p>
                        <p className="text-[8px] italic text-gray-500">Barbeiro (Assinatura)</p>
                    </div>
                    <div className="max-w-[250px]">
                        <div className="border-t border-black mb-0.5"></div>
                        <p className="uppercase font-bold text-[9px] text-gray-700">Responsável (Caixa)</p>
                        <p className="text-[8px] italic text-gray-500">Conferência / Assinatura</p>
                    </div>
                </div>

                {/* Summary Right */}
                <div className="w-[280px] bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-bold border-b border-gray-300 pb-1 mb-2 uppercase text-[10px] text-gray-500 tracking-wider">Resumo Final</h3>

                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                            <span>Qtd Vendas:</span>
                            <span className="font-bold">{sales.length}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span>Faturamento Bruto:</span>
                            <span className="font-bold">R$ {totalGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-[12px] font-bold text-emerald-700 border-t border-gray-200 pt-1 mt-1">
                            <span>Comissão Total:</span>
                            <span>R$ {totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {bonus !== 0 && (
                            <div className="flex justify-between text-[11px] text-blue-600 italic">
                                <span>{bonus > 0 ? '(+) Bônus' : '(-) Ajuste'}:</span>
                                <span>R$ {Math.abs(bonus).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}

                        <div className="border-t-2 border-slate-900 mt-2 pt-2 flex justify-between items-center text-slate-900">
                            <span className="font-bold text-[13px] uppercase">Total Líquido</span>
                            <span className="font-black text-lg">R$ {totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center print:hidden">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 mx-auto font-bold shadow-lg text-sm"
                >
                    <Printer size={18} /> Imprimir Relatório
                </button>
            </div>
            <ReportFooter />
        </div >
    );
}

export default function ClosingReportPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <ClosingReportContent />
        </Suspense>
    );
}
