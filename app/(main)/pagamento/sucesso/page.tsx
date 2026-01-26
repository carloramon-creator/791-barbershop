'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function PaymentSuccessPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'checking' | 'success' | 'pending' | 'error'>('checking');
    const [message, setMessage] = useState('Verificando pagamento...');

    useEffect(() => {
        const checkPayment = async () => {
            try {
                // Aguardar 3 segundos para dar tempo do webhook processar
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Verificar status da assinatura
                const response = await fetch('/api/tenant/subscription-status');
                const data = await response.json();

                if (data.subscription_status === 'active') {
                    setStatus('success');
                    setMessage('Pagamento confirmado! Redirecionando...');

                    // Redirecionar após 2 segundos
                    setTimeout(() => {
                        router.push('/dashboard');
                    }, 2000);
                } else {
                    // Se ainda não foi processado, tentar novamente
                    setStatus('pending');
                    setMessage('Aguardando confirmação do pagamento...');

                    // Tentar novamente após 5 segundos
                    setTimeout(checkPayment, 5000);
                }
            } catch (error) {
                console.error('Erro ao verificar pagamento:', error);
                setStatus('error');
                setMessage('Erro ao verificar pagamento. Você pode fechar esta janela e verificar no sistema.');
            }
        };

        checkPayment();
    }, [router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
                {status === 'checking' && (
                    <>
                        <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-100">Verificando Pagamento</h1>
                        <p className="text-slate-400">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h1 className="text-2xl font-black text-emerald-500">Pagamento Confirmado!</h1>
                        <p className="text-slate-400">{message}</p>
                        <div className="pt-4">
                            <Loader2 className="w-6 h-6 mx-auto text-slate-500 animate-spin" />
                        </div>
                    </>
                )}

                {status === 'pending' && (
                    <>
                        <div className="w-16 h-16 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                        </div>
                        <h1 className="text-2xl font-black text-amber-500">Processando...</h1>
                        <p className="text-slate-400">{message}</p>
                        <p className="text-xs text-slate-500">Isso pode levar alguns segundos</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
                            <XCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-black text-red-500">Erro na Verificação</h1>
                        <p className="text-slate-400">{message}</p>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                        >
                            Ir para o Dashboard
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
