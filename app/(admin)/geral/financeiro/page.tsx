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
    Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function HoldingFinanceDashboard() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ businessUnit: 'all', period: 'month' });

    useEffect(() => {
        loadData();
    }, [filter]);

    async function loadData() {
        setLoading(true);
        try {
            const data = await Api.getSystemFinanceRecords({
                businessUnit: filter.businessUnit
            });
            setRecords(data || []);
        } catch (e) {
            console.error('Falha ao carregar financeiro da holding:', e);
        } finally {
            setLoading(false);
        }
    }

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    // Cálculos de Médias e Totais
    const totalRevenue = records.filter(r => r.type === 'revenue' && r.status === 'paid').reduce((acc, curr) => acc + Number(curr.value), 0);
    const totalExpense = records.filter(r => r.type === 'expense' && r.status === 'paid').reduce((acc, curr) => acc + Number(curr.value), 0);
    const pendingPay = records.filter(r => r.type === 'expense' && r.status === 'pending').reduce((acc, curr) => acc + Number(curr.value), 0);
    const balance = totalRevenue - totalExpense;

    // Dados para Gráfico de Área (Faturamento vs Despesa por data)
    const chartData = records.reduce((acc: any[], curr) => {
        const dateStr = format(new Date(curr.date), 'dd/MM');
        const existing = acc.find(item => item.name === dateStr);
        if (existing) {
            if (curr.type === 'revenue') existing.receita += Number(curr.value);
            else existing.despesa += Number(curr.value);
        } else {
            acc.push({
                name: dateStr,
                receita: curr.type === 'revenue' ? Number(curr.value) : 0,
                despesa: curr.type === 'expense' ? Number(curr.value) : 0
            });
        }
        return acc;
    }, []).reverse().slice(-15); // Últimos 15 pontos

    // Dados para o Gráfico de Pizza (Business Units)
    const pieData = [
        { name: '791 Barber', value: records.filter(r => r.business_unit === 'barber' && r.type === 'revenue').reduce((acc, c) => acc + Number(c.value), 0) },
        { name: '791 Beauty', value: records.filter(r => r.business_unit === 'beauty' && r.type === 'revenue').reduce((acc, c) => acc + Number(c.value), 0) },
        { name: 'Holding / Freelance', value: records.filter(r => r.business_unit === 'holding' && r.type === 'revenue').reduce((acc, c) => acc + Number(c.value), 0) },
    ].filter(d => d.value > 0);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-40 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Consolidando faturamento holding...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header / Filtros */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 bg-blue-600/10 text-blue-500 text-[9px] font-black uppercase tracking-widest rounded">ERP 791 Soluções</span>
                        <div className="w-1 h-1 bg-slate-800 rounded-full" />
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Holding Intel</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Gestão Financeira</h1>
                </div>

                <div className="flex flex-wrap gap-2">
                    <select
                        value={filter.businessUnit}
                        onChange={(e) => setFilter({ ...filter, businessUnit: e.target.value })}
                        className="bg-slate-900 border border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                    >
                        <option value="all">Todas as Unidades</option>
                        <option value="holding">791 Soluções</option>
                        <option value="barber">791 Barber</option>
                        <option value="beauty">791 Beauty</option>
                    </select>

                    <button className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-900/40 translate-y-0 active:scale-95">
                        <Plus size={14} /> Novo Lançamento
                    </button>
                </div>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    label="Receita Realizada"
                    value={formatCurrency(totalRevenue)}
                    sub="Total Recebido"
                    icon={TrendingUp}
                    color="text-emerald-500"
                    trend="+12%"
                />
                <MetricCard
                    label="Despesas Pagas"
                    value={formatCurrency(totalExpense)}
                    sub="Custo Operacional"
                    icon={TrendingDown}
                    color="text-red-500"
                    trend="-2%"
                />
                <MetricCard
                    label="Contas a Pagar"
                    value={formatCurrency(pendingPay)}
                    sub="Provisionado"
                    icon={Clock}
                    color="text-amber-500"
                />
                <MetricCard
                    label="EBITDA / Lucro"
                    value={formatCurrency(balance)}
                    sub="Margem de Holding"
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
                                <CardTitle className="text-sm font-black text-white uppercase tracking-tighter">Performance de Fluxo</CardTitle>
                                <CardDescription className="text-[10px] uppercase font-bold text-slate-500">Receita vs Despesa (Últimos 15 lançamentos)</CardDescription>
                            </div>
                            <BarChart3 size={20} className="text-blue-500 opacity-50" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
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
                    </CardContent>
                </Card>
            </div>

            {/* Lista de Transações Recentes */}
            <Card className="bg-slate-950/60 border-slate-800 shadow-2xl overflow-hidden">
                <CardHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-black text-white uppercase tracking-tighter leading-none">Últimas Movimentações</CardTitle>
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
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {records.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center text-slate-600 font-bold uppercase text-[10px] tracking-widest">Nenhuma movimentação localizada</td>
                                    </tr>
                                ) : records.slice(0, 10).map((record) => (
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
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{format(new Date(record.date), 'dd MMM y')}</p>
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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function MetricCard({ label, value, sub, icon: Icon, color, trend, isMain = false }: any) {
    return (
        <Card className={cn(
            "border-slate-800/50 shadow-2xl relative overflow-hidden group transition-all hover:border-slate-700",
            isMain ? "bg-blue-600/5 ring-1 ring-blue-600/20" : "bg-slate-900/40 backdrop-blur-sm"
        )}>
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
            </CardContent>
        </Card>
    );
}
