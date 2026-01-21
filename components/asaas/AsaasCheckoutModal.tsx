'use client';

import { useEffect, useState } from 'react';
import { X, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AsaasCheckoutModalProps {
    checkoutUrl: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function AsaasCheckoutModal({ checkoutUrl, isOpen, onClose }: AsaasCheckoutModalProps) {
    const [isLoading, setIsLoading] = useState(true);

    // Identificar se é Checkout V3 (Iframe) ou URL direta (Boleto/Invoice)
    const isCheckoutSession = checkoutUrl.includes('checkoutSession');

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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-full h-[90vh] p-0 bg-white overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-slate-50 shrink-0">
                    <h2 className="text-lg font-bold text-slate-900">
                        {isCheckoutSession ? 'Finalizar Pagamento' : 'Pagamento Gerado'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 relative w-full h-full bg-slate-50/50">
                    {isCheckoutSession ? (
                        /* Modo Iframe (Cartão) */
                        <>
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white z-10 transition-opacity duration-500">
                                    <div className="text-center space-y-4">
                                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                        <p className="text-slate-600 font-medium">Carregando checkout seguro...</p>
                                        {/* Botão de emergência se demorar muito */}
                                        <button
                                            onClick={() => window.open(checkoutUrl, '_blank')}
                                            className="text-xs text-blue-500 hover:underline mt-2"
                                        >
                                            Não carregou? Clique aqui para abrir em nova janela
                                        </button>
                                    </div>
                                </div>
                            )}
                            <iframe
                                src={checkoutUrl}
                                className="w-full h-full border-0"
                                onLoad={() => setIsLoading(false)}
                                title="Checkout Asaas"
                                allow="payment; clipboard-write"
                            // Removido sandbox restrito para garantir compatibilidade total, ou usar:
                            // sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation"
                            />
                        </>
                    ) : (
                        /* Modo Boleto Gerado (Link Externo) */
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-green-600" />
                            </div>

                            <div className="space-y-2 max-w-md">
                                <h3 className="text-2xl font-bold text-slate-900">Cobrança Gerada com Sucesso!</h3>
                                <p className="text-slate-600">
                                    O boleto foi gerado. Por questões de segurança do navegador, ele deve ser aberto em uma nova aba.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                                <Button
                                    size="lg"
                                    className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                                    onClick={() => window.open(checkoutUrl, '_blank')}
                                >
                                    <FileText className="w-5 h-5" />
                                    Visualizar Boleto
                                </Button>

                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={onClose}
                                >
                                    Fechar
                                </Button>
                            </div>

                            <p className="text-xs text-slate-400 mt-8">
                                Uma cópia também foi enviada para o seu e-mail.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
