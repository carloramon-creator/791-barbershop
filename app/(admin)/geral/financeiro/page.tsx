'use client';


import { useEffect, useState } from 'react';
import { Api } from '@/lib/api';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Briefcase,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Plus,
    Filter,
    BarChart3,
    PieChart as PieChartIcon,
    Wallet,
    Info,
    Building2,
    CheckCircle2,
    Clock,
    ChevronLeft,
    ChevronRight,
    X,
    Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

import { NewTransactionDialog } from '@/components/admin/finance/NewTransactionDialog';
import { AccountsManager } from '@/components/admin/finance/AccountsManager';
import { CategoriesManager } from '@/components/admin/finance/CategoriesManager';
import { FinancialReports } from '@/components/admin/finance/FinancialReports';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function HoldingFinanceDashboard() {
    const [records, setRecords] = useState<any[]>([]);
    const [allRecords, setAllRecords] = useState<any[]>([]); // Store raw data
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ businessUnit: 'all' });
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);

    // Details Modal State
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [detailsType, setDetailsType] = useState<'revenue' | 'expense' | 'pending' | null>(null);

    useEffect(() => {
        loadData();
    }, [filter.businessUnit]);

    useEffect(() => {
        // Client-side filtering when date changes
        filterRecords();
    }, [selectedDate, allRecords]);

    async function loadData() {
        setLoading(true);
        try {
            // Fetch ALL records for the selected unit, we will filter by date locally for fluidity
            const data = await Api.getSystemFinanceRecords({
                businessUnit: filter.businessUnit
            });
            setAllRecords(data || []);
        } catch (e) {
            console.error('Falha ao carregar financeiro da holding:', e);
        } finally {
            setLoading(false);
        }
    }

    function filterRecords() {
        // Filter logic: show records within the selected month
        const start = startOfMonth(selectedDate);
        const end = endOfMonth(selectedDate);

        const filtered = allRecords.filter(r => {
            // Date parsing safety
            const recordDate = new Date(r.date);
            // Fix timezone offset issue simple check: recordDate string is YYYY-MM-DD
            const rDateStr = r.date.substring(0, 7); // YYYY-MM
            const sDateStr = selectedDate.toISOString().substring(0, 7);

            return rDateStr === sDateStr;
        });

        setRecords(filtered);
    }

    const handleMonthChange = (direction: 'prev' | 'next') => {
        setSelectedDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    };

    const handlePayBill = async (id: string) => {
        if (!confirm('Confirmar pagamento desta conta?')) return;
        try {
            await Api.updateSystemFinanceRecord(id, { status: 'paid' });
            loadData(); // Reload to refresh lists
        } catch (e) {
            alert('Erro ao atualizar');
        }
    };

    // Delete Confirmation State
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean, record: any | null }>({ open: false, record: null });
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteClick = (record: any) => {
        setDeleteDialog({ open: true, record });
    };

    const confirmDelete = async (mode: 'single' | 'all' | 'future') => {
        if (!deleteDialog.record) return;

        setIsDeleting(true);
        try {
            await Api.deleteSystemFinanceRecord(deleteDialog.record.id, mode);
            loadData();
            setDeleteDialog({ open: false, record: null });
        } catch (e) {
            alert('Erro ao excluir');
        } finally {
            setIsDeleting(false);
        }
    };



    const openDetails = (type: 'revenue' | 'expense' | 'pending') => {
        setDetailsType(type);
        setDetailsModalOpen(true);
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    // Cálculos de Totais (Baseado no MÊS SELECIONADO)
    const totalRevenue = records.filter(r => r.type === 'revenue' && r.status === 'paid').reduce((acc, curr) => acc + Number(curr.value), 0);
    const totalExpense = records.filter(r => r.type === 'expense' && r.status === 'paid').reduce((acc, curr) => acc + Number(curr.value), 0);
    const pendingPay = records.filter(r => r.type === 'expense' && r.status === 'pending').reduce((acc, curr) => acc + Number(curr.value), 0);
    const balance = totalRevenue - totalExpense;

    // Dados para Gráfico de Fluxo de Caixa (Diário do Mês)
    // Create array of days in month
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const dayRecords = records.filter(r => r.date === dateStr);
        const dayRevenue = dayRecords.filter(r => r.type === 'revenue').reduce((acc, c) => acc + Number(c.value), 0);
        const dayExpense = dayRecords.filter(r => r.type === 'expense').reduce((acc, c) => acc + Number(c.value), 0);

        return {
            name: String(day),
            receita: dayRevenue,
            despesa: dayExpense
        };
    });

    // Dados para o Gráfico de Pizza (Business Units - Mês Atual)
    const pieData = [
        { name: '791 Barber', value: records.filter(r => r.business_unit === 'barber' && r.type === 'revenue').reduce((acc, c) => acc + Number(c.value), 0) },
        { name: '791 Beauty', value: records.filter(r => r.business_unit === 'beauty' && r.type === 'revenue').reduce((acc, c) => acc + Number(c.value), 0) },
        { name: 'Holding / Freelance', value: records.filter(r => r.business_unit === 'holding' && r.type === 'revenue').reduce((acc, c) => acc + Number(c.value), 0) },
    ].filter(d => d.value > 0);

    // Filered List for Modal
    const modalList = (() => {
        if (!detailsType) return [];
        if (detailsType === 'revenue') return records.filter(r => r.type === 'revenue' && r.status === 'paid');
        if (detailsType === 'expense') return records.filter(r => r.type === 'expense' && r.status === 'paid');
        if (detailsType === 'pending') return records.filter(r => r.type === 'expense' && r.status === 'pending').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return [];
    })();

    const modalTitle = detailsType === 'revenue' ? 'Receitas Recebidas' : detailsType === 'expense' ? 'Despesas Pagas' : 'Contas a Pagar (Pendentes)';

    if (loading && allRecords.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-40 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Carregando financeiro...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <NewTransactionDialog
                open={isNewTransactionOpen}
                onOpenChange={setIsNewTransactionOpen}
                onSuccess={loadData}
            />

            {/* Details Modal */}
            <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
                <DialogContent className="max-w-3xl bg-slate-950 border-slate-800 max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-white uppercase tracking-wider text-sm font-bold flex items-center gap-2">
                            {detailsType === 'pending' && <Clock className="text-amber-500" size={18} />}
                            {detailsType === 'revenue' && <TrendingUp className="text-emerald-500" size={18} />}
                            {detailsType === 'expense' && <TrendingDown className="text-red-500" size={18} />}
                            {modalTitle} - {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 mt-4">
                        {modalList.length === 0 ? (
                            <p className="text-center text-slate-500 py-10 uppercase text-xs font-bold">Nenhum registro encontrado.</p>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {modalList.map(item => (
                                    <div key={item.id} className="py-3 flex items-center justify-between group hover:bg-white/5 px-2 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", item.business_unit === 'barber' ? 'bg-blue-500' : item.business_unit === 'beauty' ? 'bg-pink-500' : 'bg-slate-500')} />
                                            <div>
                                                <p className="text-slate-200 text-xs font-bold uppercase">{item.description}</p>
                                                <p className="text-[10px] text-slate-500">{format(new Date(item.date), 'dd/MM/yyyy')} • {item.category}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={cn("text-xs font-black", item.type === 'revenue' ? 'text-emerald-500' : 'text-red-500')}>
                                                {formatCurrency(item.value)}
                                            </span>
                                            {detailsType === 'pending' && (
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 uppercase font-bold" onClick={() => handlePayBill(item.id)}>
                                                    <CheckCircle2 size={12} className="mr-1" /> Pagar
                                                </Button>
                                            )}
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-600 hover:text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteClick(item)}>
                                                <Trash2 size={12} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal (Spacer) */}
            <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, record: null })}>
                <DialogContent className="max-w-md bg-slate-950 border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-white">Excluir Lançamento</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <p className="text-sm text-slate-400">
                            Como deseja excluir o lançamento <span className="text-white font-bold">{deleteDialog.record?.description}</span>?
                        </p>

                        {deleteDialog.record?.metadata?.recurrence?.id ? (
                            <div className="space-y-2">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
                                    onClick={() => confirmDelete('single')}
                                    disabled={isDeleting}
                                >
                                    Apenas este lançamento
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
                                    onClick={() => confirmDelete('future')}
                                    disabled={isDeleting}
                                >
                                    Este e todos os futuros
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="w-full justify-start text-xs"
                                    onClick={() => confirmDelete('all')}
                                    disabled={isDeleting}
                                >
                                    Todos da série (Passados e Futuros)
                                </Button>
                            </div>
                        ) : (
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setDeleteDialog({ open: false, record: null })}>Cancelar</Button>
                                <Button variant="destructive" onClick={() => confirmDelete('single')} disabled={isDeleting}>Excluir</Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* TABS NAVIGATION */}
            <Tabs defaultValue="dashboard" className="w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 bg-blue-600/10 text-blue-500 text-[9px] font-black uppercase tracking-widest rounded">ERP 791 Soluções</span>
                            <div className="w-1 h-1 bg-slate-800 rounded-full" />
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Holding Intel</span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Gestão Financeira</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <TabsList className="bg-slate-900 border border-slate-800">
                            <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">VISÃO GERAL</TabsTrigger>
                            <TabsTrigger value="config" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">CONFIGURAÇÕES</TabsTrigger>
                        </TabsList>
                    </div>
                </div>

                <TabsContent value="dashboard" className="space-y-6">
                    {/* Header Controls (Month/Filter/New) - MOVED INSIDE DASHBOARD TAB */}
                    <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-3 bg-slate-900/40 p-2 rounded-xl border border-white/5 mb-6">
                        {/* Filtro de Mês */}
                        <div className="flex items-center gap-2">
                            <div className="bg-slate-950 border border-slate-800 rounded-lg p-1 flex items-center shadow-lg">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => handleMonthChange('prev')}>
                                    <ChevronLeft size={16} />
                                </Button>
                                <div className="px-3 text-center min-w-[100px]">
                                    <span className="text-xs font-black text-white uppercase">{format(selectedDate, 'MMM yyyy', { locale: ptBR })}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => handleMonthChange('next')}>
                                    <ChevronRight size={16} />
                                </Button>
                            </div>

                            <select
                                value={filter.businessUnit}
                                onChange={(e) => setFilter({ ...filter, businessUnit: e.target.value })}
                                className="bg-slate-950 border border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600 transition-all h-[38px] shadow-lg"
                            >
                                <option value="all">Todas as Unidades</option>
                                <option value="holding">791 Soluções</option>
                                <option value="barber">791 Barber</option>
                                <option value="beauty">791 Beauty</option>
                            </select>
                        </div>

                        <button
                            onClick={() => setIsNewTransactionOpen(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-900/40 translate-y-0 active:scale-95 h-[38px]"
                        >
                            <Plus size={14} /> Novo Lançamento
                        </button>
                    </div>

                    {/* Cards de Métricas (Clicáveis) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            label="Receita Realizada"
                            value={formatCurrency(totalRevenue)}
                            sub="Total Recebido este mês"
                            icon={TrendingUp}
                            color="text-emerald-500"
                            onClick={() => openDetails('revenue')}
                            hoverable
                        />
                        <MetricCard
                            label="Despesas Pagas"
                            value={formatCurrency(totalExpense)}
                            sub="Custo Operacional este mês"
                            icon={TrendingDown}
                            color="text-red-500"
                            onClick={() => openDetails('expense')}
                            hoverable
                        />
                        <MetricCard
                            label="Contas a Pagar"
                            value={formatCurrency(pendingPay)}
                            sub="Pendente / Provisionado"
                            icon={Clock}
                            color="text-amber-500"
                            onClick={() => openDetails('pending')}
                            hoverable
                            highlight={pendingPay > 0}
                        />
                        <MetricCard
                            label="Resultado (EBITDA)"
                            value={formatCurrency(balance)}
                            sub="Lucro Líquido Mensal"
                            icon={DollarSign}
                            color="text-blue-500"
                            isMain
                        />
                    </div>

                    {/* Gráficos Principais */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2 bg-slate-950/40 border-slate-800 shadow-2xl relative overflow-hidden">
                            <CardHeader className="p-6 border-b border-white/5">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-sm font-black text-white uppercase tracking-tighter">Fluxo de Caixa Diário</CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-bold text-slate-500">Entradas vs Saídas - {format(selectedDate, 'MMMM', { locale: ptBR })}</CardDescription>
                                    </div>
                                    <BarChart3 size={20} className="text-blue-500 opacity-50" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dailyData}>
                                        <defs>
                                            <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorDesp" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#475569"
                                            fontSize={10}
                                            fontWeight="bold"
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#475569"
                                            fontSize={10}
                                            fontWeight="bold"
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `R$ ${val}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                            itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                        />
                                        <Area type="monotone" dataKey="receita" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRec)" strokeWidth={3} />
                                        <Area type="monotone" dataKey="despesa" stroke="#ef4444" fillOpacity={1} fill="url(#colorDesp)" strokeWidth={2} strokeDasharray="5 5" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-950/40 border-slate-800 shadow-2xl overflow-hidden">
                            <CardHeader className="p-6 border-b border-white/5">
                                <CardTitle className="text-sm font-black text-white uppercase tracking-tighter">Mix de Faturamento</CardTitle>
                                <CardDescription className="text-[10px] uppercase font-bold text-slate-500">Distribuição por Unidade</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 h-[300px] flex items-center justify-center">
                                {totalRevenue > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={8}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                align="center"
                                                layout="vertical"
                                                formatter={(value: string) => <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">{value}</span>}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-center text-slate-600">
                                        <PieChartIcon size={40} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-[10px] font-bold uppercase">Sem dados no período</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Lista de Transações Recentes */}
                    <Card className="bg-slate-950/60 border-slate-800 shadow-2xl overflow-hidden">
                        <CardHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-black text-white uppercase tracking-tighter leading-none">Todas as Movimentações do Mês</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-slate-950/40">
                                            <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Unidade</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Descrição</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Data</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest text-center">Status</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest text-right">Valor</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {records.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-10 text-center text-slate-600 font-bold uppercase text-[10px] tracking-widest">Nenhuma movimentação neste mês</td>
                                            </tr>
                                        ) : records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record) => (
                                            <tr key={record.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "w-2 h-2 rounded-full",
                                                            record.business_unit === 'barber' ? 'bg-blue-600' : record.business_unit === 'beauty' ? 'bg-pink-600' : 'bg-slate-600'
                                                        )} />
                                                        <span className="text-[10px] font-black text-white uppercase tracking-tighter">
                                                            {record.business_unit === 'barber' ? '791 Barber' : record.business_unit === 'beauty' ? '791 Beauty' : 'Holding'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-[10px] font-black text-white uppercase tracking-tighter">{record.description}</p>
                                                    <p className="text-[8px] text-zinc-500 font-bold uppercase">{record.category || 'Outros'}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{format(new Date(record.date), 'dd MMM y', { locale: ptBR })}</p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={cn(
                                                        "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border",
                                                        record.status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                    )}>
                                                        {record.status === 'paid' ? 'Pago' : 'Pendente'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <p className={cn(
                                                        "text-[11px] font-black tracking-tight",
                                                        record.type === 'revenue' ? "text-emerald-500" : "text-red-500"
                                                    )}>
                                                        {record.type === 'revenue' ? '+' : '-'} {formatCurrency(record.value)}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {record.status === 'pending' && (
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-500 hover:bg-emerald-500/10" title="Marcar como Pago" onClick={() => handlePayBill(record.id)}>
                                                                <CheckCircle2 size={12} />
                                                            </Button>
                                                        )}
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:bg-red-500/10" title="Excluir" onClick={() => handleDeleteClick(record)}>
                                                            <Trash2 size={12} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* CONFIGURATION TAB (New) */}
                <TabsContent value="config" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <AccountsManager />
                        </div>
                        <div className="space-y-6">
                            <CategoriesManager />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

        </div >
    );
}

function MetricCard({ label, value, sub, icon: Icon, color, trend, isMain = false, onClick, hoverable, highlight }: any) {
    return (
        <Card
            onClick={onClick}
            className={cn(
                "border-slate-800/50 shadow-2xl relative overflow-hidden group transition-all",
                isMain ? "bg-blue-600/5 ring-1 ring-blue-600/20" : "bg-slate-900/40 backdrop-blur-sm",
                hoverable && "cursor-pointer hover:border-slate-600 hover:bg-slate-900/60 active:scale-[0.98]",
                highlight && "ring-1 ring-amber-500/20 bg-amber-500/5"
            )}
        >
            <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <div className={cn("p-2.5 rounded-xl shadow-xl transition-all group-hover:scale-105 bg-slate-950/60 ring-1 ring-white/5", color)}>
                        <Icon size={18} />
                    </div>
                    {trend && (
                        <span className={cn(
                            "text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 bg-zinc-950 ring-1 ring-white/5",
                            trend.startsWith('+') ? "text-emerald-500" : "text-red-500"
                        )}>
                            {trend.startsWith('+') ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {trend}
                        </span>
                    )}
                </div>
                <div className="space-y-0.5">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">{label}</p>
                    <h3 className="text-2xl font-black text-white tracking-tight leading-none">{value}</h3>
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight flex items-center gap-1.5 mt-2 opacity-60">
                        {sub}
                    </p>
                </div>
                {hoverable && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-white/10 p-1 rounded-full"><Plus size={10} className="text-white" /></div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
