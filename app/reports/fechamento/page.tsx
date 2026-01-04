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
    const [tenantName, setTenantName] = useState('Barbearia');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!barberId) return;
            setLoading(true);
            try {
                // 1. Fetch Barber info
                console.log('[REPORT] Fetching barber name for ID:', barberId);

                // Try fetching barber first
                const { data: bData, error: bError } = await supabaseClient
                    .from('barbers')
                    .select('name, user_id')
                    .eq('id', barberId)
                    .single();

                let barberName = bData?.name;
                let userId = bData?.user_id;

                if (!barberName || barberName === 'Barbeiro') {
                    // Try to get name from user table
                    const targetId = userId || barberId;
                    const { data: uData } = await supabaseClient
                        .from('users')
                        .select('name')
                        .eq('id', targetId)
                        .single();

                    if (uData?.name) barberName = uData.name;
                }

                console.log('[REPORT] Resolved name:', barberName);
                setBarber({ name: barberName || 'Barbeiro' });

                // 2. Fetch Pending Sales (Same logic as Closing Dialog)
                // REMOVED TENANT FETCH - using ReportHeader
                // 3. Fetch Pending Sales

                // 3. Fetch Pending Sales (Same logic as Closing Dialog)
                // 3. Fetch Pending Sales (Same logic as Closing Dialog)
                // Usar a mesma API do Dialog para garantir consistência e evitar problemas de RLS
                const closingSales = await Api.getBarberClosing(barberId);
                setSales(closingSales);
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



    // ...

    return (
        <div className="p-8 max-w-5xl mx-auto bg-white min-h-screen text-black print:p-8 print:max-w-none">
            {/* Header */}
            <div className="mb-8">
                <ReportHeader />
                <div className="flex justify-between items-end border-b-2 border-black pb-4 mt-6">
                    <div>
                        <h1 className="text-2xl font-bold uppercase">Fechamento de Caixa / Comissões</h1>
                        <p className="text-gray-600 mt-1">Barbeiro: <span className="font-bold text-lg">{barber?.name}</span></p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                        <p>Data do Fechamento: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <table className="w-full text-sm text-left mb-8">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                        <th className="py-3 px-4 font-bold">Data</th>
                        <th className="py-3 px-4 font-bold">Cliente / Serviço</th>
                        <th className="py-3 px-4 text-right font-bold">Valor Venda</th>
                        <th className="py-3 px-4 text-right font-bold">Comissão</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-600">
                                {new Date(sale.created_at).toLocaleDateString('pt-BR')} <span className="text-xs">{new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </td>
                            <td className="py-3 px-4">
                                <span className="font-medium uppercase">{sale.client_queue?.client_name || 'Balcão'}</span>
                            </td>
                            <td className="py-3 px-4 text-right">R$ {(sale.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-700">R$ {(sale.commission_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    ))}
                    {sales.length === 0 && (
                        <tr>
                            <td colSpan={4} className="py-8 text-center italic text-gray-400">Nenhum lançamento pendente para este fechamento.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Totals Section */}
            <div className="flex justify-end mb-12 break-inside-avoid">
                <div className="w-1/3 bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="font-bold border-b border-gray-300 pb-2 mb-4 uppercase text-sm text-gray-500">Resumo do Fechamento</h3>

                    <div className="flex justify-between py-1 text-sm">
                        <span>Qtd Serviços:</span>
                        <span className="font-mono">{sales.length}</span>
                    </div>
                    <div className="flex justify-between py-1 text-sm">
                        <span>Faturamento Bruto:</span>
                        <span className="font-mono">R$ {totalGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-1 text-base font-medium text-emerald-700">
                        <span>Comissão Total:</span>
                        <span className="font-mono">R$ {totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {bonus !== 0 && (
                        <div className="flex justify-between py-1 text-sm text-blue-600">
                            <span>Ajuste / Bônus:</span>
                            <span className="font-mono">R$ {bonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    )}

                    <div className="border-t border-gray-300 mt-4 pt-4 flex justify-between items-center">
                        <span className="font-bold text-lg uppercase text-slate-900">Total a Pagar</span>
                        <span className="font-black text-2xl text-slate-900">R$ {totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* Signature Area */}
            <div className="mt-16 flex justify-between px-16 break-inside-avoid">
                <div className="text-center w-1/3">
                    <div className="border-t border-black mb-2"></div>
                    <p className="uppercase font-bold text-sm text-gray-700">{barber?.name}</p>
                    <p className="text-[10px] italic text-gray-500">Barbeiro</p>
                </div>
                <div className="text-center w-1/3">
                    <div className="border-t border-black mb-2"></div>
                    <p className="uppercase font-bold text-sm text-gray-700">Responsável (Caixa)</p>
                    <p className="text-[10px] italic text-gray-500">Assinatura</p>
                </div>
            </div>

            <div className="mt-12 text-center print:hidden">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg hover:bg-slate-800 mx-auto font-bold shadow-lg"
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
