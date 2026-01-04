'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Api } from '@/lib/api';
import { Loader2, Printer, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { ReportHeader, ReportFooter } from '@/components/reports/report-header';

function MvtContent() {
    const searchParams = useSearchParams();
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const [movements, setMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Api.getMovements(start || undefined, end || undefined)
            .then(data => setMovements(data || []))
            .finally(() => setLoading(false));
    }, [start, end]);



    // ... existing code ...

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <ReportHeader />
            <div className="flex justify-between items-start mb-8 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold">Relatório de Movimentações</h1>
                    <p className="text-gray-500">Período: {start ? new Date(start).toLocaleDateString() : 'Início'} a {end ? new Date(end).toLocaleDateString() : 'Hoje'}</p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800"
                >
                    <Printer size={16} /> Imprimir
                </button>
            </div>

            {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div> : (
                <>
                    <table className="w-full text-sm text-left mb-8">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="py-2">Data/Hora</th>
                                <th className="py-2">Usuário</th>
                                <th className="py-2">Produto</th>
                                <th className="py-2">Tipo</th>
                                <th className="py-2">Descrição</th>
                                <th className="py-2 text-right">Qtd</th>
                                <th className="py-2 text-right">Valor Unit.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {movements.map(m => (
                                <tr key={m.id}>
                                    <td className="py-2 text-gray-600">{new Date(m.created_at).toLocaleString('pt-BR')}</td>
                                    <td className="py-2 text-gray-800 font-medium">{m.users?.name || '---'}</td>
                                    <td className="py-2 font-medium">{m.products?.name || '---'}</td>
                                    <td className="py-2">
                                        {m.type === 'entry'
                                            ? <span className="flex items-center gap-1 text-emerald-600 font-bold"><ArrowUpCircle size={12} /> Entrada</span>
                                            : <span className="flex items-center gap-1 text-red-600 font-bold"><ArrowDownCircle size={12} /> Saída</span>}
                                    </td>
                                    <td className="py-2 text-xs text-gray-500 uppercase">{m.description}</td>
                                    <td className="py-2 text-right font-black">{m.quantity}</td>
                                    <td className="py-2 text-right text-gray-500">{Number(m.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Summary Section */}
                    <div className="break-inside-avoid page-break-after-always mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-end border-b border-gray-300 pb-2 mb-4">
                            <div>
                                <h3 className="text-lg font-bold uppercase text-slate-800">Resumo de Vendas por Produto</h3>
                                <p className="text-sm text-gray-500">
                                    Período: {start ? new Date(start).toLocaleDateString('pt-BR') : 'Início'} até {end ? new Date(end).toLocaleDateString('pt-BR') : 'Hoje'}
                                    {/* Cálculo de dias */}
                                    {start && end
                                        ? ` (${Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1} dias)`
                                        : ''}
                                </p>
                            </div>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500 border-b border-gray-200">
                                    <th className="text-left py-2">Produto</th>
                                    <th className="text-right py-2">Qtd Vendida</th>
                                    <th className="text-right py-2">Total Vendas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {Object.values(movements.reduce((acc: any, m) => {
                                    if (m.type === 'exit' && m.products?.name) {
                                        if (!acc[m.products.name]) {
                                            acc[m.products.name] = { name: m.products.name, qty: 0, total: 0 };
                                        }
                                        acc[m.products.name].qty += m.quantity;
                                        acc[m.products.name].total += (m.quantity * Number(m.price));
                                    }
                                    return acc;
                                }, {})).map((item: any) => (
                                    <tr key={item.name}>
                                        <td className="py-2 font-medium">{item.name}</td>
                                        <td className="py-2 text-right">{item.qty}</td>
                                        <td className="py-2 text-right font-bold text-emerald-600">
                                            {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                    </tr>
                                ))}
                                {movements.filter(m => m.type === 'exit').length === 0 && (
                                    <tr><td colSpan={3} className="py-4 text-center italic text-gray-400">Nenhuma venda registrada no período.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
            <ReportFooter />
        </div>
    );
}

export default function MovementsReportPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <MvtContent />
        </Suspense>
    );
}
