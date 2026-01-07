'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Api } from '@/lib/api';
import { supabaseClient } from '@/lib/supabase-client';
import { QueueStatusCard } from '@/components/queue/queue-status-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { InstallPWA } from '@/components/pwa/install-button';

export default function FilaPage({ params }: { params: Promise<{ ticketId: string }> }) {
    const { ticketId } = use(params);
    const router = useRouter();
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchTicket = async () => {
        try {
            const data = await Api.getPublicTicket(ticketId);
            setTicket(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    const handleCancel = async () => {
        if (!ticketId) return;
        try {
            setLoading(true);

            await Api.cancelPublicTicket(ticketId);
            router.push('/clientes'); // volta para a home de clientes
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchTicket();

        // 1. Polling como fallback (cada 10 segundos)
        const interval = setInterval(fetchTicket, 10000);

        // 2. Realtime (Supabase)
        const channel = supabaseClient
            .channel(`ticket-${ticketId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'client_queue',
                    filter: `id=eq.${ticketId}`,
                },
                () => {
                    fetchTicket(); // Recarregar dados via API para garantir join com barbeiros e posição real
                }
            )
            .subscribe();

        return () => {
            clearInterval(interval);
            supabaseClient.removeChannel(channel);
        };
    }, [ticketId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Sincronizando Fila...</p>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="text-center py-20 space-y-6">
                <h2 className="text-2xl font-black text-slate-100 uppercase italic">Ticket não encontrado</h2>
                <p className="text-slate-500">O ticket {ticketId.slice(0, 8)} não existe ou foi removido.</p>
                <Button onClick={() => router.push('/')} className="btn-primary">
                    Voltar para o Início
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-10 py-4">
            <section className="flex justify-between items-center">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/')}
                    className="text-slate-500 hover:text-slate-100 hover:bg-slate-900 gap-2 p-0 h-auto"
                >
                    <ArrowLeft size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">Início</span>
                </Button>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic">Atualizado em tempo real</span>
                </div>
            </section>

            <section>
                <QueueStatusCard ticket={ticket} />
            </section>

            {(ticket.status === 'waiting' || ticket.status === 'attending') && (
                <section className="pt-2 px-4">
                    <Button
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={loading}
                        className="w-full h-12 text-slate-500 hover:text-red-500 hover:bg-red-500/5 font-black uppercase text-[10px] tracking-[0.2em] rounded-xl transition-all"
                    >
                        {loading ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                        Sair da Fila
                    </Button>
                </section>
            )}
            {ticket.status === 'finished' && (
                <section className="pt-6 px-4">
                    <Button
                        onClick={() => router.push('/clientes')}
                        className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/40"
                    >
                        Voltar para o Início
                    </Button>
                </section>
            )}

            <section>
                <InstallPWA tenant={ticket.barbershop} />
            </section>

            <section className="text-center py-4">
                <button
                    onClick={fetchTicket}
                    className="inline-flex items-center gap-2 text-[10px] text-slate-700 hover:text-slate-500 transition-colors uppercase font-black tracking-widest"
                >
                    <RefreshCw size={10} />
                    Atualizar Manualmente
                </button>
            </section>
        </div>
    );
}
