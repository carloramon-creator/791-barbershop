'use client';

import { useState, useEffect } from 'react';
import { Api } from '@/lib/api';
import { DashboardSummary, BarberQueueStatus } from '@/lib/types';
import { getBusinessTexts } from '@/lib/business-dictionary';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Clock,
    TrendingUp,
    UserCheck as UserCheckIcon
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';
import { HelpTooltip } from '@/components/ui/help-tooltip';

export default function DashboardPage() {
    const { tenant } = useAuth();
    const texts = getBusinessTexts(tenant?.business_type);

    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [queueStatus, setQueueStatus] = useState<BarberQueueStatus[]>([]);
    const [loading, setLoading] = useState(true);

    const [period, setPeriod] = useState<'today' | 'week' | 'fortnight' | 'month'>('today');
    const [periodMetrics, setPeriodMetrics] = useState({
        totalBilling: 0,
        servicesDone: 0,
        avgWaitTime: 0
    });
    const [periodLoading, setPeriodLoading] = useState(false);

    const fetchPeriodMetrics = async (p: string) => {
        setPeriodLoading(true);
        try {
            const data = await Api.getDashboardMetrics(p);
            setPeriodMetrics(data);
        } catch (error) {
            console.error('Error fetching period metrics:', error);
        } finally {
            setPeriodLoading(false);
        }
    };

    useEffect(() => {
        fetchPeriodMetrics(period);
    }, [period]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const sData = await Api.getDashboardSummary();
                if (sData.error) {
                    console.error('[DASHBOARD] API Error:', sData.error);
                }
                setSummary(sData);
                setQueueStatus(sData.queueStatus || []);
            } catch (error: unknown) {
                console.error('[DASHBOARD] Fetch Error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, []);

    const metrics = summary?.metrics || {
        billingToday: 0,
        queueCount: 0,
        avgWaitTime: 0,
        onlineBarbers: 0,
        busyBarbers: 0
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100">Visão Geral</h1>
                    <p className="text-slate-400 font-medium">Acompanhe o movimento do seu estabelecimento.</p>
                </div>

                <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                    {(['week', 'fortnight', 'month'] as const).map((p) => (
                        <Button
                            key={p}
                            variant="ghost"
                            size="sm"
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "rounded-lg px-4 transition-all duration-300",
                                period === p ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            {p === 'week' ? 'Semana' : p === 'fortnight' ? 'Quinzena' : 'Mês'}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Nova linha de métricas por período */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-slate-900 border-slate-800 border-b-2 border-blue-500/50 shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={48} className="text-blue-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold tracking-[0.2em] text-blue-400 flex items-center gap-2">
                            Faturamento ({period === 'week' ? 'Semana' : period === 'fortnight' ? 'Quinzena' : 'Mês'})
                            <HelpTooltip content="Soma de todos os serviços e produtos vendidos no período selecionado." />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-100">
                            {periodLoading ? '...' : periodMetrics.totalBilling.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 border-b-2 border-emerald-500/50 shadow-2xl relative group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <UserCheckIcon size={48} className="text-emerald-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold tracking-[0.2em] text-emerald-400">Atendimentos Concluídos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-100">
                            {periodLoading ? '...' : periodMetrics.servicesDone}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 border-b-2 border-yellow-500/50 shadow-2xl relative group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={48} className="text-yellow-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold tracking-[0.2em] text-yellow-400 flex items-center gap-2">
                            Média de Espera (Real)
                            <HelpTooltip content="Tempo médio real que os clientes esperaram para iniciar o atendimento hoje." />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-100">
                            {periodLoading ? '...' : `${periodMetrics.avgWaitTime} min`}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase font-bold tracking-widest text-slate-500">Total na Fila</CardTitle>
                        <div className="bg-blue-500/10 p-2 rounded-lg">
                            <Users className="h-4 w-4 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-100">{metrics.queueCount}</div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase font-bold tracking-widest text-slate-500">{texts.professionals} Online</CardTitle>
                        <div className="bg-emerald-500/10 p-2 rounded-lg">
                            <UserCheckIcon className="h-4 w-4 text-emerald-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-100">{metrics.onlineBarbers}</div>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">{metrics.busyBarbers} em atendimento</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase font-bold tracking-widest text-slate-500">Espera Média</CardTitle>
                        <div className="bg-yellow-500/10 p-2 rounded-lg">
                            <Clock className="h-4 w-4 text-yellow-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-100">~{metrics.avgWaitTime} <span className="text-sm font-normal text-slate-500">min</span></div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs uppercase font-bold tracking-widest text-slate-500">Faturamento Hoje</CardTitle>
                        <div className="bg-emerald-500/10 p-2 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-100">{metrics.billingToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center gap-2">
                        Status dos {texts.professionals}
                        <HelpTooltip content="Monitoramento em tempo real da disponibilidade e ocupação da sua equipe." />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-transparent">
                                <TableHead className="text-slate-400">{texts.professional}</TableHead>
                                <TableHead className="text-slate-400">Status</TableHead>
                                <TableHead className="text-slate-400">Atendimento</TableHead>
                                <TableHead className="text-slate-400 text-center">Fila</TableHead>
                                <TableHead className="text-slate-400 text-right">Espera Estimada</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                        Carregando dados...
                                    </TableCell>
                                </TableRow>
                            ) : queueStatus.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                        Nenhum {texts.professional.toLowerCase()} cadastrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                queueStatus.map((barber) => (
                                    <TableRow key={barber.barber_id} className={cn("border-slate-800 hover:bg-slate-800/50 transition-colors", barber.is_active === false && "opacity-60")}>
                                        <TableCell className="font-medium text-slate-100">
                                            {barber.barber_nickname || barber.barber_name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={
                                                barber.status === 'available' || barber.status === 'busy'
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/50'
                                                    : 'bg-red-500/10 text-red-500 border-red-500/50'
                                            }>
                                                {barber.status === 'available' || barber.status === 'busy' ? 'Online' : 'Offline'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={
                                                barber.status === 'busy'
                                                    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                    : barber.status === 'available'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
                                                        : 'text-slate-500 border-slate-800'
                                            }>
                                                {barber.status === 'busy' ? 'Atendendo' : barber.status === 'available' ? 'Livre' : '---'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center text-slate-300 font-bold">
                                            {barber.queue.length}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-slate-300">
                                            {barber.total_estimated_wait_minutes} min
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
