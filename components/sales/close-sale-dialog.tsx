'use client';

import { useState, useEffect } from 'react';
import { Api } from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import Image from "next/image";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Coins,
    CreditCard,
    QrCode,
    Check,
    Copy,
    X,
    AlertCircle,
    XCircle
} from 'lucide-react';
import { Service, Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

interface CloseSaleDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    queueId?: string;
    appointmentId?: string;
    initialServiceIds?: string[];
    onSuccess?: () => void;
    mode?: 'finish' | 'draft';
    initialDraftItems?: SelectedItem[];
}

interface SelectedItem {
    id: string;
    name: string;
    price: number;
    type: 'service' | 'product';
    qty: number;
}
// ...
export function CloseSaleDialog({ isOpen, onOpenChange, queueId, appointmentId, initialServiceIds, onSuccess, mode = 'finish', initialDraftItems }: CloseSaleDialogProps) {
    const [step, setStep] = useState<'selection' | 'payment' | 'pix'>('selection');
    const [services, setServices] = useState<Service[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix'>('cash');
    const [voucherCode, setVoucherCode] = useState('');
    const [isVoucherValid, setIsVoucherValid] = useState<boolean | null>(null);
    const [voucherError, setVoucherError] = useState<string | null>(null);
    const [appliedDiscount, setAppliedDiscount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [validatingVoucher, setValidatingVoucher] = useState(false);
    const [pixData, setPixData] = useState<{ copyText?: string; qrBase64?: string } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, p] = await Promise.all([Api.getServices(), Api.getProducts()]);
                const servicesData = s || [];
                setServices(servicesData);
                setProducts(p || []);

                let freshItems: SelectedItem[] = [];

                // Fetch latest draft items from server to avoid stale props
                if (queueId) {
                    try {
                        const qStatus = await Api.getQueueStatus();
                        let myItem: any = null;
                        if (Array.isArray(qStatus)) {
                            for (const b of qStatus) {
                                const found = b.queue.find((q: any) => q.id === queueId);
                                if (found) { myItem = found; break; }
                            }
                        }
                        if (myItem && myItem.draft_items) {
                            freshItems = myItem.draft_items;
                        }
                    } catch (e) { console.error('Error fetching fresh queue draft:', e); }
                } else if (appointmentId) {
                    try {
                        const allAppointments = await Api.getAllAppointments();
                        const myAppt = allAppointments.find((a: any) => a.id === appointmentId);
                        if (myAppt && myAppt.draft_items) {
                            freshItems = myAppt.draft_items;
                        }
                    } catch (e) { console.error('Error fetching fresh appointment draft:', e); }
                }

                // Priority: Use Draft (Props or Fresh) and merge with Initial Service IDs if missing
                let finalItems: SelectedItem[] = [];
                let baseItems: SelectedItem[] = (initialDraftItems && initialDraftItems.length > 0) ? initialDraftItems : freshItems;

                if (baseItems.length > 0) {
                    finalItems = [...baseItems];

                    // Se temos serviços iniciais, garantimos que eles estejam no draft
                    if (initialServiceIds && initialServiceIds.length > 0) {
                        const existingServiceIds = baseItems.filter(i => i.type === 'service').map(i => i.id);
                        const missingServices = servicesData
                            .filter((srv: Service) => initialServiceIds.includes(srv.id) && !existingServiceIds.includes(srv.id))
                            .map((srv: Service) => ({
                                id: srv.id,
                                name: srv.name,
                                price: srv.price,
                                type: 'service' as const,
                                qty: 1
                            }));

                        if (missingServices.length > 0) {
                            finalItems = [...finalItems, ...missingServices];
                        }
                    }
                } else if (initialServiceIds && initialServiceIds.length > 0) {
                    finalItems = servicesData
                        .filter((srv: Service) => initialServiceIds.includes(srv.id))
                        .map((srv: Service) => ({
                            id: srv.id,
                            name: srv.name,
                            price: srv.price,
                            type: 'service' as const,
                            qty: 1
                        }));
                }
                setSelectedItems(finalItems);
            } catch (err) {
                console.error('Erro ao buscar dados para venda:', err);
            }
        };
        if (isOpen) {
            setStep('selection');
            // Removed: if (!initialDraftItems) setSelectedItems([]); to allow fetchData to correctly populate selectedItems
            setPaymentMethod('cash');
            setVoucherCode('');
            setIsVoucherValid(null);
            setVoucherError(null);
            setAppliedDiscount(0);
            fetchData();
        }
    }, [isOpen]);

    const addItem = (item: Service | Product, type: 'service' | 'product') => {
        const existing = selectedItems.find(i => i.id === item.id);
        if (existing) {
            setSelectedItems(selectedItems.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
        } else {
            setSelectedItems([...selectedItems, { ...item, type, qty: 1 }]);
        }
    };

    const removeItem = (id: string) => {
        setSelectedItems(selectedItems.filter(i => i.id !== id));
    };

    const total = selectedItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const servicesTotal = selectedItems.filter(i => i.type === 'service').reduce((acc, item) => acc + (item.price * item.qty), 0);
    const finalTotal = Math.max(0, total - appliedDiscount);

    const handleValidateVoucher = async () => {
        if (!voucherCode.trim()) return;
        setValidatingVoucher(true);
        setIsVoucherValid(null);
        setVoucherError(null);
        setAppliedDiscount(0);

        try {
            const vouchers = await Api.validateVoucher(voucherCode.trim());
            const voucher = vouchers[0];

            if (!voucher) {
                setIsVoucherValid(false);
                setVoucherError('Cupom não encontrado.');
                return;
            }

            if (voucher.used_at) {
                setIsVoucherValid(false);
                setVoucherError('Cupom já utilizado.');
                return;
            }

            if (new Date(voucher.expires_at) < new Date()) {
                setIsVoucherValid(false);
                setVoucherError('Cupom expirado.');
                return;
            }

            setIsVoucherValid(true);

            let disc = 0;
            if (voucher.discount_type === 'percentage') {
                disc = (servicesTotal * Number(voucher.discount_value)) / 100;
            } else {
                disc = Math.min(Number(voucher.discount_value), servicesTotal);
            }
            setAppliedDiscount(disc);

        } catch (err: any) {
            setIsVoucherValid(false);
            setVoucherError('Erro ao validar cupom.');
        } finally {
            setValidatingVoucher(false);
        }
    };

    useEffect(() => {
        if (isVoucherValid && voucherCode) {
            handleValidateVoucher();
        }
    }, [total]);

    const handleSaveDraft = async () => {
        setLoading(true);
        try {
            if (queueId) {
                await Api.saveQueueDraft(queueId, selectedItems);
            } else if (appointmentId) {
                await Api.saveAppointmentDraft(appointmentId, selectedItems);
            }
            alert('Comanda salva com sucesso!');
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleFinishSale = async () => {
        if (!queueId) return alert('ID da fila não encontrado');
        setLoading(true);
        try {
            const payload = {
                services: selectedItems.filter(i => i.type === 'service').map(i => ({ id: i.id, qty: i.qty })),
                products: selectedItems.filter(i => i.type === 'product').map(i => ({ id: i.id, qty: i.qty })),
                payment_method: paymentMethod,
                voucher_code: voucherCode || null
            };

            const res = await Api.createSale(queueId!, payload);

            if (paymentMethod === 'pix' && res.pix) {
                setPixData(res.pix);
                setStep('pix');
            } else {
                // Se não for PIX, finalizamos o atendimento e a venda agora
                await Api.finishService(queueId);
                alert('Venda finalizada com sucesso!');
                onOpenChange(false);
                if (onSuccess) onSuccess();
            }
        } catch (err: unknown) {
            const error = err as Error;
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJustFinish = async () => {
        if (!queueId) return alert('ID da fila não encontrado');
        if (!confirm('Deseja finalizar o atendimento sem registrar nenhuma venda?')) return;
        setLoading(true);
        try {
            await Api.finishService(queueId);
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error: unknown) {
            const err = error as Error;
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 p-0 overflow-hidden min-h-[500px] flex flex-col">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        {step === 'selection' && (mode === 'draft' ? 'Abrir/Editar Comanda' : '1. O que foi feito?')}
                        {step === 'payment' && '2. Como vai pagar?'}
                        {step === 'pix' && '3. Pagamento PIX'}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'draft'
                            ? 'Adicione itens à comanda. Eles ficarão salvos até finalizar.'
                            : (step === 'selection' ? 'Selecione os serviços e produtos realizados.' : 'Confira o total e escolha o método de pagamento.')}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex flex-col overflow-hidden">
                    {step === 'selection' && (
                        <>
                            <div className="grid grid-cols-2 gap-0 flex-1 overflow-hidden">
                                {/* Seleção */}
                                <div className="p-6 space-y-6 border-r border-slate-800 overflow-y-auto max-h-[400px] custom-scrollbar">
                                    {/* ... selection buttons ... */}
                                    <div className="space-y-3">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Serviços</Label>
                                        <div className="space-y-2">
                                            {services.map(s => (
                                                <Button
                                                    key={s.id}
                                                    variant="outline"
                                                    className="w-full justify-between bg-slate-800/50 border-slate-700 hover:border-blue-500 hover:bg-blue-500/10 text-xs h-auto py-3"
                                                    onClick={() => addItem(s, 'service')}
                                                >
                                                    <span className="font-medium text-left">{s.name}</span>
                                                    <span className="text-blue-400 shrink-0 ml-2">{formatCurrency(s.price)}</span>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Produtos</Label>
                                        <div className="space-y-2">
                                            {products.map(p => (
                                                <Button
                                                    key={p.id}
                                                    variant="outline"
                                                    className="w-full justify-between bg-slate-800/50 border-slate-700 hover:border-blue-500 hover:bg-blue-500/10 text-xs h-auto py-3"
                                                    onClick={() => addItem(p, 'product')}
                                                >
                                                    <span className="font-medium text-left">{p.name}</span>
                                                    <span className="text-emerald-400 shrink-0 ml-2">{formatCurrency(p.price)}</span>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Resumo Parcial */}
                                <div className="p-6 bg-slate-950/50 flex flex-col">
                                    <div className="flex-1 space-y-4">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Itens Selecionados</Label>

                                        {selectedItems.length === 0 ? (
                                            <div className="text-center py-10 text-slate-600 text-sm">Nenhum item selecionado.</div>
                                        ) : (
                                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                                {selectedItems.map(item => (
                                                    <div key={item.id} className="flex justify-between items-center group">
                                                        <div>
                                                            <div className="text-sm font-medium">{item.name}</div>
                                                            <div className="text-[10px] text-slate-500">{item.qty}x {formatCurrency(item.price)}</div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">{formatCurrency(item.price * item.qty)}</span>
                                                            <button onClick={() => removeItem(item.id)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100">
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto space-y-4">
                                        <div className="pt-4 border-t border-slate-800 space-y-3">
                                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cupom de Desconto</Label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Input
                                                        placeholder="Código"
                                                        value={voucherCode}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                            setVoucherCode(e.target.value.toUpperCase());
                                                            setIsVoucherValid(null);
                                                            setVoucherError(null);
                                                            setAppliedDiscount(0);
                                                        }}
                                                        className={`bg-slate-900 border-slate-700 text-xs h-9 uppercase font-mono pr-8 ${isVoucherValid === true ? 'border-emerald-500/50' : isVoucherValid === false ? 'border-red-500/50' : ''}`}
                                                    />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                        {isVoucherValid === true && <Check size={14} className="text-emerald-500" />}
                                                        {isVoucherValid === false && <XCircle size={14} className="text-red-500" />}
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="h-9 px-3 text-xs bg-slate-800 hover:bg-slate-700"
                                                    onClick={handleValidateVoucher}
                                                    disabled={validatingVoucher || !voucherCode}
                                                >
                                                    {validatingVoucher ? '...' : 'OK'}
                                                </Button>
                                            </div>
                                            {voucherError && <p className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {voucherError}</p>}
                                        </div>

                                        <div className="pt-4 border-t border-slate-800 space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400">Subtotal</span>
                                                <span className="text-slate-200">{formatCurrency(total)}</span>
                                            </div>
                                            {appliedDiscount > 0 && (
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-emerald-400 flex items-center gap-1">Desconto nos Serviços</span>
                                                    <span className="text-emerald-400">- {formatCurrency(appliedDiscount)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center pt-2">
                                                <span className="text-slate-400 font-bold">Total Final</span>
                                                <span className="text-2xl font-black text-slate-100">{formatCurrency(finalTotal)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="p-6 bg-slate-900 border-t border-slate-800 flex justify-between sm:justify-between">
                                <div className="flex gap-2">
                                    <Button variant="ghost" className="text-slate-500 hover:text-slate-300" onClick={() => onOpenChange(false)}>Cancelar</Button>
                                    {mode === 'finish' && <Button variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-500/10 text-xs" onClick={handleJustFinish}>Fechar s/ Venda</Button>}
                                </div>

                                {mode === 'draft' ? (
                                    <Button
                                        onClick={handleSaveDraft}
                                        className="bg-blue-600 hover:bg-blue-700 min-w-32 text-white"
                                        disabled={loading}
                                    >
                                        {loading ? 'Salvando...' : 'Salvar Comanda'}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => setStep('payment')}
                                        className="bg-blue-600 hover:bg-blue-700 min-w-32"
                                        disabled={selectedItems.length === 0}
                                    >
                                        Confirmar Valor
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}

                    {step === 'payment' && (
                        <div className="p-6 flex flex-col gap-8 flex-1 overflow-y-auto">
                            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-800">
                                <div>
                                    <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Valor Total a Pagar</span>
                                    <span className="text-3xl font-black text-white">{formatCurrency(finalTotal)}</span>
                                </div>
                                {appliedDiscount > 0 && (
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-emerald-500 uppercase block">Desconto s/ Serviços</span>
                                        <span className="text-sm font-bold text-emerald-500">{formatCurrency(appliedDiscount)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <Label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Escolha a forma de pagamento</Label>
                                <RadioGroup value={paymentMethod} onValueChange={(val: 'cash' | 'card' | 'pix') => setPaymentMethod(val)} className="grid grid-cols-1 gap-3">
                                    <div className={`flex items-center space-x-2 p-4 rounded-xl border transition-all cursor-pointer ${paymentMethod === 'pix' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}`}>
                                        <RadioGroupItem value="pix" id="pix" />
                                        <Label htmlFor="pix" className="flex flex-1 items-center gap-3 cursor-pointer">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                                <QrCode size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">PIX QR Code</div>
                                                <div className="text-xs text-slate-400">Gera um código instantâneo</div>
                                            </div>
                                        </Label>
                                    </div>

                                    <div className={`flex items-center space-x-2 p-4 rounded-xl border transition-all cursor-pointer ${paymentMethod === 'cash' ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}`}>
                                        <RadioGroupItem value="cash" id="cash" />
                                        <Label htmlFor="cash" className="flex flex-1 items-center gap-3 cursor-pointer">
                                            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                                                <Coins size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">Dinheiro</div>
                                                <div className="text-xs text-slate-400">Pagamento em espécie</div>
                                            </div>
                                        </Label>
                                    </div>

                                    <div className={`flex items-center space-x-2 p-4 rounded-xl border transition-all cursor-pointer ${paymentMethod === 'card' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}`}>
                                        <RadioGroupItem value="card" id="card" />
                                        <Label htmlFor="card" className="flex flex-1 items-center gap-3 cursor-pointer">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                                                <CreditCard size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">Cartão de Crédito/Débito</div>
                                                <div className="text-xs text-slate-400">Maquininha física</div>
                                            </div>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <DialogFooter className="mt-auto pt-6 border-t border-slate-800">
                                <Button variant="ghost" onClick={() => setStep('selection')} disabled={loading}>Voltar</Button>
                                <Button
                                    onClick={handleFinishSale}
                                    className="bg-green-600 hover:bg-green-700 min-w-40 h-12 text-lg font-bold shadow-lg shadow-green-900/20"
                                    disabled={loading}
                                >
                                    {loading ? 'Processando...' : 'Finalizar e Receber'}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}

                    {step === 'pix' && (
                        <div className="p-10 text-center space-y-8 flex-1 flex flex-col items-center justify-center animate-in fade-in slide-in-from-right-4">
                            <div className="bg-emerald-500/10 w-20 h-20 rounded-full mx-auto flex items-center justify-center text-emerald-500 mb-4">
                                <QrCode size={40} />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">Pagamento via PIX</h2>
                                <p className="text-slate-400 text-sm">Mostre o QR Code abaixo ao cliente ou copie o código.</p>
                            </div>

                            <div className="bg-white p-4 rounded-xl inline-block shadow-2xl shadow-emerald-500/10">
                                {pixData?.copyText ? (
                                    <QRCodeSVG value={pixData.copyText} size={192} />
                                ) : pixData?.qrBase64 ? (
                                    <Image src={pixData.qrBase64} alt="QR Code PIX" width={192} height={192} className="w-48 h-48" unoptimized />
                                ) : (
                                    <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-400">QR Code Indisponível</div>
                                )}
                            </div>

                            <div className="space-y-4 w-full max-w-sm">
                                <div className="text-3xl font-black">{formatCurrency(finalTotal)}</div>

                                <div className="flex gap-2 justify-center">
                                    <Button
                                        variant="outline"
                                        className="bg-slate-800 border-slate-700 hover:bg-slate-700 flex-1"
                                        onClick={() => {
                                            navigator.clipboard.writeText(pixData?.copyText || '');
                                            alert('Código PIX copiado!');
                                        }}
                                    >
                                        <Copy size={16} className="mr-2" /> Copiar Código
                                    </Button>
                                    <Button
                                        className="bg-emerald-600 hover:bg-emerald-700 flex-1"
                                        onClick={async () => {
                                            if (!queueId) return alert('ID da fila não encontrado');
                                            try {
                                                await Api.finishService(queueId);
                                                alert('Atendimento concluído!');
                                                onOpenChange(false);
                                                if (onSuccess) onSuccess();
                                            } catch (err: unknown) {
                                                const error = err as Error;
                                                alert(error.message);
                                            }
                                        }}
                                    >
                                        <Check size={16} className="mr-2" /> Já Recebi
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
