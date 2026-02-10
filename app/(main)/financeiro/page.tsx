'use client';

import { useState, useEffect } from 'react';
import { Api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { Sale, FinanceRecord, FinanceCategory } from '@/lib/types';
import { getBusinessTexts } from '@/lib/business-dictionary';
// Ensuring FinanceRecord in types has barber_id. If not, we cast it.
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
import { Plus, ArrowUpCircle, ArrowDownCircle, PieChart, RefreshCw, Tag, Loader2, CheckCircle2, History } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation'; // Added for refresh if needed
import { PaymentDialog } from '@/components/finance/payment-dialog';
import { TransactionDetailsDialog } from '@/components/finance/transaction-details-dialog';

export default function FinanceiroPage() {
    const { tenant } = useAuth();
    const texts = getBusinessTexts(tenant?.business_type);
    // ... existing ...
    const [sales, setSales] = useState<Sale[]>([]);

    // ... existing ...

    const handleRevertClosing = async (financeId: string, barberId: string) => {
        if (!confirm('ATENÇÃO: Deseja realmente reverter este fechamento?\n\nIsso irá:\n1. Apagar este lançamento financeiro.\n2. Marcar as vendas associadas como "Não Pagas".\n3. Permitir que elas sejam incluídas em um novo fechamento.\n\nEsta ação não pode ser desfeita.')) return;

        try {
            setLoading(true);
            // We need to call the DELETE endpoint on the Closing API
            // The route is /api/barbers/[id]/closing?financeId=...
            // If we don't have barberId handy in the row, we might need it.
            // Assuming we added barber_id to the finance record fetch in getFinanceRecords (it usually has it).

            // If barberId is missing from the record, we can try to extract it from description or just pass a known ID if the API supports generic revert.
            // But the API route is nested under /barbers/[id].
            // Let's assume the record has barber_id (it should).
            if (!barberId && !financeId) {
                alert(`Erro: ID do fechamento ou ${texts.professional.toLowerCase()} não encontrado.`);
                return;
            }

            // Try to use a generic ID if barberId is missing, or parse it.
            // Ideally backend route should be /api/closing/[financeId] but we strictly followed instructions to use [id]/closing.
            // Let's rely on the record having it.

            const targetBarberId = barberId || 'unknown';

            await Api.revertBarberClosing(targetBarberId, financeId);

            alert('Fechamento revertido com sucesso!');
            fetchData();
        } catch (err: any) {
            alert(`Erro ao reverter fechamento de ${texts.professional.toLowerCase()}: ` + (err.message || 'Erro desconhecido'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ... existing ...
    const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);
    const [categories, setCategories] = useState<FinanceCategory[]>([]);
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
        recurrence_count: '1',
        is_paid: true
    });
    const [view, setView] = useState<'main' | 'topay'>('main');
    const { role } = useAuth();

    // Payment dialog state
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [selectedRecordForPayment, setSelectedRecordForPayment] = useState<FinanceRecord | null>(null);

    // Transaction details dialog state
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<FinanceRecord | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [salesData, financeData, categoriesData] = await Promise.all([
                Api.getSales().catch(() => []),
                Api.getFinanceRecords().catch(() => []),
                Api.getFinanceCategories().catch(() => [])
            ]);
            setSales(salesData || []);
            setFinanceRecords(financeData || []);
            setCategories(categoriesData || []);
            console.log('[FINANCE DEBUG] Sales:', salesData?.length);
            console.log('[FINANCE DEBUG] Finance Records:', financeData?.length);
            console.log('[FINANCE DEBUG] Categories:', categoriesData?.length);
        } catch (err) {
            console.error('Erro ao buscar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateExpense = async () => {
        try {
            if (!newExpense.description || !newExpense.value) return alert('Preencha os campos obrigatórios (Descrição e Valor)');

            await Api.createFinanceRecord({
                type: 'expense',
                description: newExpense.description,
                value: parseFloat(newExpense.value),
                date: newExpense.date,
                category_id: newExpense.category_id || null,
                is_recurring: newExpense.is_recurring,
                recurrence_period: newExpense.is_recurring ? newExpense.recurrence_period : null,
                recurrence_count: newExpense.is_recurring ? parseInt(newExpense.recurrence_count) : 1,
                is_paid: newExpense.is_paid
            });

            setIsDialogOpen(false);
            setNewExpense({
                description: '',
                value: '',
                date: new Date().toISOString().split('T')[0],
                category_id: '',
                is_recurring: false,
                recurrence_period: 'month',
                recurrence_count: '1',
                is_paid: true
            });
            fetchData();
        } catch (err: unknown) {
            const error = err as Error;
            alert('Erro ao criar despesa: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleConfirmPayment = async (recordId: string, paidDate: string, paidAmount: number) => {
        try {
            // Update backend with payment details
            await Api.updateFinanceRecord(recordId, {
                is_paid: true,
                paid_date: paidDate,
                paid_amount: paidAmount
            });

            // Force a full data refresh to ensure all calculations update
            await fetchData();

            console.log('✅ Despesa marcada como paga!');
        } catch (err: unknown) {
            const error = err as Error;
            alert('Erro ao atualizar status: ' + error.message);
            fetchData();
        }
    };

    const handleUnmarkPaid = async (recordId: string) => {
        if (!confirm('Deseja desmarcar esta despesa como paga?')) return;

        try {
            await Api.updateFinanceRecord(recordId, {
                is_paid: false,
                paid_date: null,
                paid_amount: null
            });

            await fetchData();
            console.log('⚠️ Despesa desmarcada');
        } catch (err: unknown) {
            const error = err as Error;
            alert('Erro ao atualizar status: ' + error.message);
            fetchData();
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
        } catch (err: unknown) {
            const error = err as Error;
            alert("Erro ao criar categoria: " + error.message);
        } finally {
            setCategoryLoading(false);
        }
    };

    if (role !== 'owner') return <div className="p-8 text-red-500">Acesso restrito ao proprietário.</div>;

    // Helper robusto para pegar YYYY-MM-DD local (Brasília)
    const getLocalDateStr = (iso: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        // Ajuste de fuso manual para garantir Brasília (-3h) em qualquer lugar
        const brDate = new Date(d.getTime() - (3 * 60 * 60 * 1000));
        return brDate.toISOString().split('T')[0];
    };

    const todayStr = getLocalDateStr(new Date().toISOString());
    const currentMonth = todayStr.slice(0, 7); // YYYY-MM

    // Total Revenue: Sales (until today) + Finance Revenue (paid OR until today)
    const totalRevenue = sales
        .filter(s => getLocalDateStr(s.created_at) <= todayStr)
        .reduce((acc, s) => acc + Number(s.total_amount), 0) +
        financeRecords
            .filter(r => (r.type === 'revenue' || (r.type as any) === 'income') && (r.is_paid || r.date <= todayStr))
            .reduce((acc, r) => acc + Number(r.value), 0);

    // Total Expenses: ALL paid expenses OR unpaid until today
    const totalExpenses = financeRecords
        .filter(r => r.type === 'expense' && (r.is_paid || r.date <= todayStr))
        .reduce((acc, r) => acc + Number(r.value), 0);

    const netBalance = totalRevenue - totalExpenses;

    type FinanceItem = {
        id: string;
        date: string;
        description: string;
        type: string;
        method: string;
        value: string | number;
        category: string;
        barber: string;
        barber_id?: string;
        is_recurring: boolean;
        is_paid: boolean;
        metadata?: any;
        created_at?: string;
    };

    const filteredRecords: FinanceItem[] = view === 'main'
        ? [
            ...sales.filter(s => getLocalDateStr(s.created_at) <= todayStr).map(s => ({
                id: s.id,
                date: getLocalDateStr(s.created_at),
                created_at: s.created_at,
                description: `Venda #${s.id.slice(-4)}`,
                type: 'revenue',
                method: s.payment_method,
                value: s.total_amount,
                category: 'Vendas',
                barber: s.barbers?.name || '-',
                barber_id: s.barber_id, // Add barber_id
                is_recurring: false,
                is_paid: true
            })),
            ...financeRecords.filter(r => r.is_paid || r.date <= todayStr).map(r => ({
                id: r.id,
                date: r.date,
                created_at: r.created_at,
                description: r.description,
                type: r.type,
                method: '-',
                value: r.value,
                category: r.finance_categories?.name || 'Diversos',
                barber: r.barbers?.name || '-',
                barber_id: r.barber_id,
                is_recurring: !!r.is_recurring,
                is_paid: r.is_paid, // Show actual status
                metadata: r.metadata
            }))
        ].sort((a, b) => (b.created_at || b.date).localeCompare(a.created_at || a.date))
        : financeRecords.filter(r => !r.is_paid && r.type === 'expense').map(r => ({
            id: r.id,
            date: r.date,
            created_at: r.created_at,
            description: r.description,
            type: r.type,
            method: '-',
            value: r.value,
            category: r.finance_categories?.name || 'Diversos',
            barber: r.barbers?.name || '-',
            barber_id: r.barber_id, // Add barber_id
            is_recurring: !!r.is_recurring, // Force boolean
            is_paid: false
        })).sort((a, b) => (a.created_at || a.date).localeCompare(b.created_at || b.date));

    console.log('[FINANCE PAGE] Total finance records:', financeRecords.length);
    console.log('[FINANCE PAGE] Filtered records:', filteredRecords.length);
    console.log('[FINANCE PAGE] View:', view);
    console.log('[FINANCE PAGE] Sample finance:', financeRecords.slice(0, 2));

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tighter">Financeiro</h1>
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
                                <DialogTitle className="text-xl">Lançar Nova Despesa</DialogTitle>
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
                                                    Desfazer
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
                                            id="ispadef"
                                            checked={newExpense.is_paid}
                                            onCheckedChange={(checked) => setNewExpense({ ...newExpense, is_paid: !!checked })}
                                        />
                                        <Label htmlFor="ispadef" className="text-slate-200 font-medium cursor-pointer">Já está pago?</Label>
                                    </div>

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

            <div className="flex gap-4 border-b border-slate-800 pb-4">
                <Button
                    variant={view === 'main' ? 'default' : 'outline'}
                    onClick={() => setView('main')}
                    className={cn(view === 'main' ? "bg-blue-600" : "border-slate-800")}
                >
                    Fluxo Principal (Pagos)
                </Button>
                <Button
                    variant={view === 'topay' ? 'default' : 'outline'}
                    onClick={() => setView('topay')}
                    className={cn(view === 'topay' ? "bg-amber-600" : "border-slate-800")}
                >
                    À Pagar (Pendentes)
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900 border-slate-800 border-l-4 border-emerald-500 shadow-xl overflow-hidden group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-slate-500 font-bold tracking-widest flex items-center justify-between">
                            Receitas (Até Hoje) <ArrowUpCircle size={14} className="text-emerald-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-emerald-500 group-hover:scale-105 transition-transform origin-left">
                            {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>
                <Link href="/financeiro/despesas-pagas" className="block">
                    <Card className="bg-slate-900 border-slate-800 border-l-4 border-red-500 shadow-xl overflow-hidden group hover:border-red-400 hover:shadow-red-500/10 transition-all cursor-pointer">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs uppercase text-slate-500 font-bold tracking-widest flex items-center justify-between">
                                Despesas (Até Hoje) <ArrowDownCircle size={14} className="text-red-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-red-500 group-hover:scale-105 transition-transform origin-left">
                                {totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                            <p className="text-xs text-slate-600 mt-2 group-hover:text-slate-500 transition-colors">
                                Clique para ver detalhes →
                            </p>
                        </CardContent>
                    </Card>
                </Link>
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
                    <CardTitle className="text-slate-100 tracking-tighter">
                        {view === 'main' ? 'Extrato de Lançamentos' : 'Contas à Pagar'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-950/50">
                            <TableRow className="border-slate-800">
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] w-32">Data</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Lançamento / Categoria</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">{texts.professional}</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Método</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Status</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-right pr-6">Valor</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] w-20"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-20">
                                    <div className="flex flex-col items-center gap-2">
                                        <RefreshCw className="animate-spin text-blue-500 w-8 h-8 opacity-50" />
                                        <span className="text-slate-600 text-sm font-medium">Sincronizando registros...</span>
                                    </div>
                                </TableCell></TableRow>
                            ) : filteredRecords.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-20 text-slate-700">Nenhum lançamento encontrado neste filtro.</TableCell></TableRow>
                            ) : filteredRecords.map((r: FinanceItem) => (
                                <TableRow
                                    key={r.id}
                                    className="border-slate-800 hover:bg-slate-800/30 transition-colors group cursor-pointer"
                                    onClick={() => {
                                        const fullRecord = financeRecords.find(fr => fr.id === r.id);
                                        if (fullRecord) {
                                            setSelectedRecordForDetails(fullRecord);
                                            setDetailsDialogOpen(true);
                                        }
                                    }}
                                >
                                    <TableCell className="text-slate-500 font-mono text-[11px] py-4">
                                        {r.date.split('-').reverse().join('/')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-slate-100 font-bold uppercase tracking-tighter text-sm">{r.description}</span>
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-bold uppercase">
                                                <Tag size={10} className="text-blue-500/50" /> {r.category}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{r.barber}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "text-[9px] font-bold uppercase border-slate-800",
                                            (r.method === 'pix' || r.method === 'PIX' || r.metadata?.metodo_pagamento === 'pix') && "text-blue-400 border-blue-500/20 bg-blue-500/5",
                                            (r.method === 'card' || r.method === 'cartao_credito' || r.method === 'cartao_debito' || r.metadata?.metodo_pagamento === 'cartao_credito' || r.metadata?.metodo_pagamento === 'cartao_debito') && "text-purple-400 border-purple-500/20 bg-purple-500/5",
                                            (r.method === 'cash' || r.method === 'dinheiro' || r.metadata?.metodo_pagamento === 'dinheiro') && "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                                        )}>
                                            {r.method === 'pix' || r.method === 'PIX' || r.metadata?.metodo_pagamento === 'pix' ? 'Pix' :
                                                r.method === 'card' || r.method === 'cartao_credito' || r.method === 'cartao_debito' || r.metadata?.metodo_pagamento === 'cartao_credito' || r.metadata?.metodo_pagamento === 'cartao_debito' ? 'Cartão' :
                                                    r.method === 'cash' || r.method === 'dinheiro' || r.metadata?.metodo_pagamento === 'dinheiro' ? 'Dinheiro' : '-'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={cn(
                                            "capitalize text-[9px] font-black px-2 py-0.5",
                                            r.is_paid ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                        )}>
                                            {r.is_paid ? 'Pago' : 'Pendente'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={cn("text-right font-black text-md pr-6", r.type === 'revenue' ? "text-emerald-400" : "text-red-400")}>
                                        {r.type === 'revenue' ? '+' : '-'} {Number(r.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </TableCell>
                                    <TableCell>
                                        {r.type === 'expense' && (
                                            <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                                                {r.description.startsWith('Fechamento') && !r.is_paid && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-all"
                                                        onClick={() => {
                                                            if (confirm(`Deseja reverter este fechamento de ${texts.professional.toLowerCase()}? As vendas voltarão para "não pagas".`)) {
                                                                handleRevertClosing(r.id, r.barber_id || '');
                                                            }
                                                        }}
                                                        title="Reverter Fechamento (Desfazer)"
                                                    >
                                                        <History size={14} className="mr-1" /> Desfazer
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={cn(
                                                        "h-8 px-3 transition-all",
                                                        r.is_paid
                                                            ? "text-slate-500 hover:text-slate-400 hover:bg-slate-800/50"
                                                            : "text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20"
                                                    )}
                                                    onClick={() => {
                                                        if (r.is_paid) {
                                                            handleUnmarkPaid(r.id);
                                                        } else {
                                                            // Find the full record to pass to dialog
                                                            const fullRecord = financeRecords.find(fr => fr.id === r.id);
                                                            if (fullRecord) {
                                                                setSelectedRecordForPayment(fullRecord);
                                                                setPaymentDialogOpen(true);
                                                            }
                                                        }
                                                    }}
                                                    title={r.is_paid ? "Desmarcar como pago" : "Registrar pagamento"}
                                                >
                                                    <CheckCircle2 size={16} className="mr-1" />
                                                    {r.is_paid ? 'Pago' : 'Pagar'}
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Payment Dialog */}
            {selectedRecordForPayment && (
                <PaymentDialog
                    open={paymentDialogOpen}
                    onOpenChange={setPaymentDialogOpen}
                    recordId={selectedRecordForPayment.id}
                    description={selectedRecordForPayment.description}
                    originalValue={selectedRecordForPayment.value}
                    onConfirm={handleConfirmPayment}
                />
            )}

            {/* Transaction Details Dialog */}
            <TransactionDetailsDialog
                open={detailsDialogOpen}
                onOpenChange={setDetailsDialogOpen}
                record={selectedRecordForDetails}
            />
        </div>
    );
}
