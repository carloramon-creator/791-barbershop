'use client';

import { useState, useEffect } from 'react';
import { Api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { FinanceRecord, FinanceCategory } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, RefreshCw, Tag, Calendar, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function DespesasPagasPage() {
    const { role } = useAuth();
    const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);
    const [categories, setCategories] = useState<FinanceCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState({
        start: '',
        end: new Date().toISOString().split('T')[0]
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [financeData, categoriesData] = await Promise.all([
                Api.getFinanceRecords().catch(() => []),
                Api.getFinanceCategories().catch(() => [])
            ]);
            setFinanceRecords(financeData || []);
            setCategories(categoriesData || []);
        } catch (err) {
            console.error('Erro ao buscar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (role !== 'owner') return <div className="p-8 text-red-500">Acesso restrito ao proprietário.</div>;

    // Filter only paid expenses
    const paidExpenses = financeRecords
        .filter(r => r.type === 'expense' && r.is_paid)
        .filter(r => {
            if (!dateFilter.start && !dateFilter.end) return true;
            const recordDate = r.date;
            if (dateFilter.start && recordDate < dateFilter.start) return false;
            if (dateFilter.end && recordDate > dateFilter.end) return false;
            return true;
        })
        .sort((a, b) => b.date.localeCompare(a.date));

    const totalPaid = paidExpenses.reduce((acc, r) => acc + Number(r.value), 0);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Link href="/financeiro">
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
                                <ArrowLeft size={16} className="mr-2" /> Voltar
                            </Button>
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tighter">Despesas Pagas</h1>
                    <p className="text-slate-400 font-medium">Histórico completo de todas as despesas pagas</p>
                </div>
                <Button onClick={fetchData} variant="outline" className="border-slate-800 text-slate-400 hover:bg-slate-800">
                    <RefreshCw size={16} className={cn("mr-2", loading && "animate-spin")} />
                    Atualizar
                </Button>
            </div>

            {/* Summary Card */}
            <Card className="bg-gradient-to-br from-red-900/20 to-red-950/10 border-red-500/30 shadow-xl">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase text-red-400 font-bold tracking-widest mb-2">Total de Despesas Pagas</p>
                            <p className="text-4xl font-black text-red-500">
                                {totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                            <p className="text-sm text-slate-400 mt-2">
                                {paidExpenses.length} {paidExpenses.length === 1 ? 'lançamento' : 'lançamentos'}
                            </p>
                        </div>
                        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                            <DollarSign size={40} className="text-red-500" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Date Filters */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                        <Calendar size={16} /> Filtrar por Período
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-slate-500 uppercase font-bold">Data Inicial</label>
                            <Input
                                type="date"
                                value={dateFilter.start}
                                onChange={e => setDateFilter({ ...dateFilter, start: e.target.value })}
                                className="bg-slate-800 border-slate-700"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-slate-500 uppercase font-bold">Data Final</label>
                            <Input
                                type="date"
                                value={dateFilter.end}
                                onChange={e => setDateFilter({ ...dateFilter, end: e.target.value })}
                                className="bg-slate-800 border-slate-700"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Filtrar
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDateFilter({ start: '', end: new Date().toISOString().split('T')[0] })}
                            className="border-slate-700 text-slate-400"
                        >
                            Limpar Filtros
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Expenses Table */}
            <Card className="bg-slate-900 border-slate-800 shadow-2xl">
                <CardHeader className="border-b border-slate-800/50 bg-slate-800/10">
                    <CardTitle className="text-slate-100 tracking-tighter">Histórico de Despesas Pagas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-950/50">
                            <TableRow className="border-slate-800">
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] w-32">Data</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Descrição / Categoria</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Profissional</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Status</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-right pr-6">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20">
                                    <div className="flex flex-col items-center gap-2">
                                        <RefreshCw className="animate-spin text-red-500 w-8 h-8 opacity-50" />
                                        <span className="text-slate-600 text-sm font-medium">Carregando despesas...</span>
                                    </div>
                                </TableCell></TableRow>
                            ) : paidExpenses.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-700">
                                    Nenhuma despesa paga encontrada no período selecionado.
                                </TableCell></TableRow>
                            ) : paidExpenses.map((r) => (
                                <TableRow key={r.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                                    <TableCell className="text-slate-500 font-mono text-[11px] py-4">
                                        {r.date.split('-').reverse().join('/')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-slate-100 font-bold uppercase tracking-tighter text-sm">{r.description}</span>
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-bold uppercase">
                                                <Tag size={10} className="text-red-500/50" /> {r.finance_categories?.name || 'Diversos'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            {r.barbers?.name || '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="capitalize text-[9px] font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                            Pago
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-black text-md pr-6 text-red-400">
                                        - {Number(r.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
