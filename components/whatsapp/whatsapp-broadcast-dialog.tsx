"use client";

import React, { useState, useEffect } from 'react';
import {
    MessageSquare,
    Users,
    ChevronRight,
    Search,
    Send,
    Loader2,
    Check,
    X,
    Info,
    Calendar
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WhatsAppBroadcastDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialMessage?: string;
    initialTarget?: 'all' | 'specific' | 'birthdays';
    initialClientIds?: string[];
}

export function WhatsAppBroadcastDialog({
    open,
    onOpenChange,
    initialMessage = '',
    initialTarget = 'all',
    initialClientIds = []
}: WhatsAppBroadcastDialogProps) {
    const [message, setMessage] = useState(initialMessage);
    const [target, setTarget] = useState<'all' | 'specific' | 'birthdays'>(initialTarget);
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>(initialClientIds);
    const [loadingClients, setLoadingClients] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (open) {
            fetchClients();
            setMessage(initialMessage);
            setTarget(initialTarget);
            setSelectedClientIds(initialClientIds);
        }
    }, [open, initialMessage, initialTarget, initialClientIds]);

    const fetchClients = async () => {
        try {
            setLoadingClients(true);
            const res = await fetch('/api/clients');
            const data = await res.json();
            if (res.ok) {
                const list = Array.isArray(data) ? data : (data.clients || []);
                setClients(list.filter((c: any) => c.name && c.phone));
            }
        } catch (error) {
            console.error("Erro ao carregar clientes", error);
        } finally {
            setLoadingClients(false);
        }
    };

    const handleSend = async () => {
        if (!message) {
            toast.error("Escreva uma mensagem primeiro");
            return;
        }

        if (target === 'specific' && selectedClientIds.length === 0) {
            toast.error("Selecione pelo menos um cliente");
            return;
        }

        try {
            setSending(true);
            const res = await fetch('/api/barbershop/whatsapp/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    target,
                    clientIds: selectedClientIds
                })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(`Mensagens enviadas! Sucesso: ${data.stats.sent}, Erro: ${data.stats.error}`);
                onOpenChange(false);
            } else {
                throw new Error(data.error || "Erro ao disparar");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSending(false);
        }
    };

    const filteredClients = clients.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
    );

    const toggleClient = (id: string) => {
        setSelectedClientIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl shadow-2xl overflow-hidden p-0 gap-0">
                <div className="flex flex-col h-[85vh] max-h-[700px]">
                    <DialogHeader className="p-6 border-b border-slate-800">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <MessageSquare className="text-blue-500 w-6 h-6" /> Comunicado WhatsApp
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Envie mensagens em massa para seus clientes. Use <code className="text-blue-400">{"{{nome}}"}</code> para personalizar.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        {/* Lado Esquerdo: Configuração */}
                        <div className="flex-1 p-6 space-y-6 border-r border-slate-800 overflow-y-auto custom-scrollbar">
                            <div className="space-y-3">
                                <Label className="text-xs uppercase text-slate-500 font-black tracking-widest">Para quem enviar?</Label>
                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        onClick={() => setTarget('all')}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                                            target === 'all' ? "bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-600/5" : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", target === 'all' ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-500")}>
                                                <Users size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-200">Todos os Clientes</div>
                                                <div className="text-[10px] text-slate-500 uppercase font-black">Toda a sua base ativa</div>
                                            </div>
                                        </div>
                                        {target === 'all' && <Check className="text-blue-500 w-5 h-5" />}
                                    </button>

                                    <button
                                        onClick={() => setTarget('birthdays')}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                                            target === 'birthdays' ? "bg-pink-600/10 border-pink-500 shadow-lg shadow-pink-600/5" : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", target === 'birthdays' ? "bg-pink-600 text-white" : "bg-slate-800 text-slate-500")}>
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-200">Aniversariantes do Dia</div>
                                                <div className="text-[10px] text-slate-500 uppercase font-black">Clientes fazendo anos hoje</div>
                                            </div>
                                        </div>
                                        {target === 'birthdays' && <Check className="text-pink-500 w-5 h-5" />}
                                    </button>

                                    <button
                                        onClick={() => setTarget('specific')}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                                            target === 'specific' ? "bg-emerald-600/10 border-emerald-500 shadow-lg shadow-emerald-600/5" : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", target === 'specific' ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-500")}>
                                                <ChevronRight size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-200">Selecionar Específicos</div>
                                                <div className="text-[10px] text-slate-500 uppercase font-black">{selectedClientIds.length} selecionados</div>
                                            </div>
                                        </div>
                                        {target === 'specific' && <Check className="text-emerald-500 w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-xs uppercase text-slate-500 font-black tracking-widest">Sua Mensagem</Label>
                                <div className="space-y-2">
                                    <Textarea
                                        placeholder="Olá, {{nome}}! Temos uma novidade..."
                                        className="bg-slate-950 border-slate-800 min-h-[150px] font-sans text-sm focus-visible:ring-blue-500 resize-none p-4 leading-relaxed"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        <Badge
                                            variant="secondary"
                                            className="bg-slate-800 text-slate-400 hover:bg-blue-600 hover:text-white cursor-pointer px-2 py-1 text-[10px] font-black uppercase tracking-widest"
                                            onClick={() => setMessage(prev => prev + '{{nome}}')}
                                        >
                                            + Inserir Nome
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-600/5 border border-blue-500/20 p-4 rounded-xl flex gap-3">
                                <Info className="text-blue-500 w-5 h-5 shrink-0 mt-0.5" />
                                <div className="text-[10px] text-slate-400 font-medium leading-normal">
                                    O disparo síncrono pode levar alguns segundos dependendo da quantidade de clientes. Não feche esta janela até concluir.
                                </div>
                            </div>
                        </div>

                        {/* Lado Direito: Seleção (Só aparece se target === 'specific') */}
                        {target === 'specific' && (
                            <div className="w-full md:w-[280px] bg-slate-950/30 flex flex-col border-t md:border-t-0 md:border-l border-slate-800 h-full overflow-hidden">
                                <div className="p-4 border-b border-slate-800 bg-slate-900/50 gap-3 flex flex-col">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Selecionar Clientes</span>
                                        <span className="text-[10px] font-black bg-blue-600 px-1.5 py-0.5 rounded text-white">{selectedClientIds.length}</span>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                        <Input
                                            placeholder="Buscar..."
                                            className="pl-8 h-9 bg-slate-900 border-slate-800 text-xs"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <div className="p-2 space-y-1">
                                        {loadingClients ? (
                                            <div className="flex flex-col items-center justify-center p-8 gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                                                <span className="text-[10px] uppercase font-black text-slate-700 tracking-widest">Buscando...</span>
                                            </div>
                                        ) : filteredClients.length === 0 ? (
                                            <div className="text-center p-8 text-slate-600 text-xs">Nenhum cliente.</div>
                                        ) : (
                                            filteredClients.map(c => {
                                                const isSelected = selectedClientIds.includes(c.id);
                                                return (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => toggleClient(c.id)}
                                                        className={cn(
                                                            "w-full flex items-center gap-3 p-2 rounded-lg transition-all border group",
                                                            isSelected ? "bg-blue-600/10 border-blue-500/30" : "hover:bg-slate-800/50 border-transparent"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                            isSelected ? "bg-blue-600 border-blue-500" : "border-slate-700 bg-slate-900 group-hover:border-slate-500"
                                                        )}>
                                                            {isSelected && <Check size={12} className="text-white" />}
                                                        </div>
                                                        <div className="flex flex-col text-left">
                                                            <span className={cn("text-xs font-bold truncate max-w-[180px]", isSelected ? "text-slate-100" : "text-slate-400 group-hover:text-slate-200")}>{c.name}</span>
                                                            <span className="text-[10px] text-slate-600">{c.phone}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-6 border-t border-slate-800 bg-slate-950/20">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs font-bold uppercase tracking-widest h-11">Cancelar</Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 font-bold h-11 px-8 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                            onClick={handleSend}
                            disabled={sending}
                        >
                            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                            {target === 'all' ? 'Disparar para Todos' : target === 'birthdays' ? 'Parabenizar Hoje' : `Enviar para ${selectedClientIds.length} selecionados`}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                    border-radius: 10px;
                }
            `}</style>
        </Dialog>
    );
}
