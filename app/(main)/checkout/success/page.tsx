'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CheckoutSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        const verifyPayment = async () => {
            try {
                // Chama a API de faturas que contém a lógica de AUTO-SYNC
                const res = await fetch('/api/barbershop/invoices');
                if (res.ok) {
                    console.log('Pagamento sincronizado com sucesso via Auto-Sync');
                }
            } catch (error) {
                console.error('Erro ao sincronizar pagamento:', error);
            } finally {
                setLoading(false);
            }
        };

        verifyPayment();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                    <p className="text-slate-400">Verificando pagamento...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <Card className="max-w-md w-full bg-slate-900 border-slate-800">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl text-slate-100">Pagamento Confirmado!</CardTitle>
                    <CardDescription className="text-slate-400">
                        Sua assinatura foi ativada com sucesso.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                        <p className="text-sm text-slate-400">ID da Sessão:</p>
                        <p className="text-xs text-slate-500 font-mono break-all">
                            {sessionId || 'N/A'}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm text-slate-300">
                            ✅ Seu plano está ativo agora{' '}
                            <br />
                            ✅ Você tem acesso a todos os recursos{' '}
                            <br />
                            ✅ O próximo pagamento será cobrado automaticamente
                        </p>
                    </div>

                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => router.push('/configuracoes/plano')}
                    >
                        Ir para Configurações
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
