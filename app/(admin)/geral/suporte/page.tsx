'use client';

import { useEffect, useState } from 'react';
import { Api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    MessageCircle,
    AlertCircle,
    Lightbulb,
    Wallet,
    HelpCircle,
    Clock,
    CheckCircle2,
    MoreHorizontal,
    Search,
    Filter,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function SupportPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [ticketStatus, setTicketStatus] = useState('');
    const [updating, setUpdating] = useState(false);
    const [search, setSearch] = useState('');

    const loadTickets = async () => {
        try {
            setLoading(true);
            const data = await Api.getSupportTickets();
            setTickets(data);
        } catch (error) {
            console.error('Failed to load tickets', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
    }, []);

    const handleUpdateTicket = async () => {
        if (!selectedTicket) return;
        try {
            setUpdating(true);
            await Api.updateSupportTicket(selectedTicket.id, {
                status: ticketStatus,
                admin_notes: adminNotes
            });
            await loadTickets();
            setSelectedTicket(null);
        } catch (error) {
            console.error(error);
            alert('Erro ao atualizar ticket.');
        } finally {
            setUpdating(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'bug': return <AlertCircle className="w-4 h-4 text-red-400" />;
            case 'feature': return <Lightbulb className="w-4 h-4 text-amber-400" />;
            case 'finance': return <Wallet className="w-4 h-4 text-emerald-400" />;
            default: return <HelpCircle className="w-4 h-4 text-blue-400" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'bug': return 'Erro/Bug';
            case 'feature': return 'Sugestão';
            case 'finance': return 'Financeiro';
            default: return 'Dúvida';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open': return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Aberto</Badge>;
            case 'progress': return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Em Análise</Badge>;
            case 'closed': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Concluído</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const filteredTickets = (tickets || []).filter(t => {
        const msg = (t.message || '').toLowerCase();
        const tenantName = (t.tenants?.name || '').toLowerCase();
        const searchTerm = (search || '').toLowerCase();
        return msg.includes(searchTerm) || tenantName.includes(searchTerm);
    });

    return (
        <div className="space-y-6 -mx-8 -mt-8 p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter">Mensagens de Suporte</h1>
                    <p className="text-slate-500 font-medium">Gerencie erros, sugestões e dúvidas enviadas pelas barbearias.</p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <Input
                        placeholder="Pesquisar por mensagem ou barbearia..."
                        className="bg-slate-950 border-slate-800 pl-10 text-slate-200"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="border-slate-800 bg-slate-900 text-slate-400 gap-2">
                        <Filter className="w-4 h-4" />
                        Status: Todos
                    </Button>
                </div>
            </div>

            <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-950">
                            <TableRow className="border-slate-800 hover:bg-transparent">
                                <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider py-4">Data</TableHead>
                                <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider py-4">Barbearia</TableHead>
                                <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider py-4">Usuário</TableHead>
                                <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider py-4">Tipo</TableHead>
                                <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider py-4">Mensagem</TableHead>
                                <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider py-4">Status</TableHead>
                                <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider py-4 text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="border-slate-800">
                                        <TableCell colSpan={6} className="h-12 animate-pulse bg-slate-900/20" />
                                    </TableRow>
                                ))
                            ) : filteredTickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                        Nenhum chamado encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTickets.map((ticket) => (
                                    <TableRow key={ticket.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                                        <TableCell className="text-slate-300 text-sm whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span>{format(new Date(ticket.created_at), "dd 'de' MMM", { locale: ptBR })}</span>
                                                <span className="text-[10px] text-slate-500 uppercase">{format(new Date(ticket.created_at), "HH:mm")}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-bold text-slate-100 text-sm">
                                            {ticket.tenants?.name || 'Sistema'}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-400 font-medium">
                                            {ticket.user?.nickname || ticket.user?.name || 'Desconhecido'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getTypeIcon(ticket.type)}
                                                <span className="text-[10px] font-bold uppercase text-slate-400">{getTypeLabel(ticket.type)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-slate-400 text-sm">
                                            {ticket.message}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(ticket.status)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-blue-500 hover:bg-blue-500/10"
                                                onClick={() => {
                                                    setSelectedTicket(ticket);
                                                    setAdminNotes(ticket.admin_notes || '');
                                                    setTicketStatus(ticket.status || 'open');
                                                }}
                                            >
                                                Ver Detalhes
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Modal de Detalhes JUMBO */}
            <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
                <DialogContent className="sm:max-w-7xl w-[95vw] h-[90vh] bg-slate-900 border-slate-800 text-slate-100 flex flex-col p-0 overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-slate-800 bg-slate-950">
                        <DialogHeader>
                            <div className="flex items-center gap-4 mb-1">
                                <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
                                    {selectedTicket && getTypeIcon(selectedTicket.type)}
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black uppercase tracking-tight leading-none">
                                        {selectedTicket && getTypeLabel(selectedTicket.type)}
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-400 text-sm font-medium mt-1">
                                        Enviado por <span className="text-blue-400 font-bold">{selectedTicket?.tenants?.name}</span> ({selectedTicket?.user?.nickname || selectedTicket?.user?.name}) em {selectedTicket && format(new Date(selectedTicket.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-900/40">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* Coluna Esquerda: Conteúdo */}
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <MessageCircle className="w-4 h-4 text-blue-500" />
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Mensagem do Cliente</label>
                                    </div>
                                    <div className="p-8 bg-slate-950 border border-slate-800 rounded-3xl min-h-[300px] text-xl leading-relaxed text-slate-200 shadow-inner whitespace-pre-wrap">
                                        {selectedTicket?.message}
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-6">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800/50 pb-3 block">Dados Técnicos de Contexto</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500 uppercase font-black">Página do Ocorrido:</p>
                                            <p className="text-xs text-blue-400 font-mono break-all bg-slate-900/50 p-2 rounded">{selectedTicket?.context?.currentUrl || 'N/A'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500 uppercase font-black">ID Único do Chamado:</p>
                                            <p className="text-xs text-slate-400 font-mono bg-slate-900/50 p-2 rounded">{selectedTicket?.id}</p>
                                        </div>
                                        <div className="col-span-1 md:col-span-2 space-y-1">
                                            <p className="text-[10px] text-slate-500 uppercase font-black">Dispositivo / Agente:</p>
                                            <p className="text-[10px] text-slate-500 font-mono bg-slate-950 p-3 rounded-xl border border-slate-800/50">{selectedTicket?.context?.userAgent || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Coluna Direita: Ação */}
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">Status do Atendimento</label>
                                    <Select value={ticketStatus} onValueChange={setTicketStatus}>
                                        <SelectTrigger className="bg-slate-950 border-slate-800 h-16 text-xl font-black rounded-2xl ring-offset-blue-600 focus:ring-2">
                                            <SelectValue placeholder="Selecione o status" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-950 border-slate-800">
                                            <SelectItem value="open" className="text-lg py-3 font-bold text-blue-400">ABERTO</SelectItem>
                                            <SelectItem value="progress" className="text-lg py-3 font-bold text-amber-400">EM ANÁLISE</SelectItem>
                                            <SelectItem value="closed" className="text-lg py-3 font-bold text-emerald-400">CONCLUÍDO / RESOLVIDO</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nota / Resposta Oficial</label>
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-500 border-blue-500/20">O cliente verá esta nota</Badge>
                                    </div>
                                    <Textarea
                                        className="bg-slate-950 border-slate-800 text-xl font-medium min-h-[350px] rounded-3xl p-8 resize-none focus:ring-2 focus:ring-blue-600/50 shadow-inner custom-scrollbar"
                                        placeholder="Digite aqui a resposta que o cliente verá no painel dele..."
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 border-t border-slate-800 bg-slate-950 flex justify-end items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedTicket(null)}
                            className="h-14 px-8 text-slate-400 hover:text-slate-100 hover:bg-slate-900 font-bold uppercase text-xs tracking-widest rounded-2xl"
                        >
                            Cancelar e Sair
                        </Button>
                        <Button
                            className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-2xl shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={handleUpdateTicket}
                            disabled={updating}
                        >
                            {updating ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processando...
                                </div>
                            ) : (
                                "SALVAR ALTERAÇÕES"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
