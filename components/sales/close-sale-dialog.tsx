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
    const [step, setStep] = useState<'selection' | 'pix'>('selection');
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
        if (isOpen) fetchData();
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
            <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 p-0 overflow-hidden">
                {step === 'selection' ? (
                    <>
                        <DialogHeader className="p-6 pb-0">
                            <DialogTitle className="text-2xl font-bold">Fechar Conta</DialogTitle>
                        </DialogHeader>

                        <div className="grid grid-cols-2 gap-0 overflow-hidden">
                            {/* Seleção */}
                            <div className="p-6 space-y-6 border-r border-slate-800">
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
                                                <span className="font-medium">{s.name}</span>
                                                <span className="text-blue-400">R$ {s.price.toFixed(2)}</span>
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
                                                <span>{p.name}</span>
                                                <span className="text-emerald-400">R$ {p.price.toFixed(2)}</span>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Resumo */}
                            <div className="p-6 bg-slate-950/50 flex flex-col">
                                <div className="flex-1 space-y-4">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Itens Selecionados</Label>

                                    {selectedItems.length === 0 ? (
                                        <div className="text-center py-10 text-slate-600 text-sm">Nenhum item selecionado.</div>
                                    ) : (
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
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

                                    <div className="pt-4 border-t border-slate-800 space-y-4">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Forma de Pagamento</Label>
                                        <RadioGroup value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)} className="grid grid-cols-1 gap-2">
                                            <div className="flex items-center space-x-2 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                                <RadioGroupItem value="cash" id="cash" />
                                                <Label htmlFor="cash" className="flex flex-1 items-center gap-2 cursor-pointer">
                                                    <Coins size={16} className="text-yellow-500" /> Dinheiro
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                                <RadioGroupItem value="card" id="card" />
                                                <Label htmlFor="card" className="flex flex-1 items-center gap-2 cursor-pointer">
                                                    <CreditCard size={16} className="text-blue-500" /> Cartão
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                                <RadioGroupItem value="pix" id="pix" />
                                                <Label htmlFor="pix" className="flex flex-1 items-center gap-2 cursor-pointer">
                                                    <QrCode size={16} className="text-emerald-500" /> PIX
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                </div>

                                <div className="mt-8 pt-4 border-t border-slate-800 flex justify-between items-center">
                                    <span className="text-slate-400 font-medium">Total</span>
                                    <span className="text-2xl font-black text-slate-100">R$ {total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="p-6 bg-slate-900 border-t border-slate-800">
                            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
                            <Button
                                onClick={handleFinishSale}
                                className="bg-blue-600 hover:bg-blue-700 min-w-32"
                                disabled={loading || selectedItems.length === 0}
                            >
                                {loading ? 'Processando...' : 'Finalizar Venda'}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="p-10 text-center space-y-8">
                        <div className="bg-emerald-500/10 w-20 h-20 rounded-full mx-auto flex items-center justify-center text-emerald-500">
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

                        <div className="space-y-4">
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
            </DialogContent>
        </Dialog>
    );
}
