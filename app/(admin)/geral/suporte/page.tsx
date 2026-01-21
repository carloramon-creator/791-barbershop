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
    Filter
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

    const filteredTickets = tickets.filter(t =>
        t.message.toLowerCase().includes(search.toLowerCase()) ||
        t.tenants?.name.toLowerCase().includes(search.toLowerCase())
    );

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

            {/* Modal de Detalhes */}
            <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
                <DialogContent className="max-w-5xl bg-slate-900 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            {selectedTicket && getTypeIcon(selectedTicket.type)}
                            <DialogTitle className="text-xl font-bold uppercase tracking-tighter">
                                Chamado: {selectedTicket && getTypeLabel(selectedTicket.type)}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-slate-400">
                            Enviado por <strong>{selectedTicket?.tenants?.name}</strong> em {selectedTicket && format(new Date(selectedTicket.created_at), "PPP 'às' HH:mm", { locale: ptBR })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Mensagem do Usuário</label>
                                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-sm text-slate-200 min-h-[100px] whitespace-pre-wrap">
                                    {selectedTicket?.message}
                                </div>
                            </div>

                            {selectedTicket?.context && (
                                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-500 space-y-1">
                                    <p>URL: {selectedTicket.context.currentUrl}</p>
                                    <p>User: {selectedTicket.context.userName}</p>
                                    <p>ID: {selectedTicket.user_id}</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Alterar Status</label>
                                <Select value={ticketStatus} onValueChange={setTicketStatus}>
                                    <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100">
                                        <SelectValue placeholder="Selecione o status" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                        <SelectItem value="open">Aberto</SelectItem>
                                        <SelectItem value="progress">Em Análise</SelectItem>
                                        <SelectItem value="closed">Concluído</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Notas Internas / Resposta</label>
                                <Textarea
                                    className="bg-slate-950 border-slate-800 text-slate-100 min-h-[120px]"
                                    placeholder="Anotações para a equipe..."
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedTicket(null)} className="text-slate-400">Cancelar</Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            onClick={handleUpdateTicket}
                            disabled={updating}
                        >
                            {updating ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
