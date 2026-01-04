'use client';

import { useState, useEffect } from 'react';
import { Api } from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Coins,
    CreditCard,
    QrCode,
    Check,
    Copy,
    X
} from 'lucide-react';
import { Service, Product } from '@/lib/types';

interface CloseSaleDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    queueId: string;
}

export function CloseSaleDialog({ isOpen, onOpenChange, queueId }: CloseSaleDialogProps) {
    const [step, setStep] = useState<'selection' | 'payment' | 'pix'>('selection');
    const [services, setServices] = useState<Service[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedItems, setSelectedItems] = useState<{ id: string; name: string; price: number; type: 'service' | 'product'; qty: number }[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix'>('cash');
    const [loading, setLoading] = useState(false);
    const [pixData, setPixData] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, p] = await Promise.all([Api.getServices(), Api.getProducts()]);
                setServices(s || []);
                setProducts(p || []);
            } catch (err) {
                console.error('Erro ao buscar dados para venda:', err);
            }
        };
        if (isOpen) {
            setStep('selection');
            setSelectedItems([]);
            setPaymentMethod('cash');
            fetchData();
        }
    }, [isOpen]);

    const addItem = (item: any, type: 'service' | 'product') => {
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

    const handleFinishSale = async () => {
        setLoading(true);
        try {
            const payload = {
                services: selectedItems.filter(i => i.type === 'service').map(i => ({ id: i.id, qty: i.qty })),
                products: selectedItems.filter(i => i.type === 'product').map(i => ({ id: i.id, qty: i.qty })),
                payment_method: paymentMethod
            };

            const res = await Api.createSale(queueId, payload);

            if (paymentMethod === 'pix' && res.pix) {
                setPixData(res.pix);
                setStep('pix');
            } else {
                alert('Venda finalizada com sucesso!');
                onOpenChange(false);
            }
        } catch (err: any) {
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
                        {step === 'selection' && '1. O que foi feito?'}
                        {step === 'payment' && '2. Como vai pagar?'}
                        {step === 'pix' && '3. Pagamento PIX'}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex flex-col">
                    {step === 'selection' && (
                        <>
                            <div className="grid grid-cols-2 gap-0 flex-1 overflow-hidden">
                                {/* Seleção */}
                                <div className="p-6 space-y-6 border-r border-slate-800 overflow-y-auto max-h-[400px] custom-scrollbar">
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
                                                    <span className="text-blue-400 shrink-0 ml-2">R$ {s.price.toFixed(2)}</span>
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
                                                    <span className="text-emerald-400 shrink-0 ml-2">R$ {p.price.toFixed(2)}</span>
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
                                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                                {selectedItems.map(item => (
                                                    <div key={item.id} className="flex justify-between items-center group">
                                                        <div>
                                                            <div className="text-sm font-medium">{item.name}</div>
                                                            <div className="text-[10px] text-slate-500">{item.qty}x R$ {item.price.toFixed(2)}</div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">R$ {(item.price * item.qty).toFixed(2)}</span>
                                                            <button onClick={() => removeItem(item.id)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100">
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-slate-800 flex justify-between items-center">
                                        <span className="text-slate-400 font-medium">Total</span>
                                        <span className="text-2xl font-black text-slate-100">R$ {total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="p-6 bg-slate-900 border-t border-slate-800">
                                <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                                <Button
                                    onClick={() => setStep('payment')}
                                    className="bg-blue-600 hover:bg-blue-700 min-w-32"
                                    disabled={selectedItems.length === 0}
                                >
                                    Confirmar Valor
                                </Button>
                            </DialogFooter>
                        </>
                    )}

                    {step === 'payment' && (
                        <div className="p-6 flex flex-col gap-8 flex-1">
                            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-800">
                                <span className="text-slate-400">Valor Total a Pagar</span>
                                <span className="text-3xl font-black text-white">R$ {total.toFixed(2)}</span>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Escolha a forma de pagamento</Label>
                                <RadioGroup value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)} className="grid grid-cols-1 gap-3">
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
                                {pixData?.qrBase64 ? (
                                    <img src={pixData.qrBase64} alt="QR Code PIX" className="w-48 h-48" />
                                ) : (
                                    <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-400">QR Code</div>
                                )}
                            </div>

                            <div className="space-y-4 w-full max-w-sm">
                                <div className="text-3xl font-black">R$ {total.toFixed(2)}</div>

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
                                        onClick={() => {
                                            alert('Atendimento concluído!');
                                            onOpenChange(false);
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
