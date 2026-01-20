'use client';

import { useRouter } from 'next/navigation';
import { Clock, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CheckoutExpiredPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[10%] right-[10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />
            </div>

            <Card className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />

                <CardHeader className="text-center pt-8">
                    <div className="mx-auto w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mb-6 border border-amber-500/20 rotate-3 transform group hover:rotate-0 transition-transform">
                        <Clock className="w-10 h-10 text-amber-500" />
                    </div>
                    <CardTitle className="text-3xl font-black text-slate-100 tracking-tighter uppercase mb-2 leading-none">Link Expirado</CardTitle>
                    <CardDescription className="text-slate-400 font-bold leading-relaxed">
                        Esta sessão de checkout expirou por motivos de segurança.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-8 pb-8 text-center border-t border-slate-800 pt-8">
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                        Links de pagamento do Asaas possuem um tempo limite. Por favor, gere um novo link para continuar.
                    </p>

                    <div className="space-y-3">
                        <Button
                            className="w-full py-7 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-widest text-xs transition-all rounded-2xl shadow-xl shadow-amber-900/20 active:scale-95 flex items-center justify-center gap-2"
                            onClick={() => router.push('/configuracoes/plano')}
                        >
                            <RefreshCw size={14} /> Gerar Nova Sessão
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-slate-500 hover:text-slate-200 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                            onClick={() => router.push('/')}
                        >
                            <ArrowLeft size={12} /> Voltar para o Dashboard
                        </Button>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-4">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 rounded-full">
                            <AlertTriangle className="w-3 h-3 text-slate-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dúvidas? Fale com suporte</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
