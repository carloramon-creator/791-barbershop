'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Printer, CheckCircle2 } from 'lucide-react';
import { ReportHeader, ReportFooter } from '@/components/reports/report-header';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

const PAYMENT_METHODS = {
    'dinheiro': '💵 Dinheiro',
    'pix': '💠 PIX',
    'cartao_debito': '💳 Cartão Débito',
    'cartao_credito': '💳 Cartão Crédito'
};

function VendasContent() {
    const searchParams = useSearchParams();
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const [relatorio, setRelatorio] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (start && end) {
            fetch(`/api/vendas/relatorio?start=${start}&end=${end}`)
                .then(res => res.json())
                .then(data => setRelatorio(data))
                .finally(() => setLoading(false));
        }
    }, [start, end]);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-8 max-w-5xl mx-auto bg-white text-black min-h-screen">
            <ReportHeader />

            <div className="flex justify-between items-start mb-8 print:hidden">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight">Relatório Detalhado de Vendas</h1>
                    <p className="text-gray-500 font-medium">
                        Período: {new Date(start! + 'T12:00:00').toLocaleDateString('pt-BR')} a {new Date(end! + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-md hover:bg-slate-800 font-bold transition-all"
                >
                    <Printer size={18} /> IMPRIMIR PDF
                </button>
            </div>

            <div className="space-y-10">
                {/* Tabela de Lançamentos */}
                <div>
                    <h2 className="text-sm font-black uppercase mb-4 border-l-4 border-black pl-2">Detalhamento de Transações</h2>
                    <table className="w-full text-left text-[11px]">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="py-2 px-1">DATA/HORA</th>
                                <th className="py-2 px-1">USUÁRIO</th>
                                <th className="py-2 px-1">CLIENTE</th>
                                <th className="py-2 px-1">MÉTODO</th>
                                <th className="py-2 px-1 text-right">VALOR TOTAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {relatorio?.vendas.map((venda: any) => (
                                <tr key={venda.id}>
                                    <td className="py-2 px-1">{new Date(venda.created_at).toLocaleString('pt-BR')}</td>
                                    <td className="py-2 px-1 font-bold">{venda.vendedor?.name || '---'}</td>
                                    <td className="py-2 px-1 uppercase">{venda.cliente?.name || 'Venda Avulsa'}</td>
                                    <td className="py-2 px-1 font-bold">
                                        {PAYMENT_METHODS[venda.metodo_pagamento as keyof typeof PAYMENT_METHODS] || venda.metodo_pagamento}
                                    </td>
                                    <td className="py-2 px-1 text-right font-black text-emerald-600">
                                        {formatCurrency(venda.total)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Resumo por Forma de Pagamento */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 break-inside-avoid">
                    <h2 className="text-sm font-black uppercase mb-4 text-slate-800">Resumo de Vendas por Forma de Pagamento</h2>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-gray-300 text-gray-500">
                                <th className="py-2 text-left">MÉTODO DE PAGAMENTO</th>
                                <th className="py-2 text-right">QTD VENDAS</th>
                                <th className="py-2 text-right">TOTAL ARRECADADO</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {relatorio?.resumo.map((item: any) => (
                                <tr key={item.metodo}>
                                    <td className="py-2 font-medium">
                                        {PAYMENT_METHODS[item.metodo as keyof typeof PAYMENT_METHODS] || item.metodo}
                                    </td>
                                    <td className="py-2 text-right font-bold">{item.quantidade}</td>
                                    <td className="py-2 text-right font-black text-emerald-700">
                                        {formatCurrency(item.total)}
                                    </td>
                                </tr>
                            ))}
                            <tr className="border-t-2 border-slate-300 bg-white">
                                <td className="py-3 font-black uppercase">TOTAL GERAL</td>
                                <td className="py-3 text-right font-black">{relatorio?.totais.quantidade}</td>
                                <td className="py-3 text-right font-black text-lg text-emerald-600">
                                    {formatCurrency(relatorio?.totais.valor)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <ReportFooter />

            <style jsx global>{`
                @media print {
                    @page { margin: 1.5cm; }
                    body { background: white !important; }
                    .print\:hidden { display: none !important; }
                }
            `}</style>
        </div>
    );
}

export default function VendasReportPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>}>
            <VendasContent />
        </Suspense>
    );
}
