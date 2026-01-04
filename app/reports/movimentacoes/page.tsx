'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Api } from '@/lib/api';
import { Loader2, Printer, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { ReportHeader } from '@/components/reports/report-header';

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
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="py-2">Data/Hora</th>
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
                                <td className="py-2 text-gray-600">{new Date(m.created_at).toLocaleString()}</td>
                                <td className="py-2 font-medium">{m.products?.name || '---'}</td>
                                <td className="py-2">
                                    {m.type === 'entry'
                                        ? <span className="flex items-center gap-1 text-emerald-600 font-bold"><ArrowUpCircle size={12} /> Entrada</span>
                                        : <span className="flex items-center gap-1 text-red-600 font-bold"><ArrowDownCircle size={12} /> Saída</span>}
                                </td>
                                <td className="py-2 text-xs text-gray-500 uppercase">{m.description}</td>
                                <td className="py-2 text-right font-black">{m.quantity}</td>
                                <td className="py-2 text-right text-gray-500">R$ {Number(m.price).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
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
