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

        // Forçar visibilidade após 3 segundos mesmo se o evento onLoad não disparar
        const timer = setTimeout(() => {
            setLoading(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, [checkoutId]);

    if (error) {
        return (
            <div className="w-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                <XCircle className="w-12 h-12 text-red-500" />
                <h2 className="text-xl font-bold text-white">Erro ao Carregar Checkout</h2>
                <p className="text-slate-400">{error}</p>
                <button
                    onClick={() => router.push('/configuracoes/plano')}
                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                    Voltar para Planos
                </button>
            </div>
        );
    }

    // Prioriza checkoutUrl da query, senão usa o padrão asaas.com
    const finalUrl = checkoutUrl ? decodeURIComponent(checkoutUrl) : `https://asaas.com/checkoutSession/show?id=${checkoutId}`;

    useEffect(() => {
        console.log('[ASAAS IFRAME] Carregando URL:', finalUrl);
    }, [finalUrl]);

    return (
        <div className="w-full h-[calc(100vh-200px)] min-h-[600px] relative overflow-hidden rounded-2xl border border-slate-800 shadow-2xl bg-slate-100 transition-all">
            <iframe
                src={finalUrl}
                className="w-full h-full border-none bg-white font-sans"
                title="Checkout Asaas"
                onLoad={() => {
                    console.log('[ASAAS IFRAME] Carregado com sucesso');
                    setLoading(false);
                }}
            />

            {loading && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 pointer-events-none">
                    <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                    <span className="text-[10px] text-white font-black uppercase tracking-widest">Sincronizando...</span>
                </div>
            )}
        </div>
    );
}

