'use client';

import { useState, useEffect } from 'react';
import { Api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Play,
    CheckCircle2,
    Clock,
    User,
    AlertCircle
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { CloseSaleDialog } from '@/components/sales/close-sale-dialog';

export default function BarberPage() {
    const [allBarbers, setAllBarbers] = useState<any[]>([]);
    const [queue, setQueue] = useState<any[]>([]);
    const [currentBarber, setCurrentBarber] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showSaleDialog, setShowSaleDialog] = useState(false);
    const [finishedQueueId, setFinishedQueueId] = useState<string | null>(null);

    const { user, role, roles } = useAuth();

    const fetchStatus = async () => {
        try {
            const allQueues = await Api.getQueueStatus();
            setAllBarbers(allQueues);

            // Se já tivermos um selecionado, atualizar os dados dele
            if (currentBarber) {
                const updated = allQueues.find((b: any) => b.barber_id === currentBarber.barber_id);
                if (updated) {
                    setCurrentBarber(updated);
                    setQueue(updated.queue);
                    return;
                }
            }

            // Se não tiver selecionado (primeiro load)
            // Tentar achar pelo email ou pegar o primeiro disponível
            const myQueue = allQueues.find((b: any) => b.barber_name === user?.email) || allQueues[0];
            if (myQueue) {
                setCurrentBarber(myQueue);
                setQueue(myQueue.queue);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [user, currentBarber?.barber_id]); // Recarregar se o barbeiro selecionado mudar


    const handleCallNext = async () => {
        if (!currentBarber) return;
        try {
            await Api.barberNext(currentBarber.barber_id);
            fetchStatus();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleFinish = async (id: string) => {
        try {
            const res = await Api.finishService(id);
            if (res.canCreateSale) {
                setFinishedQueueId(id);
                setShowSaleDialog(true);
            }
            fetchStatus();
        } catch (error: any) {
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
                    <h1 className="text-3xl font-bold text-slate-100 italic">Sala de Atendimento</h1>
                    <p className="text-slate-400">Gerencie sua fila e seus clientes.</p>
                </div>

                <div className="flex gap-2">
                    {role === 'owner' ? (
                        allBarbers.map(barber => (
                            <button
                                key={barber.barber_id}
                                onClick={() => setCurrentBarber(barber)}
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
                                        <img src={barber.photo_url} alt={barber.barber_name} className="w-full h-full object-cover" />
                                    ) : (
                                        barber.barber_name?.charAt(0)
                                    )}
                                </div>
                                <div className="text-left hidden md:block">
                                    <div className="text-slate-100 text-sm font-bold">{barber.barber_name}</div>
                                    <div className="flex items-center gap-1">
                                        <span className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            barber.status === 'online' ? "bg-emerald-500 animate-pulse" :
                                                barber.status === 'busy' ? "bg-yellow-500" : "bg-red-500"
                                        )}></span>
                                        <span className="text-[10px] text-slate-400 uppercase tracking-tighter">
                                            {barber.status === 'online' ? 'Livre' :
                                                barber.status === 'busy' ? 'Atendendo' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 font-bold border border-blue-600/30 overflow-hidden">
                                {currentBarber?.photo_url ? (
                                    <img src={currentBarber.photo_url} alt={currentBarber.barber_name} className="w-full h-full object-cover" />
                                ) : (
                                    currentBarber?.barber_name?.charAt(0) || 'B'
                                )}
                            </div>
                            <div>
                                <div className="text-slate-100 font-bold text-sm">{currentBarber?.barber_name}</div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "w-2 h-2 rounded-full",
                                        currentBarber?.status === 'online' ? "bg-emerald-500 animate-pulse" :
                                            currentBarber?.status === 'busy' ? "bg-yellow-500" : "bg-red-500"
                                    )}></span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                        {currentBarber?.status === 'online' ? 'Livre' :
                                            currentBarber?.status === 'busy' ? 'Em Atendimento' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {roles?.includes('barber') && (
                    <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-lg ring-1 ring-slate-800/50">
                        <Button
                            onClick={() => Api.updateMyBarberStatus('online').then(fetchStatus)}
                            variant="ghost"
                            className={cn(
                                "h-9 px-4 rounded-lg font-bold transition-all text-sm",
                                (currentBarber?.status === 'online' || currentBarber?.status === 'busy')
                                    ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20"
                                    : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <span className={cn("w-2 h-2 rounded-full mr-2", (currentBarber?.status === 'online' || currentBarber?.status === 'busy') ? "bg-emerald-500 animate-pulse" : "bg-slate-700")}></span>
                            Online
                        </Button>
                        <Button
                            onClick={() => Api.updateMyBarberStatus('offline').then(fetchStatus)}
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
                                    <div className="space-y-2">
                                        <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto flex items-center justify-center text-slate-500 mb-2">
                                            <User size={40} />
                                        </div>
                                        <CardTitle className="text-2xl font-black text-slate-100 uppercase">{attendingClient.client_name}</CardTitle>
                                        <CardDescription className="text-blue-400">Em atendimento agora</CardDescription>
                                        {attendingClient.client_phone && (
                                            <div className="text-slate-400 text-sm font-mono mt-1">
                                                {attendingClient.client_phone}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-center gap-2 text-slate-400 bg-slate-800/50 py-2 rounded-lg">
                                        <Clock size={16} />
                                        <span className="text-sm">Iniciado às {new Date(attendingClient.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
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
                                <div className="py-10 space-y-6">
                                    <div className="text-slate-500 flex flex-col items-center gap-2">
                                        <AlertCircle size={48} className="opacity-20" />
                                        <p>Ninguém sendo atendido agora.</p>
                                    </div>
                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-lg font-bold"
                                        onClick={handleCallNext}
                                        disabled={waitingClients.length === 0}
                                    >
                                        <Play className="mr-2 fill-current" />
                                        Próximo da Fila
                                    </Button>
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
                                                <div className="font-bold text-slate-100">{item.client_name}</div>
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
                                                {item.status === 'attending' ? '---' : `${item.estimated_time_minutes} min`}
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
                />
            )}
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
