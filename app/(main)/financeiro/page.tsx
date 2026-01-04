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
import { Plus, ArrowUpCircle, ArrowDownCircle, PieChart, RefreshCw, Tag, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function FinanceiroPage() {
    const [sales, setSales] = useState<any[]>([]);
    const [financeRecords, setFinanceRecords] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [categoryLoading, setCategoryLoading] = useState(false);

    // New Category Form
    const [newCategoryName, setNewCategoryName] = useState('');

    const [newExpense, setNewExpense] = useState({
        description: '',
        value: '',
        date: new Date().toISOString().split('T')[0],
        category_id: '',
        is_recurring: false,
        recurrence_period: 'month',
        recurrence_count: '1'
    });
    const { role } = useAuth();

    const fetchData = async () => {
        try {
            console.log('[FRONTEND] Iniciando coleta de dados financeiros...');
            setLoading(true);
            const [salesData, financeData, categoriesData] = await Promise.all([
                Api.getSales().catch(err => { console.error('Erro Vendas:', err); return []; }),
                Api.getFinanceRecords().catch(err => { console.error('Erro Financeiro:', err); return []; }),
                Api.getFinanceCategories().catch(err => { console.error('Erro Categorias:', err); return []; })
            ]);
            setSales(salesData || []);
            setFinanceRecords(financeData || []);
            setCategories(categoriesData || []);
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
                category_id: newExpense.category_id || null,
                is_recurring: newExpense.is_recurring,
                recurrence_period: newExpense.is_recurring ? newExpense.recurrence_period : null,
                recurrence_count: newExpense.is_recurring ? parseInt(newExpense.recurrence_count) : 1
            });

            setIsDialogOpen(false);
            setNewExpense({
                description: '',
                value: '',
                date: new Date().toISOString().split('T')[0],
                category_id: '',
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

    const handleCreateCategory = async () => {
        try {
            if (!newCategoryName) return;
            setCategoryLoading(true);
            const cat = await Api.createFinanceCategory({
                name: newCategoryName,
                type: 'expense'
            });
            setCategories(prev => [...prev, cat]);
            setNewExpense(prev => ({ ...prev, category_id: cat.id }));
            setNewCategoryName('');
            setIsCategoryDialogOpen(false);
        } catch (err: any) {
            alert("Erro ao criar categoria: " + err.message);
        } finally {
            setCategoryLoading(false);
        }
    };

    if (role !== 'owner') return <div className="p-8 text-red-500">Acesso restrito ao proprietário.</div>;

    const totalRevenue = sales.reduce((acc, s) => acc + Number(s.total_amount), 0) +
        financeRecords.filter(r => r.type === 'revenue').reduce((acc, r) => acc + Number(r.value), 0);

    const totalExpenses = financeRecords.filter(r => r.type === 'expense').reduce((acc, r) => acc + Number(r.value), 0);

    const netBalance = totalRevenue - totalExpenses;

    const combinedRecords = [
        ...sales.map(s => ({
            id: s.id,
            date: s.created_at,
            description: `Venda #${s.id.slice(-4)}`,
            type: 'revenue',
            method: s.payment_method,
            value: s.total_amount,
            category: 'Vendas',
            is_recurring: false
        })),
        ...financeRecords.map(r => ({
            id: r.id,
            date: r.date,
            description: r.description,
            type: r.type,
            method: '-',
            value: r.value,
            category: r.finance_categories?.name || 'Diversos',
            is_recurring: r.is_recurring
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 italic tracking-tighter">Financeiro</h1>
                    <p className="text-slate-400 font-medium">Controle total de fluxo de caixa e categorias.</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={fetchData} variant="outline" className="border-slate-800 text-slate-400 hover:bg-slate-800">
                        <RefreshCw size={16} className={cn("mr-2", loading && "animate-spin")} />
                        Atualizar
                    </Button>
                    <Button variant="outline" className="border-slate-700 bg-slate-900 hover:bg-slate-800" asChild>
                        <Link href="/financeiro/dre">
                            <PieChart size={16} className="mr-2" /> Visão DRE
                        </Link>
                    </Button>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 px-6">
                                <Plus size={16} className="mr-2" /> Nova Despesa
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-xl italic">Lançar Nova Despesa</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-400 text-xs uppercase font-bold">Título da Despesa</Label>
                                    <Input
                                        placeholder="Ex: Aluguel, Energia, Produtos"
                                        value={newExpense.description}
                                        onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                        className="bg-slate-800 border-slate-700 h-11"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-slate-400 text-xs uppercase font-bold">Categoria</Label>
                                        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-400 hover:text-blue-300">
                                                    + Nova Categoria
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-slate-950 border-slate-800">
                                                <DialogHeader>
                                                    <DialogTitle>Nova Categoria</DialogTitle>
                                                </DialogHeader>
                                                <div className="py-4 space-y-4">
                                                    <Input
                                                        placeholder="Nome da categoria (ex: Fixas)"
                                                        value={newCategoryName}
                                                        onChange={e => setNewCategoryName(e.target.value)}
                                                        className="bg-slate-900 border-slate-800"
                                                    />
                                                    <Button
                                                        onClick={handleCreateCategory}
                                                        disabled={categoryLoading}
                                                        className="w-full bg-blue-600"
                                                    >
                                                        {categoryLoading ? <Loader2 className="animate-spin" /> : "Salvar Categoria"}
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                    <Select
                                        value={newExpense.category_id}
                                        onValueChange={val => setNewExpense({ ...newExpense, category_id: val })}
                                    >
                                        <SelectTrigger className="bg-slate-800 border-slate-700 h-11">
                                            <SelectValue placeholder="Selecione uma categoria..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                            {categories.length === 0 ? (
                                                <SelectItem value="none" disabled>Nenhuma categoria</SelectItem>
                                            ) : (
                                                categories.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-400 text-xs uppercase font-bold">Valor (R$)</Label>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={newExpense.value}
                                            onChange={e => setNewExpense({ ...newExpense, value: e.target.value })}
                                            className="bg-slate-800 border-slate-700 h-11 text-red-400 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-400 text-xs uppercase font-bold">Data</Label>
                                        <Input
                                            type="date"
                                            value={newExpense.date}
                                            onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                                            className="bg-slate-800 border-slate-700 h-11"
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
                                        <Label htmlFor="recurring" className="text-slate-200 font-medium cursor-pointer">Despesa Recorrente?</Label>
                                    </div>

                                    {newExpense.is_recurring && (
                                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-3 duration-300">
                                            <div className="space-y-2">
                                                <Label className="text-slate-400 text-[10px] uppercase font-bold">Frequência</Label>
                                                <Select
                                                    value={newExpense.recurrence_period}
                                                    onValueChange={(val) => setNewExpense({ ...newExpense, recurrence_period: val })}
                                                >
                                                    <SelectTrigger className="bg-slate-800 border-slate-700 h-10">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                                        <SelectItem value="day">Diário</SelectItem>
                                                        <SelectItem value="week">Semanal</SelectItem>
                                                        <SelectItem value="fortnight">Quinzenal</SelectItem>
                                                        <SelectItem value="month">Mensal</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-400 text-[10px] uppercase font-bold">Repetições</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max="48"
                                                    value={newExpense.recurrence_count}
                                                    onChange={e => setNewExpense({ ...newExpense, recurrence_count: e.target.value })}
                                                    className="bg-slate-800 border-slate-700 h-10"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateExpense} className="bg-red-600 hover:bg-red-700 w-full h-12 font-bold uppercase tracking-widest transition-all">Salvar Lançamento</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900 border-slate-800 border-l-4 border-emerald-500 shadow-xl overflow-hidden group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-slate-500 font-bold tracking-widest flex items-center justify-between">
                            Receitas Totais <ArrowUpCircle size={14} className="text-emerald-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-emerald-500 group-hover:scale-105 transition-transform origin-left">
                            {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800 border-l-4 border-red-500 shadow-xl overflow-hidden group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-slate-500 font-bold tracking-widest flex items-center justify-between">
                            Despesas Totais <ArrowDownCircle size={14} className="text-red-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-red-500 group-hover:scale-105 transition-transform origin-left">
                            {totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800 border-l-4 border-blue-500 shadow-xl overflow-hidden group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-slate-500 font-bold tracking-widest flex items-center justify-between">
                            Saldo Líquido <PieChart size={14} className="text-blue-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-3xl font-black group-hover:scale-105 transition-transform origin-left", netBalance >= 0 ? "text-slate-100" : "text-red-400")}>
                            {netBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-slate-900 border-slate-800 shadow-2xl">
                <CardHeader className="border-b border-slate-800/50 bg-slate-800/10">
                    <CardTitle className="text-slate-100 italic tracking-tighter">Fluxo de Caixa Decrescente</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-950/50">
                            <TableRow className="border-slate-800">
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] w-32">Data</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Lançamento / Categoria</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Origem</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-right pr-6">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-20">
                                    <div className="flex flex-col items-center gap-2">
                                        <RefreshCw className="animate-spin text-blue-500 w-8 h-8 opacity-50" />
                                        <span className="text-slate-600 text-sm font-medium">Sincronizando registros...</span>
                                    </div>
                                </TableCell></TableRow>
                            ) : combinedRecords.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-700 italic">Nenhum lançamento encontrado no período atual.</TableCell></TableRow>
                            ) : combinedRecords.map(r => (
                                <TableRow key={r.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors group">
                                    <TableCell className="text-slate-500 font-mono text-[11px] py-4">
                                        {new Date(r.date).toLocaleDateString('pt-BR')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-slate-100 font-bold uppercase tracking-tighter text-sm">{r.description}</span>
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-bold uppercase">
                                                <Tag size={10} className="text-blue-500/50" /> {r.category}
                                            </span>
                                            {r.is_recurring && (
                                                <span className="text-[9px] uppercase font-bold text-blue-400 flex items-center gap-1 mt-1 bg-blue-500/5 w-fit px-1.5 py-0.5 rounded border border-blue-500/10">
                                                    <RefreshCw size={8} className="animate-spin-slow" /> Recorrente
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-slate-800 text-slate-400 border-slate-700 capitalize text-[9px] font-black px-2 py-0.5">
                                            {r.method}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={cn("text-right font-black text-md pr-6", r.type === 'revenue' ? "text-emerald-400" : "text-red-400")}>
                                        {r.type === 'revenue' ? '+' : '-'} {Number(r.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
