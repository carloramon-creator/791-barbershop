import { useEffect, useState } from 'react';
import { X, ExternalLink, FileText, CheckCircle2, CreditCard, ShieldCheck, Copy, Info, Check, AlertTriangle, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AsaasCheckoutModalProps {
    checkoutUrl: string | null;
    isOpen: boolean;
    onClose: () => void;
    boletoData?: {
        identificationField: string;
        barCode: string;
        value: number;
        dueDate: string;
        bankSlipUrl: string;
    } | null;
    pixData?: {
        encodedImage: string;
        payload: string;
        expirationDate: string;
    } | null;
}

export default function AsaasCheckoutModal({ checkoutUrl, isOpen, onClose, boletoData, pixData }: AsaasCheckoutModalProps) {
    const [copied, setCopied] = useState(false);

    // Identificar modo (Cartão, Boleto ou Pix)
    // Checkout SESSION (Redirect) se tiver URL e NÃO tiver dados de boleto ou pix
    const isCheckoutSession = !!checkoutUrl && !pixData && !boletoData;

    // Helper de cópia
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copiado para a área de transferência!');
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const formatCurrency = (amount?: number) => {
        if (amount === undefined) return '-';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
    };

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

    // Título dinâmico
    let title = 'Pagamento';
    if (isCheckoutSession) title = 'Pagamento Seguro Asaas';
    else if (pixData) title = 'Pagamento via PIX';
    else if (boletoData) title = 'Boleto Registrado';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl w-full p-0 bg-slate-900 border-slate-800 text-slate-100 overflow-hidden flex flex-col rounded-xl shadow-2xl" aria-describedby="checkout-description">
                <VisuallyHidden>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription id="checkout-description">
                        Modal de pagamento seguro.
                    </DialogDescription>
                </VisuallyHidden>

                {/* Header Style */}
                <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50 shrink-0">
                    <div className="text-xl font-bold text-white flex items-center gap-2">
                        {isCheckoutSession && (
                            <>
                                <ShieldCheck className="w-6 h-6 text-blue-500" />
                                <span>PAGAMENTO SEGURO</span>
                            </>
                        )}
                        {pixData && (
                            <>
                                <QrCode className="w-6 h-6 text-emerald-500" />
                                <span>PAGAMENTO VIA PIX</span>
                            </>
                        )}
                        {boletoData && (
                            <>
                                <FileText className="w-6 h-6 text-blue-500" />
                                <span>BOLETO REGISTRADO</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 flex flex-col items-center justify-center text-center space-y-6 bg-slate-950 min-h-[380px]">

                    {/* --- MODO PIX --- */}
                    {pixData && (
                        <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-500">

                            <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-6 flex flex-col items-center">
                                {/* QR Code Image */}
                                <div className="bg-white p-2 rounded-lg mb-4 shadow-lg shadow-emerald-900/20">
                                    {pixData.encodedImage ? (
                                        <img
                                            src={`data:image/png;base64,${pixData.encodedImage}`}
                                            alt="QR Code Pix"
                                            className="w-48 h-48 object-contain"
                                        />
                                    ) : (
                                        <div className="w-48 h-48 flex items-center justify-center text-slate-400">QR Code Indisponível</div>
                                    )}
                                </div>
                                <p className="text-sm text-emerald-200/80 mb-2">Abra o app do seu banco e escaneie o código.</p>
                                <div className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
                                    Aprovação Instantânea
                                </div>
                            </div>

                            {/* Pix Copia e Cola */}
                            <div className="space-y-2 text-left">
                                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider pl-1">
                                    PIX COPIA E COLA
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-slate-300 font-mono text-xs truncate select-all">
                                        {pixData.payload}
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="h-auto border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                                        onClick={() => copyToClipboard(pixData.payload)}
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- MODO BOLETO --- */}
                    {boletoData && (
                        <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            {/* Card Azul */}
                            <div className="bg-blue-950/40 border border-blue-900/50 rounded-lg p-6 flex flex-col items-center">
                                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50">
                                    <FileText className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">BOLETO REGISTRADO</h3>
                                <p className="text-sm text-blue-200 mb-6">Pague agora pelo seu banco e libere seu acesso.</p>

                                <div className="flex w-full items-center justify-between px-4 sm:px-12 mb-2">
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">VALOR</span>
                                        <span className="text-xl font-bold text-white">{formatCurrency(boletoData?.value)}</span>
                                    </div>
                                    <div className="h-8 w-px bg-blue-900/50"></div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">VENCIMENTO</span>
                                        <span className="text-xl font-bold text-white">{formatDate(boletoData?.dueDate)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Campo de Código de Barras */}
                            <div className="space-y-2 text-left">
                                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider pl-1">
                                    CÓDIGO DE BARRAS / LINHA DIGITÁVEL
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-slate-300 font-mono text-sm truncate select-all">
                                        {boletoData?.identificationField || 'Carregando código...'}
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                                        onClick={() => copyToClipboard(boletoData?.identificationField || '')}
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>

                            {/* Ação Principal */}
                            <Button
                                size="lg"
                                className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 text-base shadow-lg shadow-blue-900/20"
                                onClick={() => window.open(boletoData?.bankSlipUrl || checkoutUrl || '', '_blank')}
                            >
                                <ExternalLink className="w-5 h-5" />
                                IMPRIMIR / VER PDF COMPLETO
                            </Button>

                            {/* Warning Box */}
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex gap-3 text-left">
                                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-yellow-500 uppercase">Atenção: A compensação pode demorar</h4>
                                    <p className="text-xs text-yellow-200/80 leading-relaxed">
                                        A compensação bancária ocorre em até 2 dias úteis. Dica: Use o PIX para liberação instantânea.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- MODO CARTÃO / CHECKOUT --- */}
                    {isCheckoutSession && !pixData && !boletoData && (
                        <>
                            <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-2 animate-in zoom-in duration-300">
                                <CreditCard className="w-12 h-12 text-blue-500" />
                            </div>

                            <div className="space-y-3 max-w-sm">
                                <h3 className="text-2xl font-bold text-white">Finalizar Pagamento</h3>
                                <p className="text-base text-slate-400 leading-relaxed">
                                    Para proteger seus dados, o pagamento será processado na página segura do Asaas.
                                </p>
                            </div>

                            <div className="flex flex-col w-full max-w-xs gap-4 pt-4">
                                <Button
                                    size="lg"
                                    className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 text-base shadow-lg shadow-blue-900/20"
                                    onClick={() => window.open(checkoutUrl || '', '_blank')}
                                >
                                    <ExternalLink className="w-5 h-5" />
                                    IR PARA PAGAMENTO
                                </Button>
                                <p className="text-xs text-slate-500">
                                    Ambiente 256-bit SSL Seguro
                                </p>
                            </div>
                        </>
                    )}

                </div>

                {/* Footer for Success/Close */}
                <div className="p-4 bg-slate-900 border-t border-slate-800 text-center">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white hover:bg-slate-800 w-full"
                    >
                        Fechar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
