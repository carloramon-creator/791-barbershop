'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function AsaasCheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const checkoutId = searchParams.get('checkoutId');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!checkoutId) {
            setError('ID do checkout não fornecido');
            setLoading(false);
            return;
        }

        // Iframe carregado
        setLoading(false);
    }, [checkoutId]);

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700 p-8">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <XCircle className="w-16 h-16 text-red-500" />
                        <h1 className="text-2xl font-bold text-white">Erro ao Carregar Checkout</h1>
                        <p className="text-slate-300">{error}</p>
                        <button
                            onClick={() => router.push('/configuracoes/plano')}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Voltar para Planos
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
            {/* Header */}
            <div className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center font-black text-white text-xl">
                            7
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white">791 Barber</h1>
                            <p className="text-xs text-slate-400">Checkout Seguro</p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/configuracoes/plano')}
                        className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
                    >
                        ← Voltar
                    </button>
                </div>
            </div>

            {/* Iframe Container */}
            <div className="flex-1 flex items-center justify-center p-4">
                {loading && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                        <p className="text-slate-300">Carregando checkout...</p>
                    </div>
                )}

                <iframe
                    src={`https://asaas.com/checkoutSession/show?id=${checkoutId}`}
                    className={`w-full max-w-4xl h-[800px] bg-white rounded-2xl shadow-2xl border border-slate-700 ${loading ? 'hidden' : 'block'}`}
                    title="Checkout Asaas"
                    onLoad={() => setLoading(false)}
                />
            </div>

            {/* Footer */}
            <div className="bg-slate-900/80 backdrop-blur-lg border-t border-slate-700 p-4">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Pagamento 100% seguro processado por Asaas</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
