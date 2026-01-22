'use client';

import { useState, useEffect } from 'react';
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
    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    // Form States
    const [description, setDescription] = useState('');
    const [value, setValue] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<'paid' | 'pending'>('paid');
    const [businessUnit, setBusinessUnit] = useState('holding');

    // Recurrence State
    const [isRecurrent, setIsRecurrent] = useState(false);
    const [recurrenceInterval, setRecurrenceInterval] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
    const [recurrenceCount, setRecurrenceCount] = useState('12');

    // Load Data on Open
    useEffect(() => {
        if (open) {
            loadAuxData();
        }
    }, [open, type]);

    async function loadAuxData() {
        setLoadingData(true);
        try {
            const [accs, cats] = await Promise.all([
                Api.getHoldingAccounts(),
                Api.getHoldingCategories(type === 'revenue' ? 'income' : 'expense')
            ]);
            setAccounts(accs || []);
            setCategories(cats || []);

            // Set default account if none selected
            if (!accountId && accs && accs.length > 0) {
                const defaultAcc = accs.find((a: any) => a.is_default) || accs[0];
                setAccountId(defaultAcc.id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingData(false);
        }
    }

    const handleSubmit = async () => {
        if (!description || !value || !date || !accountId || !categoryId) {
            alert('Preencha todos os campos obrigatórios (Descrição, Valor, Data, Conta e Categoria).');
            return;
        }

        try {
            setLoading(true);

            // Clean currency mask to number
            const numberValue = parseFloat(value.replace('R$', '').replace('.', '').replace(',', '.').trim());

            // Find category name for legacy support or display
            const selectedCategory = categories.find(c => c.id === categoryId);

            const basePayload = {
                type,
                description,
                value: numberValue,
                category_id: categoryId, // New Relation
                category: selectedCategory?.name || 'Geral', // Legacy/Fallback
                account_id: accountId, // New Relation
                status,
                business_unit: businessUnit,
                payment_method: 'manual',
                metadata: {
                    source: 'manual_entry',
                    created_via: 'admin_dashboard'
                }
            };

            // Criar lançamentos (único ou recorrente)
            const promises = [];
            const count = isRecurrent ? parseInt(recurrenceCount) : 1;
            const startDate = new Date(date);
            const recurrenceGroupId = isRecurrent ? crypto.randomUUID() : null;

            for (let i = 0; i < count; i++) {
                const currentDate = new Date(startDate);

                if (i > 0) { // Incrementar data para as próximas parcelas
                    if (recurrenceInterval === 'monthly') currentDate.setMonth(currentDate.getMonth() + i);
                    if (recurrenceInterval === 'weekly') currentDate.setDate(currentDate.getDate() + (i * 7));
                    if (recurrenceInterval === 'yearly') currentDate.setFullYear(currentDate.getFullYear() + i);
                }

                promises.push(Api.createSystemFinanceRecord({
                    ...basePayload,
                    date: currentDate.toISOString().split('T')[0],
                    description: isRecurrent ? `${description} (${i + 1}/${count})` : description,
                    metadata: {
                        ...basePayload.metadata,
                        recurrence: isRecurrent ? {
                            id: recurrenceGroupId,
                            current: i + 1,
                            total: count,
                            interval: recurrenceInterval
                        } : null
                    }
                }));
            }

            await Promise.all(promises);

            onSuccess();
            onOpenChange(false);

            // Reset form
            setDescription('');
            setValue('');
            setCategoryId('');
            setStatus('paid');
            setIsRecurrent(false);

        } catch (error) {
            console.error(error);
            alert('Erro ao salvar lançamento. Verifique os dados.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-slate-900 border-slate-800 p-0 overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between sticky top-0 z-10">
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
                                placeholder={type === 'expense' ? "Ex: Servidor AWS..." : "Ex: Consultoria..."}
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
                                <Label className="text-xs font-bold text-slate-500 uppercase">Data Inicial</Label>
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
                                <Label className="text-xs font-bold text-slate-500 uppercase">Conta Bancária</Label>
                                <Select value={accountId} onValueChange={setAccountId}>
                                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        {accounts.map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Categoria</Label>
                                <Select value={categoryId} onValueChange={setCategoryId}>
                                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-[200px]">
                                        {categories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                <div className="flex items-center gap-2">
                                                    {cat.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />}
                                                    {cat.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                        {categories.length === 0 && (
                                            <div className="p-2 text-[10px] text-slate-500 text-center">Nenhuma categoria encontrada.</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Status Inicial</Label>
                                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                    <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        <SelectItem value="paid">Pago / Efetuado</SelectItem>
                                        <SelectItem value="pending">Pendente / Agendado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Recorrência */}
                        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                    <TrendingUp size={14} className="text-blue-500" />
                                    Repetir Lançamento?
                                </Label>
                                <div
                                    className={cn("w-10 h-5 rounded-full relative cursor-pointer transition-colors", isRecurrent ? "bg-blue-600" : "bg-slate-700")}
                                    onClick={() => setIsRecurrent(!isRecurrent)}
                                >
                                    <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", isRecurrent ? "left-6" : "left-1")} />
                                </div>
                            </div>

                            {isRecurrent && (
                                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Frequência</Label>
                                        <Select value={recurrenceInterval} onValueChange={(v: any) => setRecurrenceInterval(v)}>
                                            <SelectTrigger className="h-9 bg-slate-900 border-slate-700 text-white text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                                <SelectItem value="monthly">Mensal</SelectItem>
                                                <SelectItem value="weekly">Semanal</SelectItem>
                                                <SelectItem value="yearly">Anual</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Repetições (Vezes)</Label>
                                        <Input
                                            type="number"
                                            value={recurrenceCount}
                                            onChange={(e) => setRecurrenceCount(e.target.value)}
                                            className="h-9 bg-slate-900 border-slate-700 text-white text-xs"
                                        />
                                    </div>
                                    <p className="col-span-2 text-[10px] text-blue-400/80 text-center font-medium">
                                        Serão criados {recurrenceCount} lançamentos futuros automaticamente.
                                    </p>
                                </div>
                            )}
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
