'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function AsaasCheckoutSuccessPage() {
    const router = useRouter();
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
        // Fechar modal se estiver em iframe
        if (window.parent !== window) {
            window.parent.postMessage({ type: 'checkout_success', status: 'success' }, '*');
        }

        // Countdown para redirecionar
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    router.push('/configuracoes/plano');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-green-200 p-8">
                <div className="flex flex-col items-center text-center space-y-6">
                    {/* Ícone de sucesso */}
                    <div className="relative">
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-12 h-12 text-white" />
                        </div>
                        <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                    </div>

                    {/* Título */}
                    <h1 className="text-3xl font-black text-green-600">
                        Pagamento Confirmado!
                    </h1>

                    {/* Descrição */}
                    <p className="text-slate-600 leading-relaxed">
                        Seu pagamento foi processado com sucesso. Seu plano será ativado em instantes.
                    </p>

                    {/* Countdown */}
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Redirecionando em {countdown} segundo{countdown !== 1 ? 's' : ''}...</span>
                    </div>

                    {/* Botão manual */}
                    <button
                        onClick={() => router.push('/configuracoes/plano')}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors"
                    >
                        Ir para Meu Plano
                    </button>
                </div>
            </div>
        </div>
    );
}
