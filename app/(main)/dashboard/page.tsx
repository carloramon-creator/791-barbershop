'use client';

import { useState, useEffect } from 'react';
import { Api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function DashboardPage() {
    const [queueStatus, setQueueStatus] = useState<any[]>([]);
    const [metrics, setMetrics] = useState({ billingToday: 0, queueCount: 0, avgWaitTime: 25 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await Api.getDashboardSummary();
                setQueueStatus(data.queueStatus || []);
                setMetrics(data.metrics || { billingToday: 0, queueCount: 0, avgWaitTime: 25, busyBarbers: 0 });
            } catch (error) {
                console.error('Erro ao buscar dados:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 15000); // Aumentado para 15s para reduzir carga
        return () => clearInterval(interval);
    }, []);

    const onlineBarbers = (metrics as any).onlineBarbers || 0;
    const busyBarbers = (metrics as any).busyBarbers || 0;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-100 italic">Visão Geral</h1>
                <p className="text-slate-400 font-medium">Acompanhe o movimento da sua barbearia em tempo real.</p>
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
                        <CardTitle className="text-xs uppercase font-bold tracking-widest text-slate-500">Barbeiros Online</CardTitle>
                        <div className="bg-emerald-500/10 p-2 rounded-lg">
                            <UserCheckIcon className="h-4 w-4 text-emerald-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-100">{onlineBarbers}</div>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">{busyBarbers} em atendimento</p>
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
                    <CardTitle className="text-slate-100">Status dos Barbeiros</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader className="hover:bg-transparent">
                            <TableRow className="border-slate-800 hover:bg-slate-800/50">
                                <TableHead className="text-slate-400">Barbeiro</TableHead>
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
                                        Nenhum barbeiro cadastrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                queueStatus.map((barber) => (
                                    <TableRow key={barber.barber_id} className={cn("border-slate-800 hover:bg-slate-800/50 transition-colors", !barber.is_active && "opacity-60")}>
                                        <TableCell className="font-medium text-slate-100 italic">
                                            {barber.barber_name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={
                                                barber.status === 'online' || barber.status === 'busy'
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/50'
                                                    : 'bg-red-500/10 text-red-500 border-red-500/50'
                                            }>
                                                {barber.status === 'online' || barber.status === 'busy' ? 'Online' : 'Offline'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={
                                                barber.status === 'busy'
                                                    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                    : barber.status === 'online'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
                                                        : 'text-slate-500 border-slate-800'
                                            }>
                                                {barber.status === 'busy' ? 'Atendendo' : barber.status === 'online' ? 'Livre' : '---'}
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
