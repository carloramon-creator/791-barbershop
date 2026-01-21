'use client';

import { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface AsaasCheckoutModalProps {
    checkoutUrl: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function AsaasCheckoutModal({ checkoutUrl, isOpen, onClose }: AsaasCheckoutModalProps) {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== 'https://asaas.com' && event.origin !== 'https://sandbox.asaas.com') {
                return;
            }
            if (event.data?.type === 'checkout_success' || event.data?.status === 'success') {
                onClose();
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onClose]);

    // Detectar se é um PDF (provavelmente Boleto)
    const isPdf = checkoutUrl.toLowerCase().includes('.pdf') || checkoutUrl.includes('bankSlip');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-full h-[90vh] p-0 bg-white overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-900">
                        {isPdf ? 'Visualizar Boleto' : 'Finalizar Pagamento'}
                    </h2>
                    <div className="flex items-center gap-2">
                        <a
                            href={checkoutUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Abrir em nova aba
                        </a>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                </div>

                {/* Iframe */}
                <div className="relative w-full h-full pb-16"> {/* Padding bottom para não cortar */}
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                            <div className="text-center space-y-4">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="text-slate-600 font-medium">Carregando...</p>
                            </div>
                        </div>
                    )}

                    <iframe
                        src={checkoutUrl}
                        className="w-full h-full border-0"
                        onLoad={() => setIsLoading(false)}
                        title="Checkout Asaas"
                        allow="payment"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
