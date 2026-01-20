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
    }, [checkoutId]);

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700 p-8 text-center space-y-6">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                    <h1 className="text-2xl font-bold text-white">Erro ao Carregar Checkout</h1>
                    <p className="text-slate-300">{error}</p>
                    <button
                        onClick={() => router.push('/configuracoes/plano')}
                        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
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
        <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center font-black text-white text-xl">
                            7
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white leading-none mb-1">791 Barber</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Checkout Seguro</p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/configuracoes/plano')}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all text-xs font-black uppercase tracking-widest border border-slate-700"
                    >
                        ← Voltar
                    </button>
                </div>
            </header>

            {/* Iframe Container */}
            <main className="flex-1 w-full bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
                {loading && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-900/80 backdrop-blur-sm">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                        <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">Protegendo sua transação...</p>
                    </div>
                )}

                <iframe
                    src={finalUrl}
                    className={`w-full h-full bg-white border-none transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                    title="Checkout Asaas"
                    onLoad={() => setLoading(false)}
                />
            </main>

            {/* Footer */}
            <footer className="bg-slate-900/80 backdrop-blur-lg border-t border-slate-700 p-3">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Pagamento 100% seguro processado por Asaas</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}

