'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle, Lightbulb, Wallet, HelpCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';
import { Api } from '@/lib/api';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SupportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type TicketType = 'bug' | 'feature' | 'finance' | 'question';

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
    const { tenant, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [type, setType] = useState<TicketType>('bug');
    const [message, setMessage] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const loadHistory = async () => {
        try {
            setLoadingHistory(true);
            const data = await Api.getMySupportTickets();
            setHistory(data);
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (open) {
            loadHistory();
        }
    }, [open]);

    const handleSubmit = async () => {
        if (!message.trim()) return;

        try {
            setLoading(true);

            const userAgent = navigator.userAgent;
            const currentUrl = window.location.href;

            await Api.createSupportTicket({
                type,
                message,
                context: {
                    userAgent,
                    currentUrl,
                    tenantId: tenant?.id,
                    userId: user?.id,
                    userName: user?.email // or name if available
                }
            });

            setSuccess(true);
            setTimeout(() => {
                onOpenChange(false);
                setSuccess(false);
                setMessage('');
                setType('bug');
            }, 2000);

        } catch (error) {
            console.error(error);
            alert('Erro ao enviar mensagem. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const categories = [
        { id: 'bug', label: 'ERRO/BUG', icon: AlertCircle, color: 'text-red-400', border: 'border-red-400/20 hover:border-red-400/50 hover:bg-red-400/10' },
        { id: 'feature', label: 'SUGESTÃO', icon: Lightbulb, color: 'text-amber-400', border: 'border-amber-400/20 hover:border-amber-400/50 hover:bg-amber-400/10' },
        { id: 'finance', label: 'FINANCEIRO', icon: Wallet, color: 'text-emerald-400', border: 'border-emerald-400/20 hover:border-emerald-400/50 hover:bg-emerald-400/10' },
        { id: 'question', label: 'DÚVIDA', icon: HelpCircle, color: 'text-blue-400', border: 'border-blue-400/20 hover:border-blue-400/50 hover:bg-blue-400/10' },
    ] as const;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl bg-slate-900 border-slate-800 p-0 overflow-hidden shadow-2xl">
                {success ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                            <Send className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Mensagem Enviada!</h3>
                        <p className="text-slate-400 text-sm">Obrigado pelo seu feedback. Nossa equipe irá analisar e responder em breve.</p>
                    </div>
                ) : (
                    <>
                        <Tabs defaultValue="new" className="w-full">
                            <div className="px-6 border-b border-slate-800 bg-slate-950">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 py-4">
                                        <div className="p-2 bg-blue-600/20 rounded-lg text-blue-500">
                                            <HelpCircle size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-100 leading-none">SUPORTE TÉCNICO</h2>
                                            <p className="text-[10px] text-slate-500 font-medium uppercase mt-1">Estamos aqui para ajudar</p>
                                        </div>
                                    </div>
                                    <TabsList className="bg-slate-900 border-slate-800">
                                        <TabsTrigger value="new" className="text-xs uppercase font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white">Novo</TabsTrigger>
                                        <TabsTrigger value="history" className="text-xs uppercase font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white">Meus Tickets</TabsTrigger>
                                    </TabsList>
                                </div>
                            </div>

                            <TabsContent value="new" className="p-6 space-y-6 m-0">
                                <div className="grid grid-cols-2 gap-3">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setType(cat.id)}
                                            className={cn(
                                                "flex items-center gap-2 p-3 rounded-xl border transition-all text-xs font-bold uppercase",
                                                type === cat.id
                                                    ? cn("bg-slate-800 border-slate-600 ring-1 ring-slate-500", cat.color)
                                                    : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"
                                            )}
                                        >
                                            <cat.icon size={16} />
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sua Mensagem</label>
                                    <Textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Descreva o que está acontecendo ou sua ideia..."
                                        className="min-h-[150px] bg-slate-950 border-slate-800 text-slate-200 resize-none focus:ring-blue-600 focus:border-blue-600"
                                    />
                                </div>

                                <Button
                                    onClick={handleSubmit}
                                    disabled={loading || !message.trim()}
                                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            ENVIAR MENSAGEM
                                            <Send className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>

                                <p className="text-[10px] text-center text-slate-600 uppercase font-medium">
                                    Nossa equipe responde em até 24h úteis via e-mail.
                                </p>
                            </TabsContent>

                            <TabsContent value="history" className="p-0 m-0">
                                <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                                    {loadingHistory ? (
                                        <div className="p-12 flex flex-col items-center justify-center text-slate-500">
                                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                            <p className="text-sm font-medium uppercase tracking-widest">Carregando histórico...</p>
                                        </div>
                                    ) : history.length === 0 ? (
                                        <div className="p-12 flex flex-col items-center justify-center text-slate-500 text-center">
                                            <HelpCircle className="w-12 h-12 mb-4 opacity-20" />
                                            <p className="text-sm font-medium uppercase tracking-widest">Nenhum chamado enviado ainda</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-800">
                                            {history.map((ticket) => (
                                                <div key={ticket.id} className="p-4 bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            {categories.find(c => c.id === ticket.type)?.icon({ size: 14, className: categories.find(c => c.id === ticket.type)?.color })}
                                                            <span className="text-[10px] font-bold uppercase text-slate-400">
                                                                {categories.find(c => c.id === ticket.type)?.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="text-[10px] text-slate-500 font-medium">
                                                                {format(new Date(ticket.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                                            </span>
                                                            <Badge className={cn(
                                                                "text-[8px] uppercase font-black px-1.5 py-0 h-4 border",
                                                                ticket.status === 'open' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                                    ticket.status === 'progress' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                                        "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                            )}>
                                                                {ticket.status === 'open' ? 'Aberto' : ticket.status === 'progress' ? 'Em Análise' : 'Concluído'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-200 line-clamp-2 mb-2">{ticket.message}</p>
                                                    {ticket.admin_notes && (
                                                        <div className="mt-3 p-3 bg-blue-600/10 border border-blue-500/20 rounded-lg">
                                                            <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Resposta do Suporte:</p>
                                                            <p className="text-xs text-blue-100 italic">{ticket.admin_notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
