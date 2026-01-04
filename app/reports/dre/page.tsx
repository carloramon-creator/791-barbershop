'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Api } from '@/lib/api';
import { Loader2, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReportHeader, ReportFooter } from '@/components/reports/report-header';

// We duplicate the interface here to avoid cross-file dependency issues in this quick fix
interface DreData {
    period: {
        start: string;
        end: string;
    };
    receitas: {
        total: number;
        breakdown: { name: string; value: number }[];
    };
    despesas: {
        total: number;
        breakdown: { name: string; value: number }[];
    };
    lucro: number;
}

function DreReportContent() {
    const searchParams = useSearchParams();
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const [dre, setDre] = useState<DreData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (start && end) {
            Api.getDre(start, end)
                .then(data => setDre(data))
                .catch(e => alert('Erro ao carregar DRE'))
                .finally(() => setLoading(false));
        }
    }, [start, end]);

    if (!start || !end) return <div className="p-8">Parâmetros de data inválidos.</div>;



    // ... existing code ...

    return (
        <div className="p-8 max-w-4xl mx-auto font-sans text-black">
            <ReportHeader />
            <div className="flex justify-between items-start mb-8 print:hidden">
                <h1 className="text-2xl font-bold">Relatório DRE</h1>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800"
                >
                    <Printer size={16} /> Imprimir / PDF
                </button>
            </div>

            <div className="text-center mb-8 border-b-2 border-black pb-4">
                <h2 className="text-2xl font-bold uppercase tracking-widest">Demonstrativo do Resultado do Exercício</h2>
                <p className="text-gray-600 mt-1">Período: {new Date(start + "T12:00:00").toLocaleDateString('pt-BR')} até {new Date(end + "T12:00:00").toLocaleDateString('pt-BR')}</p>
            </div>

            {loading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div> : dre && (
                <div className="space-y-6">
                    {/* Receitas */}
                    <div className="break-inside-avoid">
                        <h3 className="text-lg font-bold border-b border-gray-400 mb-2 uppercase text-emerald-700">1. Receitas Operacionais</h3>
                        <div className="space-y-1">
                            {dre.receitas.breakdown.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-100">
                                    <span>{item.name}</span>
                                    <span className="font-mono">{item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                            ))}
                            <div className="flex justify-between font-bold pt-2 text-base">
                                <span>Total Receitas</span>
                                <span>{dre.receitas.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Despesas */}
                    <div className="break-inside-avoid">
                        <h3 className="text-lg font-bold border-b border-gray-400 mb-2 uppercase text-red-700">2. Despesas Operacionais</h3>
                        <div className="space-y-1">
                            {dre.despesas.breakdown.length === 0 && <div className="text-sm text-gray-400 italic">Nenhuma despesa registrada.</div>}
                            {dre.despesas.breakdown.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-100">
                                    <span>{item.name}</span>
                                    <span className="font-mono text-red-600">({item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
                                </div>
                            ))}
                            <div className="flex justify-between font-bold pt-2 text-base text-red-700">
                                <span>Total Despesas</span>
                                <span>({dre.despesas.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
                            </div>
                        </div>
                    </div>

                    {/* Resultado */}
                    <div className="break-inside-avoid mt-8 pt-4 border-t-2 border-black">
                        <div className="flex justify-between items-center text-xl font-bold bg-gray-100 p-4 rounded">
                            <span className="uppercase">Resultado Líquido (Lucro/Prejuízo)</span>
                            <span className={cn(dre.lucro >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {dre.lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                    </div>

                    {/* Footer */}
                    <ReportFooter />
                </div>
            )}
        </div>
    );
}

export default function DreReportPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <DreReportContent />
        </Suspense>
    );
}
