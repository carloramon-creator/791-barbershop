'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase-client';

// Use env var or default to backend URL for signup
const API_URL = '';

export default function LandingPage() {
    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                // Se o usuário já está logado
                router.push('/dashboard');
            }
        };

        // Escutar mudanças de auth para capturar o evento de recuperação imediatamente
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                router.push('/reset-password');
            } else if (session && event === 'SIGNED_IN') {
                router.push('/dashboard');
            }
        });

        checkSession();
        return () => subscription.unsubscribe();
    }, [router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
                <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-blue-400">791 Barber</h1>
                    <Link href="/login">
                        <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                            Entrar (Login)
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-100">
                        Gerencie sua barbearia com facilidade
                    </h2>
                    <p className="text-lg text-slate-400">
                        Sistema completo para agendamentos, controle de barbeiros, produtos e financeiro.
                        Teste grátis por 10 dias!
                    </p>

                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-slate-300">Agendamentos ilimitados</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-slate-300">Gestão de barbeiros</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-slate-300">Controle financeiro</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-slate-300">Suporte 24/7</span>
                        </div>
                    </div>

                    <Link href="/signup">
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg mt-6 w-full"
                        >
                            Comece Grátis por 10 Dias
                        </Button>
                    </Link>

                    <p className="text-sm text-slate-500">
                        Sem cartão de crédito necessário. Cancele a qualquer momento.
                    </p>
                </div>

                <div className="hidden md:block">
                    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-12 text-center">
                        <div className="text-6xl font-bold text-blue-400 mb-4">10</div>
                        <p className="text-2xl font-semibold text-slate-100 mb-2">Dias Grátis</p>
                        <p className="text-slate-400">Acesso completo ao Premium</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
