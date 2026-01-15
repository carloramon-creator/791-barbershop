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
    RefreshCw,
    BarChart3,
    Plus,
    FileText
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function BarberPage() {
    const [allBarbers, setAllBarbers] = useState<BarberQueueStatus[]>([]);
    const [queue, setQueue] = useState<ClientQueue[]>([]);
    const [currentBarber, setCurrentBarber] = useState<BarberQueueStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [showSaleDialog, setShowSaleDialog] = useState(false);
    const [finishedQueueId, setFinishedQueueId] = useState<string | null>(null);
    const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
    const [isUnifiedView, setIsUnifiedView] = useState(false);
    const [showWalkInDialog, setShowWalkInDialog] = useState(false);
    const [walkInName, setWalkInName] = useState('');
    const [submittingWalkIn, setSubmittingWalkIn] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [saleDialogMode, setSaleDialogMode] = useState<'finish' | 'draft'>('finish');
    const [currentDraftItems, setCurrentDraftItems] = useState<any[] | undefined>(undefined);

    const { user, role, roles, loading: authLoading } = useAuth();

    // Quando mudar para Visão Geral, limpa o barbeiro selecionado
    useEffect(() => {
        if (isUnifiedView) {
            setSelectedBarberId(null);
            setCurrentBarber(null);
        }
    }, [isUnifiedView]);

    const fetchStatus = useCallback(async (idOverride?: string) => {
        try {
            const allQueues = await Api.getQueueStatus();
            setAllBarbers(allQueues);

            // Se estiver em modo unificado, não selecionamos um barbeiro específico para o contexto do card lateral
            if (isUnifiedView) {
                setLoading(false);
                return;
            }

            const barberIdToFetch = idOverride || selectedBarberId;

            if (barberIdToFetch) {
                const updated = allQueues.find((b: BarberQueueStatus) => b.barber_id === barberIdToFetch);
                if (updated) {
                    setCurrentBarber(updated);
                    setQueue(updated.queue);
                }
            } else if (allQueues.length > 0) {
                if (authLoading && !user) return;

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
    }, [user?.id, selectedBarberId, authLoading, isUnifiedView]);

    // Supabase Realtime
    useEffect(() => {
        if (!user) return;
        fetchStatus();
        const polling = setInterval(() => fetchStatus(), 15000);

        const queueChannel = supabaseClient
            .channel('queue_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'client_queue' }, () => fetchStatus())
            .subscribe();

        const barberChannel = supabaseClient
            .channel('barber_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, () => fetchStatus())
            .subscribe();

        return () => {
            clearInterval(polling);
            supabaseClient.removeChannel(queueChannel);
            supabaseClient.removeChannel(barberChannel);
        };
    }, [user, fetchStatus]);

    const handleUpdateStatus = async (barberId: string, status: string) => {
        try {
            if (role === 'owner') {
                await Api.updateBarber(barberId, { status });
            } else {
                await Api.updateMyBarberStatus(status);
            }
            fetchStatus();
        } catch (err: any) {
            alert(err.message || 'Erro ao atualizar status');
            fetchStatus();
        }
    };

    const handleCallNext = async (barberId?: string) => {
        const targetBarberId = barberId || currentBarber?.barber_id;
        console.log('[DEBUG] handleCallNext START', { targetBarberId, currentBarber });

        if (!targetBarberId) return;

        setActionLoading('next');
        try {
            console.log('[DEBUG] Calling API barberNext...');
            const res = await Api.barberNext(targetBarberId);
            console.log('[DEBUG] API barberNext response:', res);

            if (res.message) alert(res.message);

            console.log('[DEBUG] Fetching status after calling next...');
            await fetchStatus();
            console.log('[DEBUG] Status fetched.');
        } catch (err: any) {
            console.error('[DEBUG] Error calling next:', err);
            alert(err.message);
            await fetchStatus();
        } finally {
            setActionLoading(null);
        }
    };

    const handleOpenSaleDialog = (queueId: string, mode: 'finish' | 'draft', draftItems?: any[]) => {
        setFinishedQueueId(queueId);
        setSaleDialogMode(mode);
        setCurrentDraftItems(draftItems);
        setShowSaleDialog(true);
    };

    const handleFinish = async (id: string, draftItems?: any[]) => {
        handleOpenSaleDialog(id, 'finish', draftItems);
    };

    const handleStartClient = async (queueId: string, barberId?: string) => {
        const bId = barberId || currentBarber?.barber_id;
        const targetBarber = allBarbers.find(b => b.barber_id === bId);

        if (role === 'owner' && targetBarber?.user_id !== user?.id) {
            if (!confirm(`ATENÇÃO: Você está iniciando um atendimento em nome de ${targetBarber?.barber_name}.\nDeseja continuar?`)) {
                return;
            }
        }

        setActionLoading(queueId);
        try {
            await Api.startSpecificClient(queueId);
            await fetchStatus();
        } catch (err: any) {
            alert(err.message);
            await fetchStatus();
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancelClient = async (queueId: string, clientName: string) => {
        if (!confirm(`Tem certeza que deseja marcar ${clientName} como AUSENTE?`)) return;
        try {
            await Api.cancelClient(queueId);
            fetchStatus();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleWalkIn = async () => {
        const targetBarberId = currentBarber?.barber_id;
        if (!targetBarberId) return;

        setSubmittingWalkIn(true);
        try {
            await Api.startWalkIn(targetBarberId, walkInName || 'Cliente Avulso');
            setShowWalkInDialog(false);
            setWalkInName('');
            fetchStatus();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmittingWalkIn(false);
        }
    };

    // Lógica para Visão Unificada
    const unifiedAttending = isUnifiedView
        ? allBarbers.flatMap(b => b.queue.filter(q => q.status?.toLowerCase() === 'attending').map(q => ({ ...q, barber: b })))
        : [];

    const unifiedWaiting = isUnifiedView
        ? allBarbers.flatMap(b => b.queue.filter(q => q.status?.toLowerCase() === 'waiting').map(q => ({ ...q, barber: b })))
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        : [];

    const currentAttending = isUnifiedView ? unifiedAttending : queue.filter(q => q.status?.toLowerCase() === 'attending');
    const currentWaiting = isUnifiedView ? unifiedWaiting : queue.filter(q => q.status?.toLowerCase() === 'waiting');

    if (loading) return (
        <div className="flex items-center justify-center p-20">
            <RefreshCw className="animate-spin text-blue-500 mr-3" />
            <span className="font-bold text-slate-500 uppercase tracking-widest text-xs">Carregando Sala de Atendimento...</span>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-100 uppercase">
                        {isUnifiedView ? 'Monitoramento Global' : 'Sala de Atendimento'}
                    </h1>
                    <p className="text-slate-400 font-medium">
                        {isUnifiedView ? 'Visão em tempo real de todas as filas da barbearia.' : 'Gerencie sua fila e seus clientes.'}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {role === 'owner' && (
                        <>
                            <Button
                                variant={isUnifiedView ? 'default' : 'outline'}
                                onClick={() => setIsUnifiedView(!isUnifiedView)}
                                className={cn(
                                    "h-14 px-6 rounded-xl font-black uppercase tracking-widest transition-all",
                                    isUnifiedView ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/50" : "border-slate-800 text-slate-400 hover:bg-slate-800"
                                )}
                            >
                                {isUnifiedView ? <CheckCircle2 className="mr-2" /> : <BarChart3 className="mr-2" />}
                                Visão Geral
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => fetchStatus()}
                                className="h-14 w-14 rounded-xl border-slate-800 text-slate-500 hover:text-white transition-all flex items-center justify-center p-0"
                                title="Atualizar Fila Manualmente"
                            >
                                <RefreshCw className={cn(loading && "animate-spin")} size={20} />
                            </Button>
                        </>
                    )}

                    {!isUnifiedView && role === 'owner' && (
                        <div className="flex items-center gap-3">
                            <div className="flex gap-2 bg-slate-900/50 p-1 rounded-2xl border border-slate-800">
                                {allBarbers.map(barber => (
                                    <button
                                        key={barber.barber_id}
                                        onClick={() => {
                                            setSelectedBarberId(barber.barber_id);
                                            setCurrentBarber(barber);
                                            setQueue(barber.queue);
                                        }}
                                        className={cn(
                                            "relative p-2 rounded-xl flex flex-col items-center gap-1 transition-all min-w-[70px]",
                                            currentBarber?.barber_id === barber.barber_id
                                                ? "bg-slate-800 text-white shadow-inner ring-1 ring-blue-500/50"
                                                : "text-slate-500 hover:text-slate-300"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-transform duration-300 relative",
                                            currentBarber?.barber_id === barber.barber_id ? "border-blue-500 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "border-slate-700 opacity-60"
                                        )}>
                                            {barber.photo_url ? (
                                                <Image src={barber.photo_url} alt={barber.barber_name} width={40} height={40} className="w-full h-full rounded-full object-cover" unoptimized />
                                            ) : (
                                                (barber.barber_nickname || barber.barber_name)?.charAt(0)
                                            )}
                                            {/* Status indicator on avatar */}
                                            <div className={cn(
                                                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900",
                                                barber.status === 'available' ? "bg-emerald-500" : "bg-slate-500"
                                            )} />
                                        </div>
                                        <span className="text-[9px] font-black uppercase truncate w-full text-center">
                                            {barber.barber_nickname || barber.barber_name.split(' ')[0]}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Status Toggle for Selected Barber */}
                            {currentBarber && (
                                <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 h-14 items-center px-2 gap-2">
                                    <div className="flex flex-col mr-2">
                                        <span className="text-[8px] font-black text-slate-500 uppercase leading-none">Status</span>
                                        <span className={cn(
                                            "text-[10px] font-black uppercase",
                                            currentBarber.status === 'available' ? "text-emerald-500" : "text-slate-400"
                                        )}>
                                            {currentBarber.status === 'available' ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant={currentBarber.status === 'available' ? 'default' : 'outline'}
                                        onClick={() => handleUpdateStatus(currentBarber.barber_id, currentBarber.status === 'available' ? 'offline' : 'available')}
                                        className={cn(
                                            "h-10 px-4 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all",
                                            currentBarber.status === 'available'
                                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                : "border-slate-700 text-slate-500 hover:bg-slate-800"
                                        )}
                                    >
                                        {currentBarber.status === 'available' ? 'Ficar Offline' : 'Ficar Online'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Em Curso</h2>
                            <Badge variant="outline" className="text-blue-500 border-blue-500/30 bg-blue-500/5">{currentAttending.length}</Badge>
                        </div>

                        {currentAttending.length > 0 ? (
                            <div className="space-y-4">
                                {currentAttending.map((client: any) => (
                                    <Card key={client.id} className="bg-slate-900 border-blue-500/30 border-2 overflow-hidden shadow-2xl relative group">
                                        <CardContent className="p-6 text-center space-y-4">
                                            {isUnifiedView && client.barber && (
                                                <div className="absolute top-3 right-3 flex items-center gap-2 bg-slate-800/80 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-700">
                                                    <div className="w-4 h-4 rounded-full border border-blue-500/50 overflow-hidden">
                                                        <img src={client.barber.photo_url || ''} className="w-full h-full object-cover" />
                                                    </div>
                                                    <span className="text-[8px] font-black text-slate-300 uppercase">{client.barber.barber_nickname || client.barber.barber_name}</span>
                                                </div>
                                            )}

                                            <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto flex items-center justify-center text-slate-500 border-4 border-blue-500/20 overflow-hidden shadow-xl group-hover:scale-105 transition-transform">
                                                {client.client_photo ? (
                                                    <img src={client.client_photo} alt={client.client_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={40} />
                                                )}
                                            </div>

                                            <div>
                                                <CardTitle className="text-xl font-black text-slate-100 uppercase truncate px-2">{client.client_name}</CardTitle>
                                                <div className="flex items-center justify-center gap-2 mt-2">
                                                    <Clock size={12} className="text-blue-500" />
                                                    <span className="text-[10px] text-slate-500 font-bold">Iniciado às {new Date(client.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 h-14 border-slate-700 hover:bg-slate-800 text-slate-300 font-bold uppercase"
                                                    onClick={() => handleOpenSaleDialog(client.id, 'draft', client.draft_items)}
                                                >
                                                    <FileText className="mr-2" size={18} />
                                                    Comanda
                                                </Button>
                                                <Button
                                                    className="flex-[2] bg-emerald-600 hover:bg-emerald-700 h-14 text-sm font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20"
                                                    onClick={() => handleFinish(client.id, client.draft_items)}
                                                >
                                                    Finalizar
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="bg-slate-900/50 border-slate-800/50 border-dashed border-2 p-10 flex flex-col items-center justify-center text-center opacity-40">
                                <User size={40} className="text-slate-600 mb-2" />
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ninguém agora</p>
                            </Card>
                        )}

                        {!isUnifiedView && (
                            <div className="pt-4 space-y-3">
                                {currentWaiting.length > 0 && currentAttending.length === 0 && (
                                    <Card className="bg-slate-900 border-blue-500/30 border-2 overflow-hidden shadow-xl mb-4 relative">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
                                        <CardContent className="p-6 text-center space-y-4">
                                            <div className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Próximo da Fila</div>

                                            <div className="w-24 h-24 bg-slate-800 rounded-full mx-auto flex items-center justify-center text-slate-500 border-4 border-blue-500/20 overflow-hidden shadow-xl">
                                                {currentWaiting[0]?.client_photo ? (
                                                    <img src={currentWaiting[0].client_photo} alt={currentWaiting[0].client_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={48} />
                                                )}
                                            </div>

                                            <div>
                                                <CardTitle className="text-2xl font-black text-slate-100 uppercase truncate px-2">{currentWaiting[0]?.client_name}</CardTitle>
                                                {currentWaiting[0]?.client_phone && (
                                                    <div className="text-xs text-slate-500 font-mono mt-1">{currentWaiting[0].client_phone}</div>
                                                )}
                                            </div>

                                            <Button
                                                className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-md font-black uppercase tracking-widest shadow-lg shadow-blue-900/40 mt-2"
                                                onClick={() => handleCallNext()}
                                                disabled={actionLoading === 'next'}
                                            >
                                                {actionLoading === 'next' ? (
                                                    <RefreshCw className="animate-spin" size={20} />
                                                ) : (
                                                    <>
                                                        <Play className="mr-2 fill-current" size={20} />
                                                        Chamar Agora
                                                    </>
                                                )}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}

                                {currentAttending.length === 0 && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowWalkInDialog(true)}
                                        className={cn(
                                            "w-full font-black uppercase tracking-widest transition-all",
                                            currentWaiting.length === 0
                                                ? "h-16 bg-emerald-600/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-600 hover:text-white"
                                                : "h-12 border-slate-800 text-slate-500 hover:bg-slate-800"
                                        )}
                                    >
                                        <Plus className="mr-2" size={currentWaiting.length === 0 ? 20 : 16} />
                                        Atendimento Direto
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <Card className="lg:col-span-2 bg-slate-900 border-slate-800 shadow-2xl overflow-hidden">
                    <CardHeader className="border-b border-slate-800/50 bg-slate-900/50">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl font-black text-slate-100 uppercase leading-none">Lista de Espera</CardTitle>
                                <CardDescription className="text-slate-500 text-xs mt-1 font-medium">Fila completa em tempo real.</CardDescription>
                            </div>
                            {isUnifiedView && <Badge className="bg-blue-600 text-white font-black px-3 py-1">TOTAL: {currentWaiting.length}</Badge>}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-800 hover:bg-transparent bg-slate-950/20">
                                    <TableHead className="w-16 text-center text-slate-600 text-[10px] font-black uppercase">#</TableHead>
                                    <TableHead className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Cliente</TableHead>
                                    {isUnifiedView && <TableHead className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Barbeiro</TableHead>}
                                    <TableHead className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Estado</TableHead>
                                    <TableHead className="text-right text-slate-500 text-[10px] font-black uppercase tracking-widest">Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentWaiting.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={isUnifiedView ? 5 : 4} className="text-center py-20">
                                            <div className="flex flex-col items-center opacity-30">
                                                <RefreshCw className="w-10 h-10 mb-4 text-slate-500" />
                                                <p className="font-black text-sm uppercase tracking-widest">Fila vazia</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    currentWaiting.map((item: any, idx) => (
                                        <TableRow key={item.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                                            <TableCell className="text-center">
                                                <span className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500 mx-auto group-hover:border-blue-500/30 group-hover:text-blue-500 transition-colors">
                                                    {idx + 1}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden relative shrink-0">
                                                        {item.client_photo ? (
                                                            <img src={item.client_photo} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-5 h-5 text-slate-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-100 uppercase text-sm tracking-tight">{item.client_name}</span>
                                                        <span className="text-[10px] text-slate-500 font-mono">{item.client_phone || 'Sem telefone'}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            {isUnifiedView && (
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden">
                                                            {item.barber?.photo_url ? (
                                                                <img src={item.barber.photo_url} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-[10px] text-slate-500">{item.barber?.barber_name?.charAt(0)}</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-300 uppercase">{item.barber?.barber_nickname || item.barber?.barber_name}</span>
                                                    </div>
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {item.is_priority && (
                                                        <div className="bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[8px] px-2 py-0.5 rounded-full font-black animate-pulse">
                                                            PRIO
                                                        </div>
                                                    )}
                                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                                    <span className="text-[10px] font-black text-yellow-500/80 uppercase">Fila</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleStartClient(item.id, item.barber_id)}
                                                        disabled={actionLoading === item.id}
                                                        className="h-8 bg-blue-600/10 text-blue-500 border border-blue-500/30 hover:bg-blue-600 hover:text-white font-black text-[10px] uppercase px-4 rounded-lg transform active:scale-95 transition-all"
                                                    >
                                                        {actionLoading === item.id ? <RefreshCw className="animate-spin" size={12} /> : 'Chamar'}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenSaleDialog(item.id, 'draft', item.draft_items)}
                                                        className="h-8 w-8 p-0 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"
                                                        title="Abrir Comanda"
                                                    >
                                                        <FileText size={14} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleCancelClient(item.id, item.client_name)}
                                                        className="h-8 w-8 p-0 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {showWalkInDialog && (
                <Dialog open={showWalkInDialog} onOpenChange={setShowWalkInDialog}>
                    <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                        <DialogHeader>
                            <DialogTitle className="uppercase font-black">Atendimento Direto</DialogTitle>
                            <DialogDescription>Inicie um atendimento agora para um cliente que já está na cadeira.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label>Nome do Cliente (Opcional)</Label>
                                <Input
                                    placeholder="Ex: Cliente Avulso"
                                    className="bg-slate-950 border-slate-800"
                                    value={walkInName}
                                    onChange={e => setWalkInName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setShowWalkInDialog(false)}>Cancelar</Button>
                            <Button
                                onClick={handleWalkIn}
                                disabled={submittingWalkIn}
                                className="bg-blue-600 hover:bg-blue-700 font-black uppercase"
                            >
                                {submittingWalkIn ? 'Iniciando...' : 'Começar Agora'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {showSaleDialog && finishedQueueId && (
                <CloseSaleDialog
                    isOpen={showSaleDialog}
                    onOpenChange={setShowSaleDialog}
                    queueId={finishedQueueId}
                    mode={saleDialogMode}
                    initialDraftItems={currentDraftItems}
                    onSuccess={() => {
                        setShowSaleDialog(false);
                        fetchStatus();
                    }}
                />
            )}
        </div>
    );
}
