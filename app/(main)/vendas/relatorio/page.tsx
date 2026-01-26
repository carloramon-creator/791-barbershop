'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, DollarSign, FileText, Loader2, Printer } from 'lucide-react';

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

export default function RelatorioVendasPage() {
    const { tenant } = useAuth();
    const [loading, setLoading] = useState(false);
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [relatorio, setRelatorio] = useState<any>(null);

    const gerarRelatorio = async () => {
        // Log para debug
        console.log('Gerando relatório:', { dataInicio, dataFim });

        if (!dataInicio || !dataFim) {
            alert('Selecione o período (Data Início e Data Fim)');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`/api/vendas/relatorio?start=${dataInicio}&end=${dataFim}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao gerar relatório');
            }

            setRelatorio(data);
        } catch (error: any) {
            alert('Erro: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const imprimir = () => {
        window.print();
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tight">Relatório de Vendas</h1>
                    <p className="text-slate-500 font-medium">Análise de vendas por forma de pagamento</p>
                </div>
            </div>

            {/* Filtros */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        Período
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-400 text-xs uppercase font-bold">Data Início</Label>
                            <Input
                                type="date"
                                value={dataInicio}
                                onChange={(e) => setDataInicio(e.target.value)}
                                className="bg-slate-950 border-slate-800 text-slate-100 [color-scheme:dark]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-400 text-xs uppercase font-bold">Data Fim</Label>
                            <Input
                                type="date"
                                value={dataFim}
                                onChange={(e) => setDataFim(e.target.value)}
                                className="bg-slate-950 border-slate-800 text-slate-100 [color-scheme:dark]"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <Button
                                onClick={gerarRelatorio}
                                disabled={loading}
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                <span className="ml-2">Gerar Relatório</span>
                            </Button>
                            {relatorio && (
                                <Button
                                    onClick={imprimir}
                                    variant="outline"
                                    className="border-slate-700 hover:bg-slate-800"
                                >
                                    <Printer className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Relatório */}
            {relatorio && (
                <div className="space-y-6 print:bg-white print:text-black">
                    {/* Lista Detalhada de Transações */}
                    <Card className="bg-slate-900 border-slate-800 print:border print:border-black">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-slate-100 print:text-black">Detalhamento de Vendas</CardTitle>
                            <p className="text-xs text-slate-500 font-bold uppercase">
                                Período: {new Date(dataInicio).toLocaleDateString('pt-BR')} a {new Date(dataFim).toLocaleDateString('pt-BR')}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-800 print:border-black text-left">
                                            <th className="py-3 px-2 text-slate-400 font-bold uppercase text-[10px] print:text-black">Data/Hora</th>
                                            <th className="py-3 px-2 text-slate-400 font-bold uppercase text-[10px] print:text-black">Usuário</th>
                                            <th className="py-3 px-2 text-slate-400 font-bold uppercase text-[10px] print:text-black">Cliente</th>
                                            <th className="py-3 px-2 text-slate-400 font-bold uppercase text-[10px] print:text-black">Forma PGTO</th>
                                            <th className="py-3 px-2 text-right text-slate-400 font-bold uppercase text-[10px] print:text-black text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {relatorio.vendas.map((venda: any) => (
                                            <tr key={venda.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors print:border-gray-200">
                                                <td className="py-3 px-2 text-slate-300 print:text-black text-xs">
                                                    {new Date(venda.created_at).toLocaleString('pt-BR')}
                                                </td>
                                                <td className="py-3 px-2 text-slate-300 print:text-black text-xs font-medium">
                                                    {venda.vendedor?.name || '---'}
                                                </td>
                                                <td className="py-3 px-2 text-slate-300 print:text-black text-xs font-medium">
                                                    {venda.cliente?.name || 'Venda Avulsa'}
                                                </td>
                                                <td className="py-3 px-2 text-slate-400 print:text-black text-[10px] uppercase font-bold">
                                                    {PAYMENT_METHODS[venda.metodo_pagamento as keyof typeof PAYMENT_METHODS] || venda.metodo_pagamento}
                                                </td>
                                                <td className="py-3 px-2 text-right text-emerald-400 print:text-black font-bold">
                                                    {formatCurrency(venda.total)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Resumo por Forma de Pagamento - Agrupado no Final */}
                    <Card className="bg-slate-900 border-slate-800 print:border print:border-black">
                        <CardHeader>
                            <CardTitle className="text-slate-100 print:text-black uppercase text-sm font-black">Resumo de Vendas por Forma de Pagamento</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-800 print:border-black">
                                            <th className="text-left py-3 px-4 text-slate-400 font-bold text-xs uppercase print:text-black">Forma de Pagamento</th>
                                            <th className="text-right py-3 px-4 text-slate-400 font-bold text-xs uppercase print:text-black">Quantidade</th>
                                            <th className="text-right py-3 px-4 text-slate-400 font-bold text-xs uppercase print:text-black">Valor Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {relatorio.resumo.map((item: any) => (
                                            <tr key={item.metodo} className="border-b border-slate-800/50 print:border-gray-300">
                                                <td className="py-3 px-4 text-slate-200 print:text-black">
                                                    {PAYMENT_METHODS[item.metodo as keyof typeof PAYMENT_METHODS] || item.metodo}
                                                </td>
                                                <td className="py-3 px-4 text-right text-slate-200 print:text-black font-bold">
                                                    {item.quantidade}
                                                </td>
                                                <td className="py-3 px-4 text-right text-emerald-400 print:text-black font-bold">
                                                    {formatCurrency(item.total)}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="border-t-2 border-slate-700 print:border-black">
                                            <td className="py-3 px-4 text-slate-100 print:text-black font-black uppercase">TOTAL GERAL</td>
                                            <td className="py-3 px-4 text-right text-slate-100 print:text-black font-black">
                                                {relatorio.totais.quantidade}
                                            </td>
                                            <td className="py-3 px-4 text-right text-emerald-400 print:text-black font-black text-lg">
                                                {formatCurrency(relatorio.totais.valor)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cards de Resumo */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
                        <Card className="bg-slate-900 border-slate-800">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold">Total de Vendas</p>
                                        <p className="text-2xl font-black text-slate-100">{relatorio.totais.quantidade}</p>
                                    </div>
                                    <DollarSign className="w-8 h-8 text-blue-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900 border-slate-800">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold">Valor Total</p>
                                        <p className="text-2xl font-black text-emerald-400">{formatCurrency(relatorio.totais.valor)}</p>
                                    </div>
                                    <DollarSign className="w-8 h-8 text-emerald-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900 border-slate-800">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold">Ticket Médio</p>
                                        <p className="text-2xl font-black text-slate-100">
                                            {formatCurrency(relatorio.totais.valor / relatorio.totais.quantidade || 0)}
                                        </p>
                                    </div>
                                    <DollarSign className="w-8 h-8 text-amber-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {!relatorio && !loading && (
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="py-12">
                        <div className="text-center text-slate-500">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Selecione um período e clique em "Gerar Relatório"</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <style jsx global>{`
                @media print {
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                    .print\\:bg-white { background: white !important; }
                    .print\\:text-black { color: black !important; }
                    .print\\:border { border: 1px solid black !important; }
                    .print\\:border-black { border-color: black !important; }
                }
            `}</style>
        </div>
    );
}
