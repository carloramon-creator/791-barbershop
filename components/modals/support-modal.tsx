'use client';

import React, { useState } from 'react';
import {
    X,
    MessageSquare,
    AlertCircle,
    Lightbulb,
    Send,
    Loader2,
    CheckCircle2,
    LifeBuoy
} from 'lucide-react';

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantName?: string;
    userEmail?: string;
}

export function SupportModal({ isOpen, onClose, tenantName, userEmail }: SupportModalProps) {
    const [type, setType] = useState('bug'); // bug, suggestion, question, billing
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        try {
            setSending(true);
            setError(null);

            const res = await fetch('/api/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    message,
                    tenantName,
                    userEmail,
                    timestamp: new Date().toISOString()
                }),
            });

            if (!res.ok) throw new Error('Erro ao enviar mensagem');

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setMessage('');
            }, 3000);

        } catch (err: any) {
            setError(err.message || 'Falha ao conectar com o suporte');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-slate-800/50 px-6 py-4 flex items-center justify-between border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <LifeBuoy className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-tight">Suporte Técnico</h3>
                            <p className="text-[10px] text-slate-400 font-medium">Estamos aqui para ajudar</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {success ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-white">Mensagem Recebida!</h4>
                                <p className="text-slate-400 text-sm max-w-[280px] mx-auto mt-2">
                                    Nossa equipe técnica foi notificada e entrará em contato em breve pelo seu e-mail cadastrado.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Type Selection */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'bug', label: 'Erro/Bug', icon: AlertCircle, color: 'text-red-500' },
                                    { id: 'suggestion', label: 'Sugestão', icon: Lightbulb, color: 'text-amber-500' },
                                    { id: 'billing', label: 'Financeiro', icon: MessageSquare, color: 'text-blue-500' },
                                    { id: 'question', label: 'Dúvida', icon: LifeBuoy, color: 'text-slate-400' },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setType(item.id)}
                                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${type === item.id
                                                ? 'bg-blue-500/10 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                                                : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600'
                                            }`}
                                    >
                                        <item.icon className={`w-4 h-4 ${type === item.id ? 'text-blue-500' : item.color}`} />
                                        <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Message Area */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Sua Mensagem</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Descreva o que está acontecendo ou sua ideia..."
                                    className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all resize-none shadow-inner"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-[10px] font-bold uppercase">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            {/* Footer / Submit */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={sending || !message.trim()}
                                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-blue-900/10 transition-all flex items-center justify-center gap-3 group"
                                >
                                    {sending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Enviar Mensagem
                                            <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[9px] text-slate-500 mt-4 font-medium uppercase tracking-tighter">
                                    Nossa equipe responde em até 24h úteis via e-mail.
                                </p>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
