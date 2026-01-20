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

    return (
        <div className="w-full h-[calc(100vh-200px)] min-h-[600px] relative overflow-hidden rounded-2xl border border-slate-800 shadow-2xl bg-[#f8f9fa] transition-all duration-500">
            {loading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-900 transition-all">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    <div className="text-center">
                        <p className="text-white font-black uppercase tracking-widest text-[10px]">Protegendo sua transação</p>
                        <p className="text-slate-500 text-[9px] font-medium">Conectando ao gateway seguro...</p>
                    </div>
                </div>
            )}

            <iframe
                src={finalUrl}
                className={`w-full h-full border-none transition-opacity duration-1000 ${loading ? 'opacity-0' : 'opacity-100'}`}
                title="Checkout Asaas"
                onLoad={() => setLoading(false)}
            />
        </div>
    );
}

