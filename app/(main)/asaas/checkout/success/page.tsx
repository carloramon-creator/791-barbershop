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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-8 md:p-12 relative overflow-hidden">

                {/* Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="flex flex-col items-center text-center space-y-8 relative z-10">
                    {/* Ícone de sucesso */}
                    <div className="relative">
                        <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center ring-4 ring-emerald-500/5">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500" strokeWidth={1.5} />
                        </div>
                    </div>

                    {/* Título e Texto */}
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            Pagamento Confirmado!
                        </h1>
                        <p className="text-slate-400 font-medium">
                            Sua assinatura foi ativada com sucesso.
                        </p>
                    </div>

                    {/* Card de Sessão (Fake para Visual) */}
                    <div className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-left">
                        <span className="block text-[10px] uppercase text-slate-500 font-bold mb-1">ID da Sessão</span>
                        <code className="block text-xs text-slate-300 font-mono truncate">
                            sess_{Math.random().toString(36).substring(2, 15)}_{Date.now().toString(36)}
                        </code>
                    </div>

                    {/* Lista de Benefícios */}
                    <div className="w-full space-y-3 text-left">
                        {[
                            'Seu plano está ativo agora',
                            'Você tem acesso a todos os recursos',
                            'O próximo pagamento será cobrado automaticamente'
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="mt-0.5 bg-emerald-500 rounded text-black p-0.5">
                                    <CheckCircle2 className="w-3 h-3 text-white fill-emerald-500" strokeWidth={3} />
                                </div>
                                <span className="text-sm text-slate-300">{item}</span>
                            </div>
                        ))}
                    </div>

                    {/* Botão Principal */}
                    <button
                        onClick={() => router.push('/configuracoes/plano')}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95 text-sm uppercase tracking-wider"
                    >
                        Ir para Configurações
                    </button>

                    <p className="text-xs text-slate-600">
                        Redirecionando automaticamente em {countdown}s...
                    </p>
                </div>
            </div>
        </div>
    );
}
