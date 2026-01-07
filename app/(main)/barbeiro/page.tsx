'use client';

import { useState, useEffect, useCallback } from 'react';
import { Api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { BarberQueueStatus, ClientQueue, QueueStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Play,
    CheckCircle2,
    Clock,
    User,
    AlertCircle,
    Trash2,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { CloseSaleDialog } from '@/components/sales/close-sale-dialog';

import { supabaseClient } from '@/lib/supabase-client';

export default function BarberPage() {
    const [allBarbers, setAllBarbers] = useState<BarberQueueStatus[]>([]);
    const [queue, setQueue] = useState<ClientQueue[]>([]);
    const [currentBarber, setCurrentBarber] = useState<BarberQueueStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [showSaleDialog, setShowSaleDialog] = useState(false);
    const [finishedQueueId, setFinishedQueueId] = useState<string | null>(null);
    const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);

    const { user, role, roles, loading: authLoading } = useAuth();

    const fetchStatus = useCallback(async (idOverride?: string) => {
        try {
            const allQueues = await Api.getQueueStatus();
            setAllBarbers(allQueues);

            const barberIdToFetch = idOverride || selectedBarberId;

            if (barberIdToFetch) {
                const updated = allQueues.find((b: BarberQueueStatus) => b.barber_id === barberIdToFetch);
                if (updated) {
                    setCurrentBarber(updated);
                    setQueue(updated.queue);
                }
            } else if (allQueues.length > 0) {
                // Se ainda estamos carregando o usuário, espera.
                // Isso evita selecionar o primeiro barbeiro da lista (que pode estar offline)
                // enquanto o usuário real (que pode estar online) ainda está sendo carregado.
                if (authLoading && !user) return;

                // Seleção automática
                const myQueue = allQueues.find((b: BarberQueueStatus) => b.user_id === user?.id) || allQueues[0];
                if (myQueue) {
                    setSelectedBarberId(myQueue.barber_id);
                    setCurrentBarber(myQueue);
                    setQueue(myQueue.queue);
                }
            }
        } catch (error) {
            console.error('[FETCH STATUS ERROR]', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id, selectedBarberId, authLoading]);

    // Supabase Realtime: Listen for changes in queue and barbers
    useEffect(() => {
        if (!user) return;

        fetchStatus();

        // Polling fallback (every 15 seconds) to ensure data is always fresh
        const polling = setInterval(() => {
            console.log('[POLLING] Refreshing data...');
            fetchStatus();
        }, 15000);

        const queueChannel = supabaseClient
            .channel('queue_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'client_queue' },
                () => {
                    console.log('[REALTIME] Queue changed, fetching...');
                    fetchStatus();
                }
            )
            .subscribe();

        const barberChannel = supabaseClient
            .channel('barber_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'barbers' },
                () => {
                    console.log('[REALTIME] Barbers changed, fetching...');
                    fetchStatus();
                }
            )
            .subscribe();

        return () => {
            clearInterval(polling);
            supabaseClient.removeChannel(queueChannel);
            supabaseClient.removeChannel(barberChannel);
        };
    }, [user, fetchStatus]);


    const handleUpdateStatus = async (barberId: string, status: string) => {
        // Atualização otimista no estado local para resposta instantânea
        setAllBarbers(prev => prev.map(b =>
            b.barber_id === barberId ? { ...b, status: status as 'available' | 'offline' | 'busy' } : b
        ));

        if (currentBarber?.barber_id === barberId) {
            setCurrentBarber((prev: BarberQueueStatus | null) => prev ? ({ ...prev, status: status as 'available' | 'offline' | 'busy' }) : null);
        }

        try {
            // Se for dono, pode atualizar qualquer uno via API de gerenciamento
            if (role === 'owner') {
                await Api.updateBarber(barberId, { status });
            } else {
                // Se for barbeiro, atualiza o seu próprio
                await Api.updateMyBarberStatus(status);
            }
            // Refresh silencioso
            fetchStatus();
        } catch (err: unknown) {
            const error = err as Error;
            // Exibir apenas a mensagem de erro limpa, sem detalhes técnicos
            const errorMsg = error.message || 'Erro ao atualizar status';
            alert(errorMsg);
            fetchStatus();
        }
    };

    const handleCallNext = async () => {
        if (!currentBarber) return;

        // Optimistic Update: Move next waiting to attending
        const nextClient = waitingClients[0];
        if (nextClient) {
            const updatedQueue = queue.map(q => {
                if (q.id === nextClient.id) return { ...q, status: 'attending' as QueueStatus, started_at: new Date().toISOString() };
                if (q.status === 'attending') return { ...q, status: 'finished' as QueueStatus, finished_at: new Date().toISOString() };
                return q;
            });
            setQueue(updatedQueue.filter(q => q.status !== 'finished')); // Hide finished optimistically
            setCurrentBarber({ ...currentBarber, status: 'busy' });
        }

        try {
            const res = await Api.barberNext(currentBarber.barber_id);
            if (res.message) {
                alert(res.message);
            }
            fetchStatus();
        } catch (err: unknown) {
            const error = err as Error;
            alert(error.message);
            fetchStatus(); // Rollback on error
        }
    };

    const handleFinish = async (id: string) => {
        setFinishedQueueId(id);
        setShowSaleDialog(true);
    };

    const handleStartClient = async (queueId: string) => {
        if (role === 'owner' && currentBarber?.user_id !== user?.id) {
            const barberName = currentBarber?.barber_name || 'outro barbeiro';
            if (!confirm(`ATENÇÃO: Você está iniciando um atendimento em nome de ${barberName}.\n\nO status dele mudará para Ocupado/Atendendo.\nDeseja continuar?`)) {
                return;
            }
        }

        if (attendingClient) {
            if (!confirm(`ATENÇÃO: Já existe um atendimento em andamento (${attendingClient.client_name}).\n\nSe você chamar este novo cliente agora, o atendimento atual será ENCERRADO automaticamente.\n\nTem certeza que deseja fazer isso?`)) {
                return;
            }
        }

        const nextInLine = waitingClients[0];
        if (nextInLine && nextInLine.id !== queueId) {
            const chosenClient = queue.find(q => q.id === queueId);
            if (!confirm(`Você está pulando a vez de ${nextInLine.client_name} para atender ${chosenClient?.client_name || 'outro cliente'}.\n\nIsso pode frustrar o cliente que chegou primeiro.\n\nDeseja continuar com a antecipação?`)) {
                return;
            }
        }

        // Optimistic Update
        if (currentBarber) {
            const updatedQueue = queue.map(q => {
                if (q.id === queueId) return { ...q, status: 'attending' as QueueStatus, started_at: new Date().toISOString() };
                if (q.status === 'attending') return { ...q, status: 'finished' as QueueStatus, finished_at: new Date().toISOString() };
                return q;
            });
            setQueue(updatedQueue.filter(q => q.status !== 'finished'));
            setCurrentBarber({ ...currentBarber, status: 'busy' });
        }

        try {
            await Api.startSpecificClient(queueId);
            fetchStatus();
        } catch (err: unknown) {
            const error = err as Error;
            alert(error.message);
            fetchStatus();
        }
    };

    const handleCancelClient = async (queueId: string, clientName: string) => {
        if (!confirm(`Tem certeza que deseja marcar ${clientName} como AUSENTE/CANCELADO?`)) return;
        try {
            await Api.cancelClient(queueId);
            fetchStatus();
        } catch (err: unknown) {
            const error = err as Error;
            alert(error.message);
        }
    };

    const attendingClient = queue.find(q => q.status === 'attending');
    const waitingClients = queue.filter(q => q.status === 'waiting');

    if (loading) return <div>Carregando fila...</div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100">Sala de Atendimento</h1>
                    <p className="text-slate-400">Gerencie sua fila e seus clientes.</p>
                </div>

                <div className="flex gap-2">
                    {role === 'owner' ? (
                        allBarbers.map(barber => (
                            <div key={barber.barber_id} className="flex flex-col gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedBarberId(barber.barber_id);
                                        setCurrentBarber(barber);
                                        setQueue(barber.queue);
                                    }}
                                    className={cn(
                                        "bg-slate-900 border p-3 rounded-xl flex items-center gap-3 transition-all",
                                        currentBarber?.barber_id === barber.barber_id
                                            ? "border-blue-500 ring-1 ring-blue-500/50 scale-105"
                                            : "border-slate-800 opacity-60 hover:opacity-100"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold border overflow-hidden",
                                        currentBarber?.barber_id === barber.barber_id ? "bg-blue-600 text-white border-blue-400" : "bg-slate-800 text-slate-500 border-slate-700"
                                    )}>
                                        {barber.photo_url ? (
                                            <Image src={barber.photo_url} alt={barber.barber_nickname || barber.barber_name} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                                        ) : (
                                            (barber.barber_nickname || barber.barber_name)?.charAt(0)
                                        )}
                                    </div>
                                    <div className="text-left hidden md:block">
                                        <div className="text-slate-100 text-sm font-bold">{barber.barber_nickname || barber.barber_name}</div>
                                        <div className="flex items-center gap-1">
                                            <span className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                barber.status === 'available' ? "bg-emerald-500 animate-pulse" :
                                                    barber.status === 'busy' ? "bg-yellow-500" : "bg-red-500"
                                            )}></span>
                                            <span className="text-[10px] text-slate-400 uppercase tracking-tighter">
                                                {barber.status === 'available' ? 'Livre' :
                                                    barber.status === 'busy' ? 'Atendendo' : 'Offline'}
                                            </span>
                                        </div>
                                    </div>
                                </button>

                                {currentBarber?.barber_id === barber.barber_id && (
                                    <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg justify-center gap-1 shadow-lg ring-1 ring-slate-800/50 scale-90">
                                        <Button
                                            onClick={() => handleUpdateStatus(barber.barber_id, 'available')}
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "h-7 px-2 rounded font-bold transition-all text-[10px]",
                                                (barber?.status === 'available' || barber?.status === 'busy')
                                                    ? "bg-emerald-500/10 text-emerald-500"
                                                    : "text-slate-500 hover:text-slate-300"
                                            )}
                                        >
                                            Online
                                        </Button>
                                        <Button
                                            onClick={() => handleUpdateStatus(barber.barber_id, 'offline')}
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "h-7 px-2 rounded font-bold transition-all text-[10px]",
                                                barber?.status === 'offline'
                                                    ? "bg-red-500/10 text-red-500"
                                                    : "text-slate-500 hover:text-slate-300"
                                            )}
                                        >
                                            Offline
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 font-bold border border-blue-600/30 overflow-hidden">
                                {currentBarber?.photo_url ? (
                                    <Image src={currentBarber.photo_url} alt={currentBarber.barber_name} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                                ) : (
                                    currentBarber?.barber_name?.charAt(0) || 'B'
                                )}
                            </div>
                            <div>
                                <div className="text-slate-100 font-bold text-sm">{currentBarber?.barber_name}</div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "w-2 h-2 rounded-full",
                                        currentBarber?.status === 'available' ? "bg-emerald-500 animate-pulse" :
                                            currentBarber?.status === 'busy' ? "bg-yellow-500" : "bg-red-500"
                                    )}></span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                        {currentBarber?.status === 'available' ? 'Livre' :
                                            currentBarber?.status === 'busy' ? 'Em Atendimento' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {roles?.includes('barber') && role !== 'owner' && (
                    <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-lg ring-1 ring-slate-800/50">
                        <Button
                            onClick={() => currentBarber && handleUpdateStatus(currentBarber.barber_id, 'available')}
                            variant="ghost"
                            className={cn(
                                "h-9 px-4 rounded-lg font-bold transition-all text-sm",
                                (currentBarber?.status === 'available' || currentBarber?.status === 'busy')
                                    ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20"
                                    : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <span className={cn("w-2 h-2 rounded-full mr-2", (currentBarber?.status === 'available' || currentBarber?.status === 'busy') ? "bg-emerald-500 animate-pulse" : "bg-slate-700")}></span>
                            Online
                        </Button>
                        <Button
                            onClick={() => currentBarber && handleUpdateStatus(currentBarber.barber_id, 'offline')}
                            variant="ghost"
                            className={cn(
                                "h-9 px-4 rounded-lg font-bold transition-all text-sm",
                                currentBarber?.status === 'offline'
                                    ? "bg-red-500/10 text-red-500 ring-1 ring-red-500/20"
                                    : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <span className={cn("w-2 h-2 rounded-full mr-2", currentBarber?.status === 'offline' ? "bg-red-500" : "bg-slate-700")}></span>
                            Offline
                        </Button>
                    </div>
                )}
            </div>

            {currentBarber?.status === 'offline' && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={20} />
                    <p className="text-sm font-bold uppercase tracking-wider">Você está <span className="underline">OFFLINE</span>. Os clientes não podem te escolher na recepção.</p>
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Cliente Atual */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-slate-900 border-blue-500/30 border-2 overflow-hidden">
                        <div className="bg-blue-600/10 p-2 text-center text-[10px] uppercase font-bold tracking-tighter text-blue-500 border-b border-blue-500/20">
                            Atendimento em Curso
                        </div>
                        <CardContent className="p-6 text-center space-y-6">
                            {attendingClient ? (
                                <>
                                    <div className="space-y-4">
                                        <div className="w-24 h-24 bg-slate-800 rounded-full mx-auto flex items-center justify-center text-slate-500 mb-2 border-4 border-blue-500/20 overflow-hidden shadow-xl ring-2 ring-blue-500/10">
                                            {attendingClient.client_photo ? (
                                                <img src={attendingClient.client_photo} alt={attendingClient.client_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={48} />
                                            )}
                                        </div>
                                        <div>
                                            <CardTitle className="text-3xl font-black text-slate-100 uppercase leading-none">{attendingClient.client_name}</CardTitle>
                                            <CardDescription className="text-blue-500 font-bold uppercase tracking-widest text-[10px] mt-2">Atendimento em curso</CardDescription>
                                        </div>
                                        {attendingClient.client_phone && (
                                            <div className="text-slate-400 text-sm font-mono mt-1">
                                                {attendingClient.client_phone}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-center gap-2 text-slate-400 bg-slate-800/50 py-2 rounded-lg">
                                        <Clock size={16} />
                                        <span className="text-sm">Iniciado às {attendingClient.started_at ? new Date(attendingClient.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                    </div>

                                    <Button
                                        className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg font-bold shadow-lg shadow-green-900/20"
                                        onClick={() => handleFinish(attendingClient.id)}
                                    >
                                        <CheckCircle2 className="mr-2" />
                                        Finalizar Atendimento
                                    </Button>
                                </>
                            ) : (
                                <div className="py-6 space-y-4">
                                    {waitingClients.length > 0 ? (
                                        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Sua Próxima Sessão</div>

                                            <div className="relative w-full">
                                                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-20"></div>
                                                <div className="relative flex items-center gap-4 bg-slate-800/80 backdrop-blur-sm p-4 rounded-xl border border-slate-700 w-full shadow-xl">
                                                    <div className="w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg ring-2 ring-indigo-500/30">
                                                        {waitingClients[0].client_name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 text-left min-w-0">
                                                        <div className="text-lg font-black text-slate-100 truncate">{waitingClients[0].client_name}</div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {waitingClients[0].is_priority && (
                                                                <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-[9px] h-4 px-1.5 border-0">PRIORIDADE</Badge>
                                                            )}
                                                            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                                                                <Clock size={10} /> {waitingClients[0].estimated_time_minutes} min est.
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <Button
                                                className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-md font-bold uppercase tracking-widest shadow-lg shadow-blue-900/40 hover:scale-[1.02] transition-all active:scale-95"
                                                onClick={handleCallNext}
                                            >
                                                <Play className="mr-2 fill-current" size={18} />
                                                Chamar Agora
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="text-slate-500 flex flex-col items-center gap-3 py-10 opacity-50">
                                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                                                <User size={32} />
                                            </div>
                                            <p className="font-medium text-sm">Sua fila está vazia.</p>
                                            <p className="text-xs max-w-[200px]">Aguarde novos clientes entrarem na recepção.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-widest text-slate-400">Métricas da Sessão</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Aguardando</span>
                                <span className="text-slate-100 font-bold">{waitingClients.length} pessoas</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Tempo estimado total</span>
                                <span className="text-slate-100 font-bold">{(waitingClients.length * (currentBarber?.avg_time_minutes || 30))} min</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Lista da Fila */}
                <Card className="lg:col-span-2 bg-slate-900 border-slate-800 h-fit">
                    <CardHeader>
                        <CardTitle className="text-slate-100">Lista de Espera</CardTitle>
                        <CardDescription>Clientes que entraram na sua fila hoje.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-800 hover:bg-transparent">
                                    <TableHead className="w-12 text-center text-slate-500">Pos.</TableHead>
                                    <TableHead className="text-slate-400">Cliente</TableHead>
                                    <TableHead className="text-slate-400">Status</TableHead>
                                    <TableHead className="text-right text-slate-400">Espera Est.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {waitingClients.length === 0 && !attendingClient ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-20 text-slate-600">
                                            Sua fila está vazia. Aproveite para descansar!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    queue.map((item, idx) => (
                                        <TableRow key={item.id} className={cn("border-slate-800 py-4", item.status === 'attending' && "bg-blue-600/5")}>
                                            <TableCell className="text-center">
                                                <span className={cn(
                                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mx-auto",
                                                    item.status === 'attending' ? "bg-green-500 text-white" : "bg-slate-800 text-slate-400"
                                                )}>
                                                    {item.status === 'attending' ? <CheckCircle2 size={12} /> : idx + 1}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="font-bold text-slate-100">{item.client_name}</div>
                                                    {item.is_priority && (
                                                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] px-1.5 h-5 hover:bg-amber-500/20">
                                                            PRIORIDADE
                                                        </Badge>
                                                    )}
                                                </div>
                                                {item.client_phone && (
                                                    <div className="text-xs text-slate-500 font-mono">{item.client_phone}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn(
                                                    "capitalize",
                                                    item.status === 'waiting' ? "border-yellow-500/50 text-yellow-500" : "border-green-500/50 text-green-500"
                                                )}>
                                                    {item.status === 'waiting' ? 'Aguardando' : 'Em atendimento'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-slate-400">
                                                {item.status === 'waiting' ? (
                                                    <div className="flex gap-2 justify-end">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleStartClient(item.id)}
                                                            className="h-7 text-[10px] uppercase font-bold bg-blue-600/20 text-blue-500 hover:bg-blue-600 hover:text-white border border-blue-600/50 transition-all"
                                                        >
                                                            <Play size={10} className="mr-1.5" /> Chamar
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleCancelClient(item.id, item.client_name)}
                                                            className="h-7 w-7 p-0 text-slate-500 hover:text-red-500 hover:bg-red-500/10"
                                                            title="Cancelar/Ausente"
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className={item.status === 'attending' ? "text-green-500 font-bold text-xs" : ""}>
                                                        {item.status === 'attending' ? 'EM CURSO' : `${item.estimated_time_minutes} min`}
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>


            {showSaleDialog && finishedQueueId && (
                <CloseSaleDialog
                    isOpen={showSaleDialog}
                    onOpenChange={setShowSaleDialog}
                    queueId={finishedQueueId}
                    onSuccess={() => {
                        setShowSaleDialog(false);
                        fetchStatus();
                    }}
                />
            )}
        </div>
    );
}
