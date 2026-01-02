'use client';

import { useEffect, useState } from 'react';
import { Users, Building2, CreditCard, Check, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

import { supabaseClient } from '@/lib/supabase-client';

// Use NEXT_PUBLIC_BACKEND_URL if set, else fallback. Note user code used 3002 hardcoded so we trust new config
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

interface PlanInfo {
    id: string;
    name: string;
    price: number;
    barbers: string;
    appointments: string;
    support: string;
    features: string[];
}

const PLANS: Record<string, PlanInfo> = {
    basic: {
        id: 'basic',
        name: 'Básico',
        price: 49,
        barbers: 'Até 3 barbeiros',
        appointments: '50 agendamentos/mês',
        support: 'Suporte por email',
        features: ['Até 3 barbeiros', '50 agendamentos/mês', 'Suporte por email']
    },
    complete: {
        id: 'complete',
        name: 'Completo',
        price: 99,
        barbers: 'Até 10 barbeiros',
        appointments: '200 agendamentos/mês',
        support: 'Suporte prioritário',
        features: ['Até 10 barbeiros', '200 agendamentos/mês', 'Suporte prioritário']
    },
    premium: {
        id: 'premium',
        name: 'Premium',
        price: 169,
        barbers: 'Barbeiros ilimitados',
        appointments: 'Agendamentos ilimitados',
        support: 'Suporte 24/7',
        features: ['Barbeiros ilimitados', 'Agendamentos ilimitados', 'Suporte 24/7']
    }
};

export default function PlanPage() {
    const pathname = usePathname();
    const [currentPlan, setCurrentPlan] = useState<string>('basic');
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const tabs = [
        { name: 'Geral', href: '/configuracoes/barbearia', icon: Building2 },
        { name: 'Usuários', href: '/configuracoes/usuarios', icon: Users },
        { name: 'Permissões', href: '/configuracoes/permissoes', icon: Shield },
        { name: 'Plano', href: '/configuracoes/plano', icon: CreditCard },
    ];

    useEffect(() => {
        fetchCurrentPlan();
    }, []);

    async function fetchCurrentPlan() {
        try {
            setLoading(true);

            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) throw new Error('Usuário não autenticado');

            const res = await fetch(`${API_URL}/api/barbershop/plan`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setCurrentPlan(data.currentPlan || 'trial');
        } catch (err: any) {
            console.error('Erro ao buscar plano:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleChangePlan() {
        if (!selectedPlan) return;

        try {
            setSaving(true);
            setError(null);

            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) throw new Error('Usuário não autenticado ou sessão expirada');

            // Chamar API de checkout do Stripe
            const res = await fetch(`${API_URL}/api/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ plan: selectedPlan }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Redirecionar para Stripe Checkout
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('URL de checkout não retornada');
            }
        } catch (err: any) {
            setError(err.message);
            setSaving(false);
        }
        // Não resetar setSaving(false) aqui pois vamos redirecionar
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold text-slate-100">Configurações</h1>
                <div className="flex space-x-1 border-b border-slate-800">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                                pathname === tab.href
                                    ? 'border-blue-500 text-blue-500'
                                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.name}
                        </Link>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-400">
                    <p>Carregando plano...</p>
                </div>
            ) : (
                <>
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-slate-100">Plano Atual</CardTitle>
                            <CardDescription className="text-slate-500">
                                Seu plano ativo e limite de funcionalidades
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-slate-950 p-6 rounded-lg border border-slate-800">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-100 capitalize">
                                            {currentPlan}
                                        </h3>
                                        <p className="text-sm text-slate-400 mt-1">
                                            R$ {PLANS[currentPlan]?.price}/mês
                                        </p>
                                    </div>
                                    <span className="px-4 py-2 bg-green-500/10 text-green-500 text-sm rounded-full border border-green-500/20">
                                        Ativo
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-100">Escolha um Plano</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {Object.values(PLANS).map((plan) => (
                                <Card
                                    key={plan.id}
                                    className={cn(
                                        'bg-slate-900 border-slate-800 cursor-pointer transition-all hover:border-slate-700',
                                        currentPlan === plan.id && 'border-blue-500'
                                    )}
                                >
                                    <CardHeader>
                                        <CardTitle className="text-slate-100">{plan.name}</CardTitle>
                                        <CardDescription className="text-slate-500">
                                            <span className="text-2xl font-bold text-slate-100">
                                                R$ {plan.price}
                                            </span>
                                            <span className="text-sm">/mês</span>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-2">
                                            <p className="text-sm text-slate-400">
                                                <span className="font-medium text-slate-200">Barbeiros:</span> {plan.barbers}
                                            </p>
                                            <p className="text-sm text-slate-400">
                                                <span className="font-medium text-slate-200">Agendamentos:</span> {plan.appointments}
                                            </p>
                                            <p className="text-sm text-slate-400">
                                                <span className="font-medium text-slate-200">Suporte:</span> {plan.support}
                                            </p>
                                        </div>

                                        <div className="space-y-2 pt-4 border-t border-slate-800">
                                            {plan.features.map((feature, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-green-500" />
                                                    <span className="text-sm text-slate-300">{feature}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <Button
                                            className={cn(
                                                'w-full',
                                                currentPlan === plan.id
                                                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                    : 'bg-blue-600 hover:bg-blue-700'
                                            )}
                                            disabled={currentPlan === plan.id}
                                            onClick={() => {
                                                setSelectedPlan(plan.id);
                                                setOpenDialog(true);
                                            }}
                                        >
                                            {currentPlan === plan.id ? 'Plano Atual' : 'Contratar'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded text-red-400 text-sm">
                    {error}
                </div>
            )}

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
                    <DialogHeader>
                        <DialogTitle>Confirmar Mudança de Plano</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Você está prestes a mudar para o plano{' '}
                            <span className="font-bold text-slate-100 capitalize">{selectedPlan}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setOpenDialog(false)} disabled={saving}>Cancelar</Button>
                        <Button onClick={handleChangePlan} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {saving ? 'Salvando...' : 'Confirmar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
