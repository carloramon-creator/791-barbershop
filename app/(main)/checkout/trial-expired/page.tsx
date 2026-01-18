'use client';

import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PLANS } from '@/lib/stripe-config';
import { useState } from 'react';

const API_URL = '';

export default function TrialExpiredPage() {
    const [loading, setLoading] = useState<string | null>(null);

    const handleSubscribe = async (planId: string) => {
        try {
            setLoading(planId);

            // Chamar API de checkout
            const res = await fetch(`${API_URL}/api/checkout`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planId }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            // Redirecionar para Stripe Checkout
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err: unknown) {
            const error = err as Error;
            alert('Erro ao criar checkout: ' + error.message);
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 p-4">
            <div className="max-w-5xl mx-auto space-y-6 py-12">
                {/* Alert de trial expirado */}
                <Card className="bg-orange-500/10 border-orange-500/20">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-orange-500" />
                            <div>
                                <CardTitle className="text-orange-500">Período de Teste Expirado</CardTitle>
                                <CardDescription className="text-orange-400/80">
                                    Seu trial de 10 dias chegou ao fim. Assine agora para continuar usando o 791 Barber!
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Planos disponíveis */}
                <div>
                    <h2 className="text-2xl font-bold text-slate-100 mb-6">Escolha Seu Plano</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Object.values(PLANS).map((plan) => (
                            <Card key={plan.id} className="bg-slate-900 border-slate-800">
                                <CardHeader>
                                    <CardTitle className="text-slate-100">{plan.name}</CardTitle>
                                    <CardDescription className="text-slate-500">
                                        <span className="text-3xl font-bold text-slate-100">
                                            R$ {plan.price}
                                        </span>
                                        <span className="text-sm">/mês</span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <ul className="space-y-2">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                                                <span className="text-green-500">✓</span>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>

                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={loading !== null}
                                    >
                                        {loading === plan.id ? 'Processando...' : 'Assinar Agora'}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
