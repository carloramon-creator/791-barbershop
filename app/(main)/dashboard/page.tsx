'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    const router = useRouter();
    const { tenant, role } = useAuth();
    const texts = getBusinessTexts(tenant?.business_type);

    // -- PERMISSÃO DE ACESSO --
    const permissions = tenant?.settings?.permissions || [];
    const canViewDashboard = role === 'owner' || (permissions.find((p: any) => p.action === 'Ver Dashboard') as any)?.[role as string] !== false;

    const [summary, setSummary] = useState<any>(null);
    const [queueStatus, setQueueStatus] = useState<BarberQueueStatus[]>([]);
    const [loading, setLoading] = useState(true);

    const [period, setPeriod] = useState<'today' | 'week' | 'fortnight' | 'month'>('today');

    useEffect(() => {
        if (!loading && !canViewDashboard) {
            const targetPath = tenant?.business_type === 'barbershop' ? '/barbeiro' : '/vendas';
            router.push(targetPath);
        }
    }, [canViewDashboard, loading, tenant, router]);

    const fetchDashboardData = async () => {
        if (!tenant) return;
        setLoading(true);
        try {
            const [summaryData, queueData] = await Promise.all([
                Api.getDashboardMetrics(period),
                Api.getQueueStatus()
            ]);
            setSummary(summaryData);
            setQueueStatus(queueData);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [tenant, period]);

    if (!canViewDashboard) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
                <div className="bg-red-500/10 p-4 rounded-full">
                    <Users className="w-12 h-12 text-red-500 opacity-50" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-100">Redirecionando...</h2>
                    <p className="text-slate-400 max-w-sm">Você não tem permissão para visualizar o dashboard. Estamos te levando para a área de atendimento.</p>
                </div>
            </div>
        );
    }

    // Adapt data from either getDashboardMetrics or getDashboardSummary
    const billing = summary?.totalBilling ?? 0;
    const servicesCount = summary?.servicesDone ?? 0;
    const waitTime = summary?.avgWaitTime ?? 0;
    // Calculate waiting queue from the fetched queueStatus array if available
    const waitingQueue = queueStatus.reduce((acc, barber) => {
        return acc + (barber.queue?.filter(q => q.status === 'waiting').length || 0);
    }, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                        PAINEL <span className="bg-blue-600 text-white px-2 py-0.5 rounded tracking-normal text-sm font-black">ADMINISTRATIVO</span>
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Acompanhe os principais indicadores em tempo real.</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "text-xs px-3 h-8",
                            period === 'today' ? "bg-slate-800 text-blue-400" : "text-slate-400"
                        )}
                        onClick={() => setPeriod('today')}
                    >
                        Hoje
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "text-xs px-3 h-8",
                            period === 'week' ? "bg-slate-800 text-blue-400" : "text-slate-400"
                        )}
                        onClick={() => setPeriod('week')}
                    >
                        Semana
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "text-xs px-3 h-8",
                            period === 'fortnight' ? "bg-slate-800 text-blue-400" : "text-slate-400"
                        )}
                        onClick={() => setPeriod('fortnight')}
                    >
                        Quinzenal
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "text-xs px-3 h-8",
                            period === 'month' ? "bg-slate-800 text-blue-400" : "text-slate-400"
                        )}
                        onClick={() => setPeriod('month')}
                    >
                        Mês
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-slate-900 border-slate-800 overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={48} className="text-emerald-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            Faturamento Bruto
                            <HelpTooltip content="Total faturado no período selecionado" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {billing.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <UserCheckIcon size={48} className="text-blue-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Atendimentos {period === 'today' ? 'Hoje' : 'no Período'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {servicesCount} <span className="text-xs font-normal text-slate-500">serviços</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={48} className="text-orange-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            Média de Espera
                            <HelpTooltip content="Tempo médio que o cliente aguardou na fila antes do atendimento" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {waitTime} <span className="text-xs font-normal text-slate-500">min</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users size={48} className="text-purple-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Fila Atual
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {waitingQueue} <span className="text-xs font-normal text-slate-500">aguardando</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Real-time Status */}
                <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
                    <CardHeader className="border-b border-slate-800/50">
                        <CardTitle className="text-sm font-bold text-slate-200 flex items-center justify-between uppercase tracking-tighter">
                            Status da Equipe em Tempo Real
                            <HelpTooltip content="Acompanhe o que cada barbeiro está fazendo agora" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-950/30">
                                <TableRow className="border-slate-800/50 hover:bg-transparent">
                                    <TableHead className="text-slate-500 text-[10px] uppercase font-bold py-3">Profissional</TableHead>
                                    <TableHead className="text-slate-500 text-[10px] uppercase font-bold text-center">Status</TableHead>
                                    <TableHead className="text-slate-500 text-[10px] uppercase font-bold text-center">Fila</TableHead>
                                    <TableHead className="text-slate-500 text-[10px] uppercase font-bold text-center">Atendido</TableHead>
                                    <TableHead className="text-slate-500 text-[10px] uppercase font-bold text-right">Média</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {queueStatus.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-slate-500 text-sm">
                                            Nenhum profissional online no momento.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    queueStatus.map((barber) => (
                                        <TableRow key={barber.barber_id} className="border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                                            <TableCell className="py-4">
                                                <div className="font-bold text-slate-200 leading-none">{barber.barber_name}</div>
                                                <div className="text-[10px] text-slate-500 mt-1 uppercase">{texts.professional} Oficial</div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={cn(
                                                    "text-[9px] uppercase font-black tracking-widest px-2 py-0.5 border-none",
                                                    barber.status === 'busy'
                                                        ? "bg-emerald-500/10 text-emerald-500"
                                                        : "bg-blue-500/10 text-blue-400"
                                                )}>
                                                    {barber.status === 'available' ? 'Disponível' : barber.status === 'busy' ? 'Atendendo' : 'Offline'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-slate-300">{barber.queue?.length || 0}</TableCell>
                                            <TableCell className="text-center font-bold text-slate-300">-</TableCell>
                                            <TableCell className="text-right text-xs text-slate-400 font-mono">
                                                {barber.avg_time_minutes} min
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Performance Side Panel or Future Widgets */}
                <div className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 h-full">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-slate-200 uppercase tracking-tighter flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                Meta de Atendimentos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col items-center justify-center py-6">
                                <span className="text-4xl font-black text-white leading-none">
                                    {servicesCount}
                                </span>
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-2">
                                    Total de {texts.services}
                                </span>
                            </div>

                            <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50">
                                <div className="flex justify-between text-[10px] uppercase font-black text-slate-500 mb-2">
                                    <span>Progresso Diário</span>
                                    <span className="text-blue-400">Em tempo real</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 transition-all duration-1000"
                                        style={{ width: `${Math.min((servicesCount / 50) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
