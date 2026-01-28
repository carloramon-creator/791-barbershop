'use client';

import { useState, useEffect } from 'react';
import { usePaymentAlert, PendingPayment } from '@/hooks/use-payment-alert';
import {
    AlertTriangle,
    QrCode,
    X,
    ExternalLink,
    Clock,
    CheckCircle2,
    Copy,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export function PaymentAlertPopup() {
    const { pendingPayment, loading } = usePaymentAlert();
    const [isVisible, setIsVisible] = useState(false);
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        if (!loading && pendingPayment) {
            // Verificar se o usuário "dispensou" temporariamente
            const lastDismissed = localStorage.getItem(`payment_alert_dismissed_${pendingPayment.id}`);
            const now = Date.now();

            // Se foi dispensado há menos de 4 horas, manter oculto
            if (lastDismissed && (now - parseInt(lastDismissed)) < (4 * 60 * 60 * 1000)) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
        } else {
            setIsVisible(false);
        }
    }, [pendingPayment, loading, isDismissed]);

    if (!isVisible || !pendingPayment) return null;

    const dueDate = pendingPayment.metadata?.expires_at ? new Date(pendingPayment.metadata.expires_at) : new Date(pendingPayment.date);
    const isOverdue = new Date() > dueDate;
    const daysLate = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    const handleDismiss = () => {
        localStorage.setItem(`payment_alert_dismissed_${pendingPayment.id}`, Date.now().toString());
        setIsVisible(false);
        setIsDismissed(true);
    };

    const copyPix = () => {
        if (pendingPayment.metadata?.pix_payload) {
            navigator.clipboard.writeText(pendingPayment.metadata.pix_payload);
            toast.success('Código Pix copiado!');
        }
    };

    return (
        <>
            {/* Alerta tipo Toast/Banner Flutuante */}
            <div className={`fixed bottom-6 right-6 z-50 animate-in slide-in-from-right-10 duration-500 max-w-sm w-full`}>
                <div className={`
                    relative overflow-hidden p-5 rounded-2xl shadow-2xl border-2
                    ${isOverdue
                        ? 'bg-red-950/90 border-red-500/50 text-red-100'
                        : 'bg-slate-900/90 border-blue-500/50 text-blue-100'
                    }
                    backdrop-blur-md
                `}>
                    {/* Botão Fechar */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>

                    <div className="flex gap-4">
                        <div className={`
                            w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                            ${isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}
                        `}>
                            {isOverdue ? <AlertTriangle size={24} /> : <Clock size={24} />}
                        </div>

                        <div className="flex-1 space-y-1">
                            <h3 className="font-bold text-base leading-tight">
                                {isOverdue
                                    ? `Mensalidade Atrasada (${daysLate}d)`
                                    : 'Mensalidade Próxima'}
                            </h3>
                            <p className="text-sm opacity-80 leading-relaxed">
                                {pendingPayment.description}
                            </p>
                            <div className="pt-1 flex items-center gap-2">
                                <span className="font-black text-lg">{formatCurrency(pendingPayment.value)}</span>
                                <span className="text-[10px] opacity-60 font-bold uppercase tracking-wider">
                                    Venceu: {new Date(dueDate).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDismiss}
                            className="bg-transparent border-slate-700 hover:bg-slate-800 text-xs"
                        >
                            Lembrar Depois
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setIsQRModalOpen(true)}
                            className={`text-xs font-bold ${isOverdue ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                        >
                            <QrCode size={14} className="mr-2" /> Pagar Agora
                        </Button>
                    </div>
                </div>
            </div>

            {/* Modal do QR Code */}
            <Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
                <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <QrCode className="text-blue-500" /> Pagamento via Pix
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Utilize o QR Code abaixo para efetuar o pagamento da sua mensalidade.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center py-6 space-y-6">
                        <div className="bg-white p-4 rounded-2xl shadow-xl">
                            {pendingPayment.metadata?.pix_payload ? (
                                <QRCodeSVG value={pendingPayment.metadata.pix_payload} size={200} />
                            ) : (
                                <div className="w-[200px] h-[200px] bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <Loader2 className="animate-spin" />
                                    <span className="text-xs">Gerando Pix...</span>
                                </div>
                            )}
                        </div>

                        <div className="text-center">
                            <div className="text-sm text-slate-400 mb-1">Valor a pagar</div>
                            <div className="text-3xl font-black">{formatCurrency(pendingPayment.value)}</div>
                        </div>

                        <div className="w-full space-y-3">
                            <Button
                                onClick={copyPix}
                                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 h-12 font-bold"
                            >
                                <Copy size={18} className="mr-2" /> Copiar Código Pix
                            </Button>

                            <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 text-[11px] text-blue-200">
                                <CheckCircle2 className="shrink-0 text-blue-400" size={16} />
                                <p>A confirmação é imediata. Após o pagamento, o aviso desaparecerá e seu acesso será renovado automaticamente.</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
