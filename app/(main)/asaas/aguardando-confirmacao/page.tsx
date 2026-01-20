'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function AsaasConfirmationPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const paymentId = searchParams.get('paymentId');

    const [status, setStatus] = useState<'checking' | 'confirmed' | 'failed' | 'timeout'>('checking');
    const [attempts, setAttempts] = useState(0);
    const [paymentInfo, setPaymentInfo] = useState<any>(null);

    const MAX_ATTEMPTS = 60; // 60 tentativas = 5 minutos (5 segundos cada)
    const POLL_INTERVAL = 5000; // 5 segundos

    useEffect(() => {
        if (!paymentId) {
            router.push('/configuracoes/plano');
            return;
        }

        const checkPayment = async () => {
            try {
                const res = await fetch(`/api/asaas/check-payment?paymentId=${paymentId}`);
                const data = await res.json();

                if (!res.ok) {
                    console.error('[ASAAS CHECK] Erro:', data.error);
                    return;
                }

                setPaymentInfo(data.payment);

                // Verificar se foi pago
                if (data.payment.isPaid || data.payment.localRecord.isPaid) {
                    setStatus('confirmed');

                    // Redirecionar para o dashboard após 2 segundos
                    setTimeout(() => {
                        router.push('/');
                    }, 2000);
                    return true; // Para o polling
                }

                // Verificar se falhou
                if (data.payment.status === 'REFUNDED' ||
                    data.payment.status === 'REFUND_REQUESTED' ||
                    data.payment.status === 'CHARGEBACK_REQUESTED' ||
                    data.payment.status === 'CHARGEBACK_DISPUTE' ||
                    data.payment.status === 'AWAITING_CHARGEBACK_REVERSAL') {
                    setStatus('failed');
                    return true; // Para o polling
                }

                return false; // Continua polling
            } catch (error) {
                console.error('[ASAAS CHECK] Erro ao verificar:', error);
                return false;
            }
        };

        // Primeira verificação imediata
        checkPayment();

        // Polling a cada 5 segundos
        const interval = setInterval(async () => {
            setAttempts(prev => {
                const newAttempts = prev + 1;

                if (newAttempts >= MAX_ATTEMPTS) {
                    setStatus('timeout');
                    clearInterval(interval);
                    return newAttempts;
                }

                return newAttempts;
            });

            const shouldStop = await checkPayment();
            if (shouldStop) {
                clearInterval(interval);
            }
        }, POLL_INTERVAL);

        return () => clearInterval(interval);
    }, [paymentId, router]);

    const getStatusContent = () => {
        switch (status) {
            case 'checking':
                return {
                    icon: <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />,
                    title: 'Aguardando confirmação do pagamento',
                    description: 'Estamos verificando o status do seu pagamento. Isso pode levar alguns instantes...',
                    color: 'blue'
                };
            case 'confirmed':
                return {
                    icon: <CheckCircle2 className="w-16 h-16 text-green-500" />,
                    title: 'Pagamento confirmado!',
                    description: 'Seu plano foi ativado com sucesso. Redirecionando...',
                    color: 'green'
                };
            case 'failed':
                return {
                    icon: <XCircle className="w-16 h-16 text-red-500" />,
                    title: 'Pagamento não confirmado',
                    description: 'Houve um problema com o pagamento. Por favor, tente novamente.',
                    color: 'red'
                };
            case 'timeout':
                return {
                    icon: <Clock className="w-16 h-16 text-yellow-500" />,
                    title: 'Tempo esgotado',
                    description: 'Não conseguimos confirmar o pagamento automaticamente. Verifique seu email ou entre em contato com o suporte.',
                    color: 'yellow'
                };
        }
    };

    const content = getStatusContent();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700 p-8">
                <div className="flex flex-col items-center text-center space-y-6">
                    {/* Ícone */}
                    <div className="relative">
                        {content.icon}
                        {status === 'checking' && (
                            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                        )}
                    </div>

                    {/* Título */}
                    <h1 className="text-2xl font-bold text-white">
                        {content.title}
                    </h1>

                    {/* Descrição */}
                    <p className="text-slate-300">
                        {content.description}
                    </p>

                    {/* Informações do pagamento */}
                    {paymentInfo && (
                        <div className="w-full bg-slate-900/50 rounded-lg p-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">ID do Pagamento:</span>
                                <span className="text-white font-mono text-xs">{paymentInfo.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Valor:</span>
                                <span className="text-white font-semibold">
                                    R$ {Number(paymentInfo.value).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Status:</span>
                                <span className={`font-semibold ${paymentInfo.isPaid ? 'text-green-400' : 'text-yellow-400'
                                    }`}>
                                    {paymentInfo.status}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Método:</span>
                                <span className="text-white">{paymentInfo.billingType}</span>
                            </div>
                        </div>
                    )}

                    {/* Contador de tentativas */}
                    {status === 'checking' && (
                        <div className="text-xs text-slate-500">
                            Verificação {attempts + 1} de {MAX_ATTEMPTS}
                        </div>
                    )}

                    {/* Botões de ação */}
                    {(status === 'failed' || status === 'timeout') && (
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => router.push('/configuracoes/plano')}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Tentar Novamente
                            </button>
                            <button
                                onClick={() => router.push('/')}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Voltar ao Início
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
