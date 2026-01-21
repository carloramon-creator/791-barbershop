'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';

export default function AsaasCheckoutCancelPage() {
    const router = useRouter();

    useEffect(() => {
        // Fechar modal se estiver em iframe
        if (window.parent !== window) {
            window.parent.postMessage({ type: 'checkout_cancel', status: 'cancel' }, '*');
        }
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 p-8">
                <div className="flex flex-col items-center text-center space-y-6">
                    {/* Ícone de cancelamento */}
                    <div className="relative">
                        <div className="w-20 h-20 bg-slate-500 rounded-full flex items-center justify-center">
                            <XCircle className="w-12 h-12 text-white" />
                        </div>
                    </div>

                    {/* Título */}
                    <h1 className="text-3xl font-black text-slate-700">
                        Pagamento Cancelado
                    </h1>

                    {/* Descrição */}
                    <p className="text-slate-600 leading-relaxed">
                        Você cancelou o processo de pagamento. Nenhuma cobrança foi realizada.
                    </p>

                    {/* Botões */}
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={() => router.push('/configuracoes/plano')}
                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
                        >
                            Tentar Novamente
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition-colors"
                        >
                            Voltar ao Início
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
