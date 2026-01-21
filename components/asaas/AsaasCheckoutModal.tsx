'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface AsaasCheckoutModalProps {
    checkoutUrl: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function AsaasCheckoutModal({ checkoutUrl, isOpen, onClose }: AsaasCheckoutModalProps) {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Escutar mensagens do iframe (se o Asaas enviar)
        const handleMessage = (event: MessageEvent) => {
            // Verificar origem por segurança
            if (event.origin !== 'https://asaas.com' && event.origin !== 'https://sandbox.asaas.com') {
                return;
            }

            console.log('[ASAAS CHECKOUT] Mensagem recebida:', event.data);

            // Se receber mensagem de sucesso, fechar modal
            if (event.data?.type === 'checkout_success' || event.data?.status === 'success') {
                onClose();
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onClose]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-full h-[90vh] p-0 bg-white">
                {/* Header com botão fechar */}
                <div className="flex items-center justify-between p-4 border-b bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-900">Finalizar Pagamento</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                        aria-label="Fechar"
                    >
                        <X className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                {/* Iframe do checkout */}
                <div className="relative w-full h-full">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white">
                            <div className="text-center space-y-4">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="text-slate-600 font-medium">Carregando checkout...</p>
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
