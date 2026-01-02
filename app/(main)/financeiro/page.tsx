'use client';

import { useState, useEffect } from 'react';
import { Api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, ArrowUpCircle, ArrowDownCircle, PieChart, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function FinanceiroPage() {
    const [sales, setSales] = useState<any[]>([]);
    const [financeRecords, setFinanceRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newExpense, setNewExpense] = useState({
        description: '',
        value: '',
        date: new Date().toISOString().split('T')[0],
        is_recurring: false,
        recurrence_period: 'month',
        recurrence_count: '1'
    });
    const { role } = useAuth();

    const fetchData = async () => {
        try {
            console.log('[FRONTEND] Iniciando coleta de dados financeiros...');
            setLoading(true);
            const [salesData, financeData] = await Promise.all([
                Api.getSales().catch(err => { console.error('Erro Vendas:', err); return []; }),
                Api.getFinanceRecords().catch(err => { console.error('Erro Financeiro:', err); return []; })
            ]);
            setSales(salesData || []);
            setFinanceRecords(financeData || []);
        } catch (err) {
            console.error('Erro ao buscar dados:', err);
        } finally {
            console.log('[FRONTEND] Coleta finalizada.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateExpense = async () => {
        try {
            if (!newExpense.description || !newExpense.value) return alert('Preencha os campos obrigatórios (Descrição e Valor)');

            console.log('[FRONTEND] Criando despesa:', newExpense);
            await Api.createFinanceRecord({
                type: 'expense',
                description: newExpense.description,
                value: parseFloat(newExpense.value),
                date: newExpense.date,
                is_recurring: newExpense.is_recurring,
                recurrence_period: newExpense.is_recurring ? newExpense.recurrence_period : null,
                recurrence_count: newExpense.is_recurring ? parseInt(newExpense.recurrence_count) : 1
            });

            setIsDialogOpen(false);
            setNewExpense({
                description: '',
                value: '',
                date: new Date().toISOString().split('T')[0],
                is_recurring: false,
                recurrence_period: 'month',
                recurrence_count: '1'
            });
            fetchData();
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao criar despesa: ' + (error.message || 'Erro desconhecido'));
        }
    };

    if (role !== 'owner') return <div className="p-8 text-red-500">Acesso restrito ao proprietário.</div>;

    const totalRevenue = sales.reduce((acc, s) => acc + Number(s.total), 0) +
        financeRecords.filter(r => r.type === 'revenue').reduce((acc, r) => acc + Number(r.value), 0);

    const totalExpenses = financeRecords.filter(r => r.type === 'expense').reduce((acc, r) => acc + Number(r.value), 0);

    const netBalance = totalRevenue - totalExpenses;

    // Combinar vendas e registros financeiros para a lista de últimos lançamentos
    const combinedRecords = [
        ...sales.map(s => ({
            id: s.id,
            date: s.created_at,
            description: `Venda #${s.id.slice(-4)}`,
            type: 'revenue',
            method: s.payment_method,
            value: s.total,
            is_recurring: false
        })),
        ...financeRecords.map(r => ({
            id: r.id,
            date: r.date,
            description: r.description,
            type: r.type,
            method: '-',
            value: r.value,
            is_recurring: r.is_recurring
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100">Financeiro</h1>
                    <p className="text-slate-400">Controle suas receitas e despesas.</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={fetchData} variant="outline" className="border-slate-800 text-slate-400">
                        <RefreshCw size={16} className={cn("mr-2", loading && "animate-spin")} />
                        Atualizar
                    </Button>
                    <Button variant="outline" className="border-slate-700 bg-slate-900" asChild>
                        <Link href="/financeiro/dre">
                            <PieChart size={16} className="mr-2" /> DRE
                        </Link>
                    </Button>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-red-600 hover:bg-red-700">
                                <Plus size={16} className="mr-2" /> Nova Despesa
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                            <DialogHeader>
                                <DialogTitle>Lançar Nova Despesa</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Descrição</Label>
                                    <Input
                                        placeholder="Ex: Aluguel, Energia, Produtos"
                                        value={newExpense.description}
                                        onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Valor (R$)</Label>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={newExpense.value}
                                            onChange={e => setNewExpense({ ...newExpense, value: e.target.value })}
                                            className="bg-slate-800 border-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Data</Label>
                                        <Input
                                            type="date"
                                            value={newExpense.date}
                                            onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                                            className="bg-slate-800 border-slate-700"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-800/60">
                                    <div className="flex items-center space-x-3">
                                        <Checkbox
                                            id="recurring"
                                            checked={newExpense.is_recurring}
                                            onCheckedChange={(checked) => setNewExpense({ ...newExpense, is_recurring: !!checked })}
                                        />
                                        <Label htmlFor="recurring" className="text-slate-200 font-medium cursor-pointer">Despesa Recorrente (Repetitiva)?</Label>
                                    </div>

                                    {newExpense.is_recurring && (
                                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-3 duration-300">
                                            <div className="space-y-2">
                                                <Label className="text-slate-400 text-xs uppercase font-bold">Frequência</Label>
                                                <Select
                                                    value={newExpense.recurrence_period}
                                                    onValueChange={(val) => setNewExpense({ ...newExpense, recurrence_period: val })}
                                                >
                                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                                        <SelectValue placeholder="Selecione" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 shadow-xl border-slate-700">
                                                        <SelectItem value="day">Diário</SelectItem>
                                                        <SelectItem value="week">Semanal</SelectItem>
                                                        <SelectItem value="fortnight">Quinzenal</SelectItem>
                                                        <SelectItem value="month">Mensal</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-400 text-xs uppercase font-bold">Quantas Vezes?</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max="48"
                                                    value={newExpense.recurrence_count}
                                                    onChange={e => setNewExpense({ ...newExpense, recurrence_count: e.target.value })}
                                                    className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600"
                                                    placeholder="Ex: 12"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateExpense} className="bg-red-600 hover:bg-red-700 w-full">Salvar Despesa</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-slate-500 font-bold tracking-widest">Receitas Totais</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-emerald-500 flex items-center gap-2">
                            <ArrowUpCircle /> R$ {totalRevenue.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-slate-500 font-bold tracking-widest">Despesas Totais</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-red-500 flex items-center gap-2">
                            <ArrowDownCircle /> R$ {totalExpenses.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-slate-500 font-bold tracking-widest">Saldo Líquido</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-3xl font-black flex items-center gap-2", netBalance >= 0 ? "text-slate-100" : "text-red-400")}>
                            R$ {netBalance.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-slate-100">Últimos Lançamentos</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-800">
                                <TableHead className="text-slate-400">Data</TableHead>
                                <TableHead className="text-slate-400">Descrição</TableHead>
                                <TableHead className="text-slate-400">Método</TableHead>
                                <TableHead className="text-slate-400 text-right">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-10">
                                    <RefreshCw className="animate-spin mx-auto mb-2" />
                                    Carregando...
                                </TableCell></TableRow>
                            ) : combinedRecords.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-600">Nenhum lançamento encontrado.</TableCell></TableRow>
                            ) : combinedRecords.map(r => (
                                <TableRow key={r.id} className="border-slate-800">
                                    <TableCell className="text-slate-400 font-mono text-xs">{new Date(r.date).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell className="text-slate-100 font-medium">
                                        <div className="flex flex-col">
                                            <span>{r.description}</span>
                                            {r.is_recurring && (
                                                <span className="text-[9px] uppercase font-bold text-blue-500 flex items-center gap-1 mt-1">
                                                    <RefreshCw size={8} /> Recorrente
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-slate-800 text-slate-400 border-slate-700 capitalize text-[10px]">
                                            {r.method}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={cn("text-right font-bold", r.type === 'revenue' ? "text-emerald-400" : "text-red-400")}>
                                        {r.type === 'revenue' ? '+' : '-'} R$ {Number(r.value).toFixed(2)}
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
