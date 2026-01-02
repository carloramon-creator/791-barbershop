'use client';

import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CheckoutCancelPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <Card className="max-w-md w-full bg-slate-900 border-slate-800">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                        <XCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <CardTitle className="text-2xl text-slate-100">Pagamento Cancelado</CardTitle>
                    <CardDescription className="text-slate-400">
                        Você cancelou o processo de pagamento.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-sm text-slate-300 text-center">
                        Não se preocupe! Nenhuma cobrança foi realizada.
                        <br />
                        Você pode tentar novamente quando quiser.
                    </p>

                    <div className="space-y-3">
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={() => router.push('/configuracoes/plano')}
                        >
                            Voltar para Planos
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                            onClick={() => router.push('/dashboard')}
                        >
                            Ir para Dashboard
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
