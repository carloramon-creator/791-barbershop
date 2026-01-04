'use client';

import { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { FileText, DollarSign, Download } from 'lucide-react';
import { Sale } from '@/lib/types';

interface BarberClosingDialogProps {
    isOpen: boolean;
    onClose: () => void;
    barberName: string;
    barberId: string;
    sales: Sale[];
    onConfirm: (barberId: string, total: number, bonus: number, saleIds: string[]) => void;
    loading: boolean;
}

export function BarberClosingDialog({
    isOpen,
    onClose,
    barberName,
    barberId,
    sales,
    onConfirm,
    loading
}: BarberClosingDialogProps) {
    const [bonus, setBonus] = useState(0);

    const totals = useMemo(() => {
        const gross = sales.reduce((acc, sale) => acc + (sale.total_amount || 0), 0);
        const commission = sales.reduce((acc, sale) => acc + (sale.commission_value || 0), 0);
        return { gross, commission, net: commission + bonus };
    }, [sales, bonus]);

    const handleConfirm = () => {
        const saleIds = sales.map(s => s.id);
        onConfirm(barberId, totals.net, bonus, saleIds);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl bg-slate-900 border-slate-800 text-slate-100">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-600/20 p-2 rounded-lg">
                            <FileText className="text-blue-500" size={24} />
                        </div>
                        <DialogTitle className="text-2xl font-black italic">Fechamento: {barberName}</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Faturamento Bruto</Label>
                            <div className="text-xl font-black text-slate-100 mt-1">
                                {totals.gross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Comissão Total</Label>
                            <div className="text-xl font-black text-emerald-400 mt-1">
                                {totals.commission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </div>
                        <div className="bg-blue-600/10 p-4 rounded-xl border border-blue-500/20">
                            <Label className="text-[10px] uppercase font-bold text-blue-400 tracking-widest">Total a Pagar</Label>
                            <div className="text-xl font-black text-blue-400 mt-1">
                                {(totals.commission + bonus).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800/30 rounded-xl border border-slate-800 overflow-hidden max-h-[300px] overflow-y-auto font-mono text-xs">
                        <Table>
                            <TableHeader className="bg-slate-800/50 sticky top-0">
                                <TableRow>
                                    <TableHead className="text-slate-400 font-bold uppercase">Data</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase">Cliente</TableHead>
                                    <TableHead className="text-right text-slate-400 font-bold uppercase">Valor</TableHead>
                                    <TableHead className="text-right text-emerald-400 font-bold uppercase">Comissão</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sales.map((sale) => (
                                    <TableRow key={sale.id} className="border-slate-800 hover:bg-slate-800/30">
                                        <TableCell className="text-slate-400">
                                            {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                                        </TableCell>
                                        <TableCell className="text-slate-200 font-medium">
                                            {sale.client_queue?.client_name || 'Balcão'}
                                        </TableCell>
                                        <TableCell className="text-right text-slate-400">
                                            {(sale.total_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </TableCell>
                                        <TableCell className="text-right text-emerald-400 font-bold">
                                            {(sale.commission_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {sales.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-slate-500 italic">
                                            Nenhum serviço pendente de fechamento.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-end gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <div className="flex-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Adicionar Bônus/Ajuste (R$)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <Input
                                    type="number"
                                    value={bonus}
                                    onChange={(e) => setBonus(Number(e.target.value))}
                                    className="bg-slate-900 border-slate-700 pl-10 h-11 focus:ring-blue-500"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="h-11 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300"
                            onClick={() => {
                                window.open(`/reports/fechamento?barberId=${barberId}&bonus=${bonus}`, '_blank');
                            }}
                        >
                            <Download size={18} className="mr-2" />
                            Relatório
                        </Button>
                    </div>
                </div>

                <DialogFooter className="mt-8">
                    <Button variant="ghost" onClick={onClose} disabled={loading} className="text-slate-400 hover:text-slate-200">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading || sales.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-blue-900/20"
                    >
                        {loading ? 'Processando...' : 'Confirmar Fechamento'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
