'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, Tag, User, CreditCard, AlertCircle } from 'lucide-react';
import { FinanceRecord } from '@/lib/types';

interface TransactionDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: FinanceRecord | null;
}

export function TransactionDetailsDialog({
    open,
    onOpenChange,
    record
}: TransactionDetailsDialogProps) {
    if (!record) return null;

    const hasDifferentValue = record.paid_amount && record.paid_amount !== record.value;
    const hasDifferentDate = record.paid_date && record.paid_date !== record.date;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl">Detalhes da Transação</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Description and Status */}
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <p className="text-sm font-bold text-slate-200">{record.description}</p>
                                <p className="text-xs text-slate-500 uppercase font-bold mt-1 flex items-center gap-1">
                                    <Tag size={12} /> {record.finance_categories?.name || 'Diversos'}
                                </p>
                            </div>
                            <Badge
                                variant="secondary"
                                className={
                                    record.is_paid
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                }
                            >
                                {record.is_paid ? 'Pago' : 'Pendente'}
                            </Badge>
                        </div>

                        {record.barbers?.name && (
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                                <User size={12} /> {record.barbers.name}
                            </p>
                        )}
                    </div>

                    {/* Original Date and Value */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-800">
                            <p className="text-xs uppercase text-slate-500 font-bold mb-1 flex items-center gap-1">
                                <Calendar size={12} /> Data de Vencimento
                            </p>
                            <p className="text-sm font-semibold text-slate-300">
                                {new Date(record.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </p>
                        </div>

                        <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-800">
                            <p className="text-xs uppercase text-slate-500 font-bold mb-1 flex items-center gap-1">
                                <DollarSign size={12} /> Valor Original
                            </p>
                            <p className="text-sm font-semibold text-red-400">
                                {record.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                        </div>
                    </div>

                    {/* Payment Details (if paid) */}
                    {record.is_paid && (
                        <>
                            <div className="border-t border-slate-800 pt-4">
                                <p className="text-xs uppercase text-emerald-500 font-bold mb-3 flex items-center gap-1">
                                    <CreditCard size={12} /> Informações de Pagamento
                                </p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`p-3 rounded-lg border ${hasDifferentDate ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-800/30 border-slate-800'}`}>
                                        <p className="text-xs uppercase text-slate-500 font-bold mb-1 flex items-center gap-1">
                                            <Calendar size={12} /> Data do Pagamento
                                        </p>
                                        <p className="text-sm font-semibold text-slate-200">
                                            {record.paid_date
                                                ? new Date(record.paid_date + 'T00:00:00').toLocaleDateString('pt-BR')
                                                : new Date(record.date + 'T00:00:00').toLocaleDateString('pt-BR')
                                            }
                                        </p>
                                        {hasDifferentDate && (
                                            <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                                                <AlertCircle size={10} /> Data alterada
                                            </p>
                                        )}
                                    </div>

                                    <div className={`p-3 rounded-lg border ${hasDifferentValue ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-800/30 border-slate-800'}`}>
                                        <p className="text-xs uppercase text-slate-500 font-bold mb-1 flex items-center gap-1">
                                            <DollarSign size={12} /> Valor Pago
                                        </p>
                                        <p className="text-sm font-semibold text-emerald-400">
                                            {(record.paid_amount || record.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </p>
                                        {hasDifferentValue && (
                                            <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                                                <AlertCircle size={10} /> Valor ajustado
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {(hasDifferentValue || hasDifferentDate) && (
                                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                                    <p className="text-xs text-blue-400">
                                        <strong>Observação:</strong> Os valores de pagamento foram ajustados em relação aos valores originais.
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Additional Info */}
                    {record.is_recurring && (
                        <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-lg">
                            <p className="text-xs text-purple-400 font-bold uppercase mb-1">Despesa Recorrente</p>
                            <p className="text-xs text-slate-400">
                                Período: {record.recurrence_period === 'month' ? 'Mensal' :
                                    record.recurrence_period === 'week' ? 'Semanal' :
                                        record.recurrence_period === 'day' ? 'Diária' : 'Anual'}
                            </p>
                        </div>
                    )}

                    <div className="text-xs text-slate-600 pt-2 border-t border-slate-800">
                        Criado em: {new Date(record.created_at).toLocaleString('pt-BR')}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
