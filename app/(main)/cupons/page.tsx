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
    Loader2,
    Check,
    ChevronsUpDown,
    Gift
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
    const [clientSearchOpen, setClientSearchOpen] = useState(false);
    const [clientFilter, setClientFilter] = useState('');

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
            if (res.ok) setVouchers(data || []);
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
                const list = Array.isArray(data) ? data : (data.clients || []);
                setClients(list.filter((c: any) => c.name));
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
        (v.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.clients?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatus = (v: any) => {
        if (v.used_at) return { label: 'Usado', color: 'bg-slate-500/10 text-slate-500', icon: CheckCircle2 };
        const isExpired = v.expires_at && new Date(v.expires_at) < new Date();
        if (isExpired) return { label: 'Expirado', color: 'bg-red-500/10 text-red-500', icon: Clock };
        return { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-500', icon: Ticket };
    };

    const selectedClientName = formData.client_id === 'global'
        ? "🌍 Global (Qualquer Cliente)"
        : (clients.find(c => c.id === formData.client_id)?.name || "Selecionar Cliente...");

    const filteredClients = clients.filter(c =>
        c.name?.toLowerCase().includes(clientFilter.toLowerCase())
    );

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
                        <Button className="bg-blue-600 hover:bg-blue-700 font-bold gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-transform">
                            <Plus className="w-5 h-5" /> Novo Cupom
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md shadow-2xl overflow-hidden">
                        <DialogHeader>
                            <DialogTitle>Criar Novo Voucher</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Defina as regras do benefício e para quem será destinado.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-5 py-4">
                            <div className="space-y-2">
                                <Label className="text-xs uppercase text-slate-500 font-black tracking-widest">Código do Cupom (Aceita Emojis ✨)</Label>
                                <Input
                                    placeholder="Ex: PROMO10 🏷️"
                                    className="bg-slate-800 border-slate-700 font-sans h-12 text-lg"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase text-slate-500 font-black tracking-widest">Destinatário</Label>
                                <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={clientSearchOpen}
                                            className="w-full justify-between bg-slate-800 border-slate-700 h-12 font-medium"
                                        >
                                            <span className="truncate">{selectedClientName}</span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-slate-900 border-slate-800 shadow-2xl z-[9999]" align="start">
                                        <div className="p-2 border-b border-slate-800">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <Input
                                                    placeholder="Buscar cliente..."
                                                    className="pl-8 bg-slate-950 border-none h-10 text-sm focus-visible:ring-0"
                                                    value={clientFilter}
                                                    onChange={e => setClientFilter(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                                            <button
                                                className={cn(
                                                    "w-full text-left px-3 py-3 rounded-md text-sm transition-colors flex items-center gap-2",
                                                    formData.client_id === 'global' ? "bg-blue-600/20 text-blue-400" : "hover:bg-slate-800"
                                                )}
                                                onClick={() => {
                                                    setFormData({ ...formData, client_id: 'global' });
                                                    setClientSearchOpen(false);
                                                }}
                                            >
                                                <Check className={cn("h-4 w-4", formData.client_id === 'global' ? "opacity-100" : "opacity-0")} />
                                                <span className="font-bold">🌍 Global (Qualquer Cliente)</span>
                                            </button>

                                            {filteredClients.length === 0 && clientFilter && (
                                                <div className="py-6 text-center text-sm text-slate-500">Nenhum cliente encontrado.</div>
                                            )}

                                            {filteredClients.map((client) => (
                                                <button
                                                    key={client.id}
                                                    className={cn(
                                                        "w-full text-left px-3 py-3 rounded-md text-sm transition-colors flex items-center gap-2",
                                                        formData.client_id === client.id ? "bg-slate-800 text-white" : "hover:bg-slate-800"
                                                    )}
                                                    onClick={() => {
                                                        setFormData({ ...formData, client_id: client.id });
                                                        setClientSearchOpen(false);
                                                    }}
                                                >
                                                    <Check className={cn("h-4 w-4 text-blue-500", formData.client_id === client.id ? "opacity-100" : "opacity-0")} />
                                                    {client.name}
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-slate-500 font-black tracking-widest">Tipo</Label>
                                    <Select
                                        value={formData.discount_type}
                                        onValueChange={v => setFormData({ ...formData, discount_type: v })}
                                    >
                                        <SelectTrigger className="bg-slate-800 border-slate-700 h-12">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 z-[9999]">
                                            <SelectItem value="fixed">Fixo (R$)</SelectItem>
                                            <SelectItem value="percentage">Percentual (%)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-slate-500 font-black tracking-widest">Valor</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="bg-slate-800 border-slate-700 h-12"
                                        value={formData.discount_value}
                                        onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase text-slate-500 font-black tracking-widest">Data de Expiração</Label>
                                <Input
                                    type="date"
                                    className="bg-slate-800 border-slate-700 h-12"
                                    value={formData.expires_at}
                                    onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-blue-600/5 rounded-xl border border-blue-500/20">
                                <div className="space-y-1">
                                    <Label className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                        <Gift className="w-4 h-4 text-pink-500" /> Especial de Aniversário 🎂
                                    </Label>
                                    <p className="text-[10px] text-slate-500 max-w-[200px]">Marque para destacar este cupom como um presente de aniversário.</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="is_birthday"
                                        checked={formData.is_birthday}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_birthday: checked === true })}
                                        className="w-6 h-6 rounded-md border-blue-500/50 data-[state=checked]:bg-blue-600"
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 mt-2">
                            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs font-bold uppercase tracking-widest h-12">Cancelar</Button>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700 font-bold h-12 flex-1 shadow-lg shadow-blue-600/20"
                                onClick={handleCreate}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                Criar Cupom
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="bg-slate-900 border-slate-800 shadow-xl">
                <CardHeader className="pb-3 px-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <Input
                                placeholder="Buscar código ou nome do cliente..."
                                className="bg-slate-800 border-slate-700 pl-11 h-12 text-base transition-all focus:ring-2 focus:ring-blue-600/20"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" className="bg-slate-800 border-slate-700 h-12 px-5 font-bold text-xs uppercase tracking-widest">
                                <Filter className="w-4 h-4 mr-2" /> Filtrar
                            </Button>
                            <Button variant="outline" className="bg-slate-800 border-slate-700 h-12 px-5 font-bold text-xs uppercase tracking-widest" onClick={fetchData}>
                                <Loader2 className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Atualizar
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950/50 border-b border-slate-800">
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Código</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Destinatário</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Desconto</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Expiração</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center gap-6">
                                                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                                                <span className="text-slate-500 uppercase text-[10px] font-black tracking-widest animate-pulse">Consultando base de vouchers...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredVouchers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center">
                                                    <Ticket className="w-10 h-10 text-slate-700" />
                                                </div>
                                                <div className="text-slate-600 uppercase text-xs font-black tracking-[0.2em]">Nenhum cupom ativo no momento.</div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVouchers.map((v) => {
                                        const status = getStatus(v);
                                        return (
                                            <tr key={v.id} className="hover:bg-slate-800/30 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 font-bold text-sm border border-blue-500/20">
                                                            <Ticket className="w-3.5 h-3.5" /> {v.code}
                                                        </div>
                                                        {v.is_birthday && (
                                                            <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500 animate-bounce" title="Voucher de Aniversário 🎂">
                                                                🎂
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        {v.client_id ? (
                                                            <>
                                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                                                                    <User size={14} />
                                                                </div>
                                                                <span className="text-sm font-bold text-slate-200">{v.clients?.name}</span>
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest font-sans">
                                                                🌍 Global
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2 text-sm font-black text-slate-100">
                                                        {v.discount_type === 'percentage' ? (
                                                            <><Percent size={14} className="text-blue-500" /> {v.discount_value}% OFF</>
                                                        ) : (
                                                            <><DollarSign size={14} className="text-emerald-500" /> R$ {v.discount_value.toFixed(2).replace('.', ',')}</>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-sm text-slate-500 font-medium">
                                                    {v.expires_at ? format(new Date(v.expires_at), 'dd/MM/yyyy', { locale: ptBR }) : 'Permanente'}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border",
                                                        status.color
                                                    )}>
                                                        <status.icon size={12} />
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-10 w-10 p-0 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                                        onClick={() => handleDelete(v.id)}
                                                    >
                                                        <Trash2 className="w-5 h-5" />
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
                <Card className="bg-slate-900 border-slate-800 border-t-4 border-t-blue-500 shadow-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Cupons Disponíveis</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <div className="text-4xl font-black text-slate-100">{vouchers.filter(v => !v.used_at && (!v.expires_at || new Date(v.expires_at) > new Date())).length}</div>
                        <Ticket className="w-8 h-8 text-blue-500 opacity-20" />
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800 border-t-4 border-t-emerald-500 shadow-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Uso Total</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <div className="text-4xl font-black text-slate-100">{vouchers.filter(v => v.used_at).length}</div>
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-20" />
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800 border-t-4 border-t-amber-500 shadow-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Total Descontado</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <div className="text-4xl font-black text-slate-100 flex items-baseline gap-1">
                            <span className="text-lg text-slate-500 font-black">R$</span>
                            {vouchers.filter(v => v.used_at).reduce((acc, v) => acc + (v.discount_value || 0), 0).toFixed(0)}
                        </div>
                        <DollarSign className="w-8 h-8 text-amber-500 opacity-20" />
                    </CardContent>
                </Card>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #334155;
                }
            `}</style>
        </div>
    );
}
