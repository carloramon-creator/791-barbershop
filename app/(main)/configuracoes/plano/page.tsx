'use client';

import { useEffect, useState } from 'react';
import { Users, Building2, CreditCard, Check, Shield, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';

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
        support: 'Suporte por email e chat',
        features: ['Até 10 barbeiros', '200 agendamentos/mês', 'Suporte por email e chat', 'Módulo financeiro']
    },
    premium: {
        id: 'premium',
        name: 'Premium',
        price: 169,
        barbers: 'Barbeiros ilimitados',
        appointments: 'Agendamentos ilimitados',
        support: 'Suporte prioritário',
        features: ['Barbeiros ilimitados', 'Agendamentos ilimitados', 'Suporte prioritário', 'Módulo financeiro completo', 'Módulo de estoque']
    }
};

export default function PlanPage() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isExpired = searchParams.get('expired') === 'true';
    const [currentPlan, setCurrentPlan] = useState<string>('basic');
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix' | 'boleto-inter'>('card');
    const [couponCode, setCouponCode] = useState('');
    const [pixData, setPixData] = useState<{ pixPayload: string; amount: number; expiresAt: string } | null>(null);
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
        } catch (err: unknown) {
            const errorObj = err as Error;
            console.error('Erro ao buscar plano:', errorObj.message);
            setError(errorObj.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleChangePlan() {
        if (!selectedPlan) return;

        try {
            setSaving(true);
            setError(null);
            setPixData(null);

            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) throw new Error('Usuário não autenticado ou sessão expirada');

            if (paymentMethod === 'card') {
                // Chamar API de checkout do Stripe
                const res = await fetch(`${API_URL}/api/checkout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ plan: selectedPlan, coupon: couponCode }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                // Redirecionar para Stripe Checkout
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    throw new Error('URL de checkout não retornada');
                }
            } else if (paymentMethod === 'pix') {
                // Chamar API de checkout do Pix
                const res = await fetch(`${API_URL}/api/checkout/pix`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ plan: selectedPlan, coupon: couponCode }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                setPixData(data);
            } else if (paymentMethod === 'boleto-inter') {
                // Chamar API de checkout do Boleto Inter
                const res = await fetch(`${API_URL}/api/checkout/inter-boleto`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ plan: selectedPlan, coupon: couponCode }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                alert('Boleto gerado com sucesso! Verifique seu e-mail ou aguarde o PDF.');
                setOpenDialog(false);
            }
        } catch (err: unknown) {
            const errorObj = err as Error;
            setError(errorObj.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {isExpired && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <p className="font-bold uppercase text-[10px] tracking-widest">Atenção: Período Expirado</p>
                        <p className="text-xs font-medium text-red-500/80">Seu período de teste ou assinatura expirou. Escolha um plano abaixo para continuar utilizando a plataforma.</p>
                    </div>
                </div>
            )}

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

            <Dialog open={openDialog} onOpenChange={(open) => {
                setOpenDialog(open);
                if (!open) setPixData(null);
            }}>
                <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirmar Assinatura</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Plano <span className="font-bold text-slate-100 capitalize">{selectedPlan}</span> - R$ {PLANS[selectedPlan || '']?.price}/mês
                        </DialogDescription>
                    </DialogHeader>

                    {!pixData ? (
                        <div className="py-4 space-y-4">
                            <Label className="text-xs text-slate-500 uppercase tracking-wider">Forma de Pagamento</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <button
                                    onClick={() => setPaymentMethod('card')}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                                        paymentMethod === 'card'
                                            ? "border-amber-500 bg-amber-500/5 text-slate-100"
                                            : "border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700"
                                    )}
                                >
                                    <CreditCard className="w-5 h-5" />
                                    <span className="text-[10px] font-black uppercase">Cartão</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('pix')}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                                        paymentMethod === 'pix'
                                            ? "border-emerald-500 bg-emerald-500/5 text-slate-100"
                                            : "border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700"
                                    )}
                                >
                                    <span className="text-lg font-black leading-none">PIX</span>
                                    <span className="text-[10px] font-black uppercase">Inter</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('boleto-inter')}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                                        paymentMethod === 'boleto-inter'
                                            ? "border-blue-500 bg-blue-500/5 text-slate-100"
                                            : "border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700"
                                    )}
                                >
                                    <FileText className="w-5 h-5" />
                                    <span className="text-[10px] font-black uppercase">Boleto</span>
                                </button>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500 uppercase tracking-wider">Possui um cupom?</Label>
                                <input
                                    type="text"
                                    placeholder="INSIRA SEU CUPOM"
                                    value={couponCode}
                                    onChange={(e) => {
                                        setCouponCode(e.target.value.toUpperCase());
                                        setError(null);
                                    }}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-500 outline-none transition-all"
                                />
                                {error && (
                                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight mt-1">
                                        {error}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="py-4 flex flex-col items-center space-y-4">
                            <p className="text-center text-sm text-slate-300">
                                Escaneie o código abaixo com o app do seu banco para pagar a assinatura do 791 Barber.
                            </p>

                            <div className="bg-white p-2 rounded-lg">
                                {/* Using a simple img tag for the base64 QR. Real implementation would probably use a lib or specialized component */}
                                <div className="w-48 h-48 bg-slate-200 animate-pulse flex items-center justify-center">
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixData.pixPayload)}`} alt="QR Code Pix" />
                                </div>
                            </div>

                            <div className="w-full space-y-2">
                                <Label className="text-[10px] text-slate-500 uppercase">Pix Copia e Cola</Label>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={pixData.pixPayload}
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-[10px] font-mono text-slate-400"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            navigator.clipboard.writeText(pixData.pixPayload);
                                            alert('Copiado!');
                                        }}
                                    >
                                        Copiar
                                    </Button>
                                </div>
                            </div>

                            <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest">
                                O acesso será liberado em segundos após o pagamento.
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        {!pixData ? (
                            <>
                                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setOpenDialog(false)} disabled={saving}>Cancelar</Button>
                                <Button onClick={handleChangePlan} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                                    {saving ? 'Processando...' : 'Confirmar e Pagar'}
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => setOpenDialog(false)} className="w-full bg-slate-800 text-white">Fechar</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
