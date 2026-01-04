'use client';

import { useState } from 'react';
import { Api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DreData {
    period: {
        start: string;
        end: string;
    };
    receitas: number;
    despesas: number;
    lucro: number;
}

export default function DrePage() {
    const [dates, setDates] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [dre, setDre] = useState<DreData | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const data = await Api.getDre(dates.start, dates.end);
            setDre(data);
        } catch {
            alert('Erro ao gerar DRE. Verifique se seu plano é o Completo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                    <FileText className="text-blue-500" />
                    Relatório DRE
                </h1>
                <p className="text-slate-400">Demonstrativo de Resultados do Exercício.</p>
            </div>

            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-6">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-500">Data Inicial</Label>
                            <Input
                                type="date"
                                value={dates.start}
                                onChange={(e) => setDates({ ...dates, start: e.target.value })}
                                className="bg-slate-800 border-slate-700 text-slate-100"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-500">Data Final</Label>
                            <Input
                                type="date"
                                value={dates.end}
                                onChange={(e) => setDates({ ...dates, end: e.target.value })}
                                className="bg-slate-800 border-slate-700 text-slate-100"
                            />
                        </div>
                        <Button onClick={handleGenerate} className="bg-blue-600 hover:bg-blue-700 px-8" disabled={loading}>
                            {loading ? 'Gerando...' : 'Gerar Relatório'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {dre && (
                <div className="grid lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 bg-slate-900 border-slate-800 overflow-hidden">
                        <CardHeader className="bg-slate-800/50">
                            <CardTitle className="flex justify-between items-center">
                                <span>Resumo Financeiro</span>
                                <span className="text-xs font-normal text-slate-400 flex items-center gap-1">
                                    <Calendar size={12} /> {dre.period.start} até {dre.period.end}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-800">
                                <div className="p-6 flex justify-between items-center">
                                    <span className="text-lg text-slate-300">Total de Receitas</span>
                                    <span className="text-xl font-bold text-emerald-500">R$ {dre.receitas.toFixed(2)}</span>
                                </div>
                                <div className="p-6 flex justify-between items-center">
                                    <span className="text-lg text-slate-300">Total de Despesas</span>
                                    <span className="text-xl font-bold text-red-500">R$ {dre.despesas.toFixed(2)}</span>
                                </div>
                                <div className="p-8 flex justify-between items-center bg-blue-600/10">
                                    <span className="text-xl font-black text-slate-100 uppercase">Lucro Líquido</span>
                                    <span className={cn(
                                        "text-3xl font-black",
                                        dre.lucro >= 0 ? "text-emerald-400" : "text-red-400"
                                    )}>
                                        R$ {dre.lucro.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                        <div className="p-4 bg-slate-800/30 text-center">
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100 italic">
                                <Download size={14} className="mr-2" /> Exportar em PDF
                            </Button>
                        </div>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <PieChart size={120} />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-slate-400 text-sm">Distribuição</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 italic">Receitas</span>
                                    <span className="text-slate-300">100%</span>
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full w-full"></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 italic">Despesas</span>
                                    <span className="text-slate-300">0%</span>
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div className="bg-red-500 h-full w-[1%]"></div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-slate-800 text-center">
                                <p className="text-[10px] text-slate-600 uppercase font-bold">Análise Baseada no Plano Completo</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

function PieChart({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
    );
}

