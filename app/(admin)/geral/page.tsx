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
    Clock
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

            // Fetch Tenants
            try {
                const tenantsData = await Api.getSystemTenants();
                setTenants(tenantsData || []);
            } catch (e) {
                console.error('Error loading tenants:', e);
            }

            // Fetch Global Stats
            try {
                const globalStats = await Api.getSystemStats();
                setStatsData(globalStats);
            } catch (e) {
                console.error('Error loading stats:', e);
            }

            setLoading(false);
        };
        load();
    }, []);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const mainMetrics = [
        {
            label: `Receita SaaS (${period === 'day' ? 'Hoje' : period === 'week' ? 'Semana' : 'Mês'})`,
            value: formatCurrency(statsData?.revenue?.[period] || 0),
            detail: 'Assinaturas (Stripe/Inter)',
            icon: TrendingUp,
            color: 'blue'
        },
        {
            label: 'Assinaturas Ativas',
            value: statsData?.subscriptions?.active || 0,
            detail: `Inativas: ${statsData?.subscriptions?.inactive || 0}`,
            icon: CreditCard,
            color: 'emerald'
        },
        {
            label: 'Total de Barbearias',
            value: tenants.length,
            detail: `${statsData?.subscriptions?.trials || 0} em período de teste`,
            icon: Store,
            color: 'amber'
        },
        {
            label: 'Usuários Ativos (30d)',
            value: statsData?.users?.total_active || 0,
            detail: `Total: ${statsData?.users?.total_registered || 0}`,
            icon: Users,
            color: 'purple'
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Activity className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-100 tracking-tighter uppercase">Painel de Controle SaaS</h1>
                    <p className="text-slate-500 font-medium">Métricas globais e faturamento da plataforma 791 Barber.</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
                        {(['day', 'week', 'month'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={cn(
                                    "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                    period === p ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                {p === 'day' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {mainMetrics.map((stat) => (
                    <Card key={stat.label} className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden group">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className={cn(
                                    "p-3 rounded-2xl transition-transform group-hover:scale-110 shadow-lg",
                                    stat.color === 'blue' && "bg-blue-600/20 text-blue-500 shadow-blue-500/10",
                                    stat.color === 'purple' && "bg-purple-600/20 text-purple-500 shadow-purple-500/10",
                                    stat.color === 'emerald' && "bg-emerald-600/20 text-emerald-500 shadow-emerald-500/10",
                                    stat.color === 'amber' && "bg-amber-600/20 text-amber-500 shadow-amber-500/10",
                                )}>
                                    <stat.icon size={24} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{stat.label}</p>
                                <h3 className="text-2xl font-black text-slate-100">{stat.value}</h3>
                                <p className="text-[10px] text-slate-600 font-semibold">{stat.detail}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Granular Revenue & Subs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="border-b border-slate-800/50 pb-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-slate-100">Faturamento SaaS Detalhado</CardTitle>
                                <p className="text-xs text-slate-500 font-medium">Performance de assinaturas no período.</p>
                            </div>
                            <TrendingUp className="text-blue-500" size={24} />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                            <div className="p-8 space-y-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={12} className="text-blue-500" /> Esta Semana
                                </p>
                                <p className="text-2xl font-black text-slate-100">{formatCurrency(statsData?.revenue?.week || 0)}</p>
                            </div>
                            <div className="p-8 space-y-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={12} className="text-purple-500" /> Última Quinzena
                                </p>
                                <p className="text-2xl font-black text-slate-100">{formatCurrency(statsData?.revenue?.fortnight || 0)}</p>
                            </div>
                            <div className="p-8 space-y-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <TrendingUp size={12} className="text-emerald-500" /> Este Mês
                                </p>
                                <p className="text-2xl font-black text-slate-100">{formatCurrency(statsData?.revenue?.month || 0)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
                    <CardHeader className="border-b border-slate-800/50">
                        <CardTitle className="text-slate-100">Assinaturas</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-sm font-black text-emerald-500">{statsData?.subscriptions?.active || 0}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Ativas</p>
                                </div>
                                <div>
                                    <p className="text-sm font-black text-red-500">{statsData?.subscriptions?.inactive || 0}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Inativas</p>
                                </div>
                                <div>
                                    <p className="text-sm font-black text-blue-500">{statsData?.subscriptions?.trials || 0}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Tests</p>
                                </div>
                            </div>

                            <div className="w-full h-3 bg-slate-950 rounded-full flex overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${(statsData?.subscriptions?.active / (statsData?.subscriptions?.active + statsData?.subscriptions?.inactive + statsData?.subscriptions?.trials || 1)) * 100}%` }} />
                                <div className="h-full bg-blue-500" style={{ width: `${(statsData?.subscriptions?.trials / (statsData?.subscriptions?.active + statsData?.subscriptions?.inactive + statsData?.subscriptions?.trials || 1)) * 100}%` }} />
                                <div className="h-full bg-red-500" style={{ width: `${(statsData?.subscriptions?.inactive / (statsData?.subscriptions?.active + statsData?.subscriptions?.inactive + statsData?.subscriptions?.trials || 1)) * 100}%` }} />
                            </div>

                            <p className="text-[10px] text-slate-500 text-center font-medium italic">Distribuição de clientes na plataforma.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tenants List Preview */}
            <Card className="bg-slate-900 border-slate-800 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/50 pb-6">
                    <div>
                        <CardTitle className="text-slate-100">Barbearias e Performance</CardTitle>
                        <CardDescription className="text-slate-400">Dados individuais por licenciamento.</CardDescription>
                    </div>
                    <Link href="/geral/barbearias" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2">
                        Ver Barbearias <ChevronRight size={14} />
                    </Link>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-800/20">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Barbearia</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Atendimentos</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Proprietário</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.slice(0, 10).map((tenant) => (
                                    <tr key={tenant.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 p-1 flex items-center justify-center overflow-hidden border border-slate-700">
                                                    {tenant.logo_url ? <img src={tenant.logo_url} className="w-full h-full object-cover rounded-lg" /> : <Store size={16} className="text-slate-600" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-100">{tenant.name}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium uppercase">{tenant.city}, {tenant.state}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter",
                                                tenant.subscription_status === 'active' || !tenant.subscription_status ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                                            )}>
                                                {tenant.subscription_status || 'Ativa'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <p className="text-sm font-black text-slate-200">{tenant.stats?.total_attendances || 0}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-xs font-bold text-slate-400">{tenant.owner?.[0]?.name || 'N/A'}</p>
                                            <p className="text-[10px] text-slate-600 font-medium">{tenant.owner?.[0]?.email || ''}</p>
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
