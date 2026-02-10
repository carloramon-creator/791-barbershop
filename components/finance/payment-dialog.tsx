'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, DollarSign } from 'lucide-react';

interface PaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recordId: string;
    description: string;
    originalValue: number;
    onConfirm: (recordId: string, paidDate: string, paidAmount: number) => Promise<void>;
}

export function PaymentDialog({
    open,
    onOpenChange,
    recordId,
    description,
    originalValue,
    onConfirm
}: PaymentDialogProps) {
    const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
    const [paidAmount, setPaidAmount] = useState(originalValue.toString());
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!paidDate || !paidAmount) {
            alert('Por favor, preencha a data e o valor do pagamento.');
            return;
        }

        const amount = parseFloat(paidAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Por favor, insira um valor válido.');
            return;
        }

        try {
            setLoading(true);
            await onConfirm(recordId, paidDate, amount);
            onOpenChange(false);
            // Reset form
            setPaidDate(new Date().toISOString().split('T')[0]);
            setPaidAmount(originalValue.toString());
        } catch (err) {
            console.error('Error confirming payment:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <DollarSign className="text-green-500" size={24} />
                        Registrar Pagamento
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-xs uppercase text-slate-500 font-bold mb-1">Despesa</p>
                        <p className="text-sm font-semibold text-slate-200">{description}</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Valor original: {originalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-400 text-xs uppercase font-bold flex items-center gap-2">
                            <Calendar size={14} /> Data do Pagamento
                        </Label>
                        <Input
                            type="date"
                            value={paidDate}
                            onChange={e => setPaidDate(e.target.value)}
                            className="bg-slate-800 border-slate-700 h-11"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-400 text-xs uppercase font-bold flex items-center gap-2">
                            <DollarSign size={14} /> Valor Pago (R$)
                        </Label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={paidAmount}
                            onChange={e => setPaidAmount(e.target.value)}
                            className="bg-slate-800 border-slate-700 h-11 text-green-400 font-bold text-lg"
                        />
                        <p className="text-xs text-slate-500">
                            * Você pode alterar o valor se o pagamento foi diferente do valor original
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                        className="border-slate-700 text-slate-400 hover:bg-slate-800"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 font-bold"
                    >
                        {loading ? 'Processando...' : 'Confirmar Pagamento'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
