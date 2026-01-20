'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function AsaasCheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const checkoutId = searchParams.get('checkoutId');
    const checkoutUrl = searchParams.get('checkoutUrl');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!checkoutId) {
            setError('ID do checkout não fornecido');
            setLoading(false);
            return;
        }

        // Fallback: Se o iframe não disparar onLoad em 5 segundos, libera a tela
        const timer = setTimeout(() => {
            setLoading(false);
        }, 5000);

        return () => clearTimeout(timer);
    }, [checkoutId]);

    if (error) {
        return (
            <div className="h-[100dvh] bg-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700 p-8 text-center space-y-6 shadow-2xl">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                    <h1 className="text-2xl font-bold text-white">Erro ao Carregar</h1>
                    <p className="text-slate-300 text-sm leading-relaxed">{error}</p>
                    <button
                        onClick={() => router.push('/configuracoes/plano')}
                        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all"
                    >
                        Voltar para Planos
                    </button>
                </div>
            </div>
        );
    }

    // URL final do checkout (se não vier da API, usa a padrão)
    const finalUrl = checkoutUrl || `https://asaas.com/checkoutSession/show?id=${checkoutId}`;

    return (
        <div className="w-full h-[calc(100vh-180px)] min-h-[500px] relative overflow-hidden rounded-2xl border border-slate-800 shadow-2xl bg-white transition-all duration-700">
            {loading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-slate-900/95 backdrop-blur-sm transition-all">
                    <div className="relative">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                        <div className="absolute inset-0 blur-xl bg-blue-500/20 rounded-full animate-pulse" />
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-white font-black uppercase tracking-[0.3em] text-[10px]">Protegendo sua transação</p>
                        <p className="text-slate-500 text-[9px] font-medium italic">Preparando ambiente seguro Asaas...</p>
                    </div>
                </div>
            )}

            <iframe
                src={finalUrl}
                className={`w-full h-full border-none transition-all duration-700 ${loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                title="Checkout Asaas"
                onLoad={() => setLoading(false)}
            />
        </div>
    );
}

