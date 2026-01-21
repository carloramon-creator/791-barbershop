'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle, Lightbulb, Wallet, HelpCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';

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

    const handleSubmit = async () => {
        if (!message.trim()) return;

        try {
            setLoading(true);

            // Get OS/Browser info
            const userAgent = navigator.userAgent;
            const currentUrl = window.location.href;

            const res = await fetch('/api/support/ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    message,
                    context: {
                        userAgent,
                        currentUrl,
                        tenantId: tenant?.id,
                        userId: user?.id,
                        userName: user?.email // or name if available
                    }
                })
            });

            if (!res.ok) throw new Error('Failed to send ticket');

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
            <DialogContent className="max-w-md bg-slate-900 border-slate-800 p-0 overflow-hidden shadow-2xl">
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
                        <div className="p-6 border-b border-slate-800 bg-slate-950">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 bg-blue-600/20 rounded-lg text-blue-500">
                                    <HelpCircle size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-100">SUPORTE TÉCNICO</h2>
                                    <p className="text-xs text-slate-500 font-medium">Estamos aqui para ajudar</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
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
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
