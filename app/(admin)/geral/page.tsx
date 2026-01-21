'use client';

import { useEffect, useState } from 'react';
import { Api } from '@/lib/api';
import {
    Users,
    Store,
    TrendingUp,
    Scissors,
    ArrowUpRight,
    ArrowDownRight,
    ChevronRight,
    Activity,
    CreditCard,
    Calendar,
    Clock,
    Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [statsData, setStatsData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [tenantsData, globalStats] = await Promise.all([
                    Api.getSystemTenants(),
                    Api.getSystemStats()
                ]);
                setTenants(tenantsData || []);
                setStatsData(globalStats);
            } catch (e) {
                console.error('Error loading admin data:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const mainMetrics = [
        {
            label: `Receita SaaS (${period === 'day' ? 'Hoje' : period === 'week' ? 'Semana' : 'Mês'})`,
            value: formatCurrency(statsData?.revenue?.[period] || 0),
            detail: 'Faturamento',
            icon: TrendingUp,
            color: 'from-blue-600 to-indigo-600',
            bg: 'bg-blue-600/10'
        },
        {
            label: 'Assinaturas Ativas',
            value: statsData?.subscriptions?.active || 0,
            detail: `${tenants.length} Barbearias`,
            icon: CreditCard,
            color: 'from-emerald-600 to-teal-600',
            bg: 'bg-emerald-600/10'
        },
        {
            label: 'Período de Teste',
            value: statsData?.subscriptions?.trials || 0,
            detail: 'Conversão',
            icon: Sparkles,
            color: 'from-amber-500 to-orange-600',
            bg: 'bg-amber-500/10'
        },
        {
            label: 'Usuários Totais',
            value: statsData?.users?.total_registered || 0,
            detail: 'Ecossistema',
            icon: Users,
            color: 'from-purple-600 to-pink-600',
            bg: 'bg-purple-600/10'
        },
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-40 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Acessando Central de Comando...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 bg-blue-600/10 text-blue-500 text-[9px] font-black uppercase tracking-widest rounded">Super Admin</span>
                        <div className="w-1 h-1 bg-slate-800 rounded-full" />
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Platform Core</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Command Center</h1>
                </div>
                <div className="flex gap-1.5 bg-slate-900/50 backdrop-blur-md border border-slate-800 p-1 rounded-lg">
                    {(['day', 'week', 'month'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all",
                                period === p ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            {p === 'day' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {mainMetrics.map((stat) => (
                    <Card key={stat.label} className="bg-slate-900/40 backdrop-blur-sm border-slate-800/50 shadow-2xl relative overflow-hidden group">
                        <div className={cn("absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-5 -mr-12 -mt-12 rounded-full blur-2xl transition-opacity group-hover:opacity-10", stat.color)} />
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div className={cn("p-2.5 rounded-xl shadow-xl transition-all group-hover:scale-105", stat.bg)}>
                                    <stat.icon size={18} className={cn(stat.color.includes('blue') ? 'text-blue-500' : stat.color.includes('emerald') ? 'text-emerald-500' : stat.color.includes('amber') ? 'text-amber-500' : 'text-purple-500')} />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                                <h3 className="text-2xl font-black text-white tracking-tight leading-none">{stat.value}</h3>
                                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight flex items-center gap-1.5 mt-2">
                                    <Activity size={9} className="text-slate-700" /> {stat.detail}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Secondary Intel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 bg-slate-900/60 border-slate-800 shadow-2xl overflow-hidden">
                    <CardHeader className="p-5 border-b border-white/5 bg-slate-950/20">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-sm font-black text-white uppercase tracking-tighter">Fluxo de Caixa</CardTitle>
                                <p className="text-[9px] text-slate-500 font-medium">Performance recorrente.</p>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-blue-500 shadow-inner">
                                <TrendingUp size={18} />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
                            <div className="p-6 transition-colors hover:bg-white/[0.02] group">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                    <Calendar size={10} className="text-blue-500" /> Semana
                                </p>
                                <p className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors leading-none">{formatCurrency(statsData?.revenue?.week || 0)}</p>
                            </div>
                            <div className="p-6 transition-colors hover:bg-white/[0.02] group">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                    <Clock size={10} className="text-purple-500" /> Quinzena
                                </p>
                                <p className="text-2xl font-black text-white group-hover:text-purple-400 transition-colors leading-none">{formatCurrency(statsData?.revenue?.fortnight || 0)}</p>
                            </div>
                            <div className="p-6 transition-colors hover:bg-white/[0.02] group">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                    <Activity size={10} className="text-emerald-500" /> Mês Atual
                                </p>
                                <p className="text-2xl font-black text-white group-hover:text-emerald-400 transition-colors leading-none">{formatCurrency(statsData?.revenue?.month || 0)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/60 border-slate-800 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />
                    <CardHeader className="p-5 border-b border-white/5">
                        <CardTitle className="text-sm font-black text-white uppercase tracking-tighter leading-none">Status de Contas</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div className="space-y-0.5">
                                    <p className="text-xl font-black text-emerald-500 leading-none">{statsData?.subscriptions?.active || 0}</p>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Ativas</p>
                                </div>
                                <div className="space-y-0.5 text-right">
                                    <p className="text-xl font-black text-red-500 leading-none">{statsData?.subscriptions?.inactive || 0}</p>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Inativas</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[8px] font-black uppercase text-slate-500">
                                    <span>Saúde</span>
                                    <span className="text-emerald-500">{Math.round(((statsData?.subscriptions?.active || 0) / (statsData?.subscriptions?.active + statsData?.subscriptions?.inactive || 1)) * 100)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-950 rounded-full flex overflow-hidden ring-1 ring-white/5">
                                    <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all duration-1000" style={{ width: `${(statsData?.subscriptions?.active / (statsData?.subscriptions?.active + statsData?.subscriptions?.inactive + statsData?.subscriptions?.trials || 1)) * 100}%` }} />
                                    <div className="h-full bg-blue-500 opacity-60" style={{ width: `${(statsData?.subscriptions?.trials / (statsData?.subscriptions?.active + statsData?.subscriptions?.inactive + statsData?.subscriptions?.trials || 1)) * 100}%` }} />
                                    <div className="h-full bg-red-500 opacity-40" style={{ width: `${(statsData?.subscriptions?.inactive / (statsData?.subscriptions?.active + statsData?.subscriptions?.inactive + statsData?.subscriptions?.trials || 1)) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Ranking Preview */}
            <Card className="bg-slate-900 border-slate-800 shadow-2xl relative overflow-hidden group">
                <CardHeader className="p-5 flex flex-row items-center justify-between border-b border-white/5 bg-slate-950/10">
                    <div>
                        <CardTitle className="text-sm font-black text-white uppercase tracking-tighter">Top Licenciados</CardTitle>
                    </div>
                    <Link href="/geral/barbearias" className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white text-[8px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 border border-blue-600/20 shadow-lg">
                        Ver Todos <ArrowUpRight size={10} />
                    </Link>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-slate-950/40">
                                    <th className="px-5 py-2.5 text-[8px] font-black uppercase text-slate-500 tracking-widest">Empresa</th>
                                    <th className="px-5 py-2.5 text-[8px] font-black uppercase text-slate-500 tracking-widest text-center">Status</th>
                                    <th className="px-5 py-2.5 text-[8px] font-black uppercase text-slate-500 tracking-widest text-center">Interações</th>
                                    <th className="px-5 py-2.5 text-[8px] font-black uppercase text-slate-500 tracking-widest text-right whitespace-nowrap">Proprietário</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {tenants.slice(0, 5).map((tenant) => (
                                    <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors group/row">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-950 p-1 flex items-center justify-center overflow-hidden border border-white/5 shadow-inner transition-transform group-hover/row:scale-105">
                                                    {tenant.logo_url ? <img src={tenant.logo_url} className="w-full h-full object-cover rounded-md" /> : <Store size={14} className="text-slate-700" />}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-white tracking-tight leading-none mb-0.5">{tenant.name}</p>
                                                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">{tenant.city}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={cn(
                                                "text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border",
                                                (tenant.subscription_status === 'active' || !tenant.subscription_status)
                                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                    : tenant.subscription_status === 'trialing'
                                                        ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                                        : "bg-red-500/10 text-red-500 border-red-500/20"
                                            )}>
                                                {tenant.subscription_status || 'Ativa'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <p className="text-xs font-black text-white leading-none">{tenant.stats?.total_attendances || 0}</p>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <p className="text-[10px] font-black text-slate-300 leading-none">{tenant.owner?.[0]?.name || '---'}</p>
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
