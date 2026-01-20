'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Loader2, PartyPopper } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CheckoutSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const sessionId = searchParams.get('session_id') || searchParams.get('checkoutId');

    useEffect(() => {
        const verifyPayment = async () => {
            try {
                // Forçamos uma atualização das faturas para sincronizar o status
                await fetch('/api/barbershop/invoices');
            } catch (error) {
                console.error('Erro ao sincronizar pagamento:', error);
            } finally {
                // Pequeno delay para o usuário ver a animação
                setTimeout(() => setLoading(false), 1500);
            }
        };

        verifyPayment();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center space-y-6">
                    <div className="relative">
                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto" />
                        <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Verificando Assinatura</h2>
                        <p className="text-slate-400 font-medium">Aguarde um instante enquanto ativamos seus recursos...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[25%] -right-[10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full" />
            </div>

            <Card className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500" />

                <CardHeader className="text-center pt-8">
                    <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-6 border border-emerald-500/20 rotate-3 transform transition-transform hover:rotate-0">
                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                    </div>
                    <CardTitle className="text-3xl font-black text-slate-100 tracking-tighter uppercase mb-2">🎉 Pagamento Confirmado!</CardTitle>
                    <CardDescription className="text-slate-400 font-bold leading-relaxed">
                        Sua assinatura no <span className="text-blue-500">791 Barber</span> foi ativada com sucesso. Prepare-se para decolar!
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-8 pb-8">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                            <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center mt-0.5">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                            </div>
                            <p className="text-xs font-bold text-slate-300">Recursos liberados instantaneamente</p>
                        </div>
                        <div className="flex items-start gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                            <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center mt-0.5">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                            </div>
                            <p className="text-xs font-bold text-slate-300">Gestão de barbearia sem limites</p>
                        </div>
                    </div>

                    <div className="pt-4 space-y-3">
                        <Button
                            className="w-full py-7 bg-blue-600 hover:bg-white hover:text-blue-600 text-white font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-900/20 rounded-2xl group"
                            onClick={() => router.push('/')}
                        >
                            Ir para o Painel Inicial
                            <PartyPopper className="ml-2 w-4 h-4 group-hover:scale-125 transition-transform" />
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-slate-500 hover:text-slate-300 font-bold text-[10px] uppercase tracking-widest"
                            onClick={() => router.push('/configuracoes/plano')}
                        >
                            Ver Detalhes do Plano
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
