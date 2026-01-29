"use client";

import React, { useState, useEffect } from 'react';
import {
    Ticket,
    Plus,
    Search,
    Trash2,
    Filter,
    Calendar,
    User,
    Percent,
    DollarSign,
    CheckCircle2,
    Clock,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function CouponsCentralPage() {
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        client_id: 'global',
        discount_type: 'fixed',
        discount_value: '',
        is_birthday: false,
        expires_at: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    });

    useEffect(() => {
        fetchData();
        fetchClients();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/barbershop/vouchers');
            const data = await res.json();
            if (res.ok) setVouchers(data);
        } catch (error) {
            toast.error("Erro ao carregar cupons");
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const res = await fetch('/api/barbershop/clients');
            const data = await res.json();
            if (res.ok) {
                // Filtra para garantir que temos uma lista válida de clientes
                const clientList = Array.isArray(data) ? data : (data.clients || []);
                setClients(clientList.filter((c: any) => c.name));
            }
        } catch (error) {
            console.error("Erro ao carregar clientes", error);
        }
    };

    const handleCreate = async () => {
        if (!formData.code || !formData.discount_value) {
            toast.error("Preencha todos os campos obrigatórios");
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await fetch('/api/barbershop/vouchers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    client_id: formData.client_id === 'global' ? null : formData.client_id,
                    discount_value: parseFloat(formData.discount_value)
                })
            });

            if (res.ok) {
                toast.success("Cupom criado com sucesso!");
                setIsCreateOpen(false);
                setFormData({
                    code: '',
                    client_id: 'global',
                    discount_type: 'fixed',
                    discount_value: '',
                    is_birthday: false,
                    expires_at: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                });
                fetchData();
            } else {
                const err = await res.json();
                throw new Error(err.error || "Erro ao criar");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Deseja realmente remover este cupom?")) return;

        try {
            const res = await fetch(`/api/barbershop/vouchers?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Cupom removido");
                fetchData();
            }
        } catch (error) {
            toast.error("Erro ao remover");
        }
    };

    const filteredVouchers = vouchers.filter(v =>
        v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatus = (v: any) => {
        if (v.used_at) return { label: 'Usado', color: 'bg-slate-500/10 text-slate-500', icon: CheckCircle2 };
        const isExpired = v.expires_at && new Date(v.expires_at) < new Date();
        if (isExpired) return { label: 'Expirado', color: 'bg-red-500/10 text-red-500', icon: Clock };
        return { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-500', icon: Ticket };
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                        <Ticket className="text-blue-500 w-8 h-8" /> Central de Cupons
                    </h1>
                    <p className="text-slate-400">Gerencie promoções globais e vouchers individuais.</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 font-bold gap-2 shadow-lg shadow-blue-600/20">
                            <Plus className="w-5 h-5" /> Novo Cupom
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
                        <DialogHeader>
                            <DialogTitle>Criar Novo Voucher</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Defina as regras do benefício e para quem será destinado.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Código do Cupom</Label>
                                <Input
                                    placeholder="Ex: BEMVINDO10"
                                    className="bg-slate-800 border-slate-700 uppercase font-mono"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Destinatário</Label>
                                <Select
                                    value={formData.client_id}
                                    onValueChange={v => setFormData({ ...formData, client_id: v })}
                                >
                                    <SelectTrigger className="bg-slate-800 border-slate-700">
                                        <SelectValue placeholder="Selecione um cliente" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 max-h-[250px] overflow-y-auto z-[100]">
                                        <SelectItem value="global" className="font-bold text-blue-400">🌍 Global (Qualquer Cliente)</SelectItem>
                                        {(clients || []).map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tipo</Label>
                                    <Select
                                        value={formData.discount_type}
                                        onValueChange={v => setFormData({ ...formData, discount_type: v })}
                                    >
                                        <SelectTrigger className="bg-slate-800 border-slate-700">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                            <SelectItem value="fixed">Fixo (R$)</SelectItem>
                                            <SelectItem value="percentage">Percentual (%)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Valor</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="bg-slate-800 border-slate-700"
                                        value={formData.discount_value}
                                        onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Data de Expiração</Label>
                                <Input
                                    type="date"
                                    className="bg-slate-800 border-slate-700"
                                    value={formData.expires_at}
                                    onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold text-slate-100">Cupom de Aniversário</Label>
                                    <p className="text-[10px] text-slate-500">Marcar como benefício especial de aniversário.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.is_birthday}
                                        onChange={e => setFormData({ ...formData, is_birthday: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700 font-bold"
                                onClick={handleCreate}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                Gerar Cupom
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-3 px-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <Input
                                placeholder="Buscar por código ou cliente..."
                                className="bg-slate-800 border-slate-700 pl-10"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 text-xs font-bold uppercase tracking-wider">
                                <Filter className="w-3 h-3 mr-2" /> Filtrar
                            </Button>
                            <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 text-xs font-bold uppercase tracking-wider" onClick={fetchData}>
                                <Loader2 className={cn("w-3 h-3 mr-2", loading && "animate-spin")} /> Atualizar
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950/50 border-b border-slate-800">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Código</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Destinatário</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Desconto</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Expiração</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                                <span className="text-slate-500 uppercase text-[10px] font-black tracking-widest">Carregando vouchers...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredVouchers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <Ticket className="w-12 h-12 text-slate-800" />
                                                <div className="text-slate-600 uppercase text-[10px] font-black tracking-widest">Nenhum cupom encontrado.</div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVouchers.map((v) => {
                                        const status = getStatus(v);
                                        return (
                                            <tr key={v.id} className="hover:bg-slate-800/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="inline-flex items-center gap-2 px-2 py-1 rounded bg-blue-500/10 text-blue-400 font-mono font-bold text-xs uppercase border border-blue-500/20">
                                                        <Ticket className="w-3 h-3" /> {v.code}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {v.client_id ? (
                                                            <>
                                                                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-500">
                                                                    <User size={12} />
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-200">{v.clients?.name}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs font-bold text-emerald-500 flex items-center gap-2">
                                                                🌍 Global
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-xs font-black text-slate-100">
                                                        {v.discount_type === 'percentage' ? (
                                                            <><Percent size={12} className="text-slate-500" /> {v.discount_value}%</>
                                                        ) : (
                                                            <><DollarSign size={12} className="text-slate-500" /> R$ {v.discount_value.toFixed(2).replace('.', ',')}</>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-500">
                                                    {v.expires_at ? format(new Date(v.expires_at), 'dd/MM/yyyy', { locale: ptBR }) : 'Sem limite'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                                        status.color
                                                    )}>
                                                        <status.icon size={10} />
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-slate-500 hover:text-red-500 hover:bg-red-500/10"
                                                        onClick={() => handleDelete(v.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">Total Ativos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-100">{vouchers.filter(v => !v.used_at && (!v.expires_at || new Date(v.expires_at) > new Date())).length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-emerald-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">Total Usados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-100">{vouchers.filter(v => v.used_at).length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-amber-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">Economia Gerada</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-100">R$ {vouchers.filter(v => v.used_at).reduce((acc, v) => acc + (v.discount_value || 0), 0).toFixed(2).replace('.', ',')}</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
