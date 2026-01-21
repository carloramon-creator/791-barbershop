'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, DollarSign, TrendingUp, TrendingDown, Calendar, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Api } from '@/lib/api';

interface NewTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function NewTransactionDialog({ open, onOpenChange, onSuccess }: NewTransactionDialogProps) {
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<'revenue' | 'expense'>('expense');

    // Form States
    const [description, setDescription] = useState('');
    const [value, setValue] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<'paid' | 'pending'>('paid');
    const [businessUnit, setBusinessUnit] = useState('holding');

    const handleSubmit = async () => {
        if (!description || !value || !date) return;

        try {
            setLoading(true);

            // Clean currency mask to number
            const numberValue = parseFloat(value.replace('R$', '').replace('.', '').replace(',', '.').trim());

            await Api.createSystemFinanceRecord({
                type,
                description,
                value: numberValue,
                category: category || (type === 'expense' ? 'Despesa Operacional' : 'Receita Extra'),
                date,
                status,
                business_unit: businessUnit,
                payment_method: 'manual',
                metadata: {
                    source: 'manual_entry',
                    created_via: 'admin_dashboard'
                }
            });

            onSuccess();
            onOpenChange(false);

            // Reset form
            setDescription('');
            setValue('');
            setCategory('');
            setStatus('paid');

        } catch (error) {
            console.error(error);
            alert('Erro ao salvar lançamento. Verifique os dados.');
        } finally {
            setLoading(false);
        }
    };

    const categories = type === 'expense'
        ? ['Infraestrutura', 'Marketing', 'Equipe', 'Imostos', 'Pro-labore', 'Outros']
        : ['Consultoria', 'Projeto Extra', 'Venda de Ativos', 'Outros'];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-slate-900 border-slate-800 p-0 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-100 uppercase tracking-tight">Novo Lançamento</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Financeiro Holding</p>
                    </div>
                    <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
                        <Wallet size={20} />
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Type Selector */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setType('expense')}
                            className={cn(
                                "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-xs font-bold uppercase",
                                type === 'expense'
                                    ? "bg-red-500/10 border-red-500 text-red-500"
                                    : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <TrendingDown size={16} />
                            Despesa
                        </button>
                        <button
                            onClick={() => setType('revenue')}
                            className={cn(
                                "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-xs font-bold uppercase",
                                type === 'revenue'
                                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                                    : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <TrendingUp size={16} />
                            Receita
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Descrição</Label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={type === 'expense' ? "Ex: Servidor AWS, Anúncio Instagram..." : "Ex: Consultoria Técnica..."}
                                className="bg-slate-950 border-slate-800 text-white"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Valor (R$)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input
                                        type="number"
                                        value={value}
                                        onChange={(e) => setValue(e.target.value)}
                                        placeholder="0,00"
                                        className="pl-9 bg-slate-950 border-slate-800 text-white"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Data</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="pl-9 bg-slate-950 border-slate-800 text-white [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Categoria</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        {categories.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Status</Label>
                                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        <SelectItem value="paid">Pago / Recebido</SelectItem>
                                        <SelectItem value="pending">Pendente / A Pagar</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Unidade de Negócio</Label>
                            <Select value={businessUnit} onValueChange={setBusinessUnit}>
                                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    <SelectItem value="holding">Holding (791 Soluções)</SelectItem>
                                    <SelectItem value="barber">791 Barber (Aporte)</SelectItem>
                                    <SelectItem value="beauty">791 Beauty (Aporte)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !description || !value}
                        className={cn(
                            "w-full h-12 font-bold uppercase tracking-widest text-xs shadow-lg",
                            type === 'expense'
                                ? "bg-red-600 hover:bg-red-700 text-white shadow-red-900/20"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20"
                        )}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        {type === 'expense' ? 'Registrar Despesa' : 'Registrar Receita'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
