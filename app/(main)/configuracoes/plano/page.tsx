'use client';

// RAILWAY MIGRATION TRIGGER - GOL DA VITÓRIA ⚽
import React, { useState, useEffect } from 'react';
import {
    Users,
    Building2,
    CreditCard,
    Check,
    Shield,
    FileText,
    ExternalLink,
    Copy,
    Activity,
    Zap,
    FileCheck,
    CheckCircle2,
    Package
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Api } from '@/lib/api';
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
import { QRCodeCanvas } from 'qrcode.react';

import { supabaseClient } from '@/lib/supabase-client';

// Use NEXT_PUBLIC_BACKEND_URL if set, else fallback.
// Hardcoding production URL to ensure immediate fix
const API_URL = '';

export default function PlanPage() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isExpired = searchParams.get('expired') === 'true';

    const [dynamicPlans, setDynamicPlans] = useState<any[]>([]);
    const [dynamicAddons, setDynamicAddons] = useState<any[]>([]);
    const [currentPlan, setCurrentPlan] = useState<string>('basic');
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [selectedAddon, setSelectedAddon] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix' | 'boleto-inter' | 'boleto-result'>('card');
    const [couponCode, setCouponCode] = useState('');
    const [pixData, setPixData] = useState<{ pixPayload: string; amount: number; expiresAt: string; pdfUrl?: string } | null>(null);
    const [boletoData, setBoletoData] = useState<{ nossoNumero: string; codigoBarras: string; linhaDigitavel: string; pdfUrl: string; amount?: number } | null>(null);
    const [pendingData, setPendingData] = useState<{ message: string; pending: boolean; seu_numero?: string } | null>(null);
    const [tenantHasDocument, setTenantHasDocument] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [stripeSubscriptionId, setStripeSubscriptionId] = useState<string | null>(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
    const [activeAddons, setActiveAddons] = useState<string[]>([]);
    const [canceling, setCanceling] = useState(false);

    const tabs = [
        { name: 'Geral', href: '/configuracoes/barbearia', icon: Building2 },
        { name: 'Usuários', href: '/configuracoes/usuarios', icon: Users },
        { name: 'Permissões', href: '/configuracoes/permissoes', icon: Shield },
        { name: 'Plano', href: '/configuracoes/plano', icon: CreditCard },
    ];

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // 1. Carregar planos e add-ons do sistema
                const [plans, addons] = await Promise.all([
                    Api.getSystemPlans(),
                    Api.getSystemAddons()
                ]);
                setDynamicPlans(plans || []);
                setDynamicAddons(addons || []);

                // 2. Primeiro sincroniza tudo (Inter e Stripe)
                await fetchInvoices();
                // 3. Agora busca o status atualizado do plano
                await fetchCurrentPlan(false); // Pass false to not reset loading
            } catch (e) {
                console.error('Erro na inicialização:', e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    async function fetchCurrentPlan(shouldSetLoading = true) {
        try {
            if (shouldSetLoading) setLoading(true);

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
            setStripeSubscriptionId(data.stripeSubscriptionId);
            setSubscriptionStatus(data.subscriptionStatus);
            setActiveAddons(data.activeAddons || []);

            // Also check if tenant has CNPJ/CPF
            const tenantRes = await fetch(`${API_URL}/api/barbershop`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const tenantData = await tenantRes.json();
            const doc = tenantData.cnpj || tenantData.cpf_cnpj || '';
            setTenantHasDocument(doc.replace(/\D/g, '').length >= 11);
        } catch (err: unknown) {
            const errorObj = err as Error;
            console.error('Erro ao buscar plano:', errorObj.message);
            setError(errorObj.message);
        } finally {
            if (shouldSetLoading) setLoading(false);
        }
    }

    async function fetchInvoices() {
        try {
            setLoadingInvoices(true);
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) return;

            const res = await fetch('/api/barbershop/invoices', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await res.json();
            if (data.invoices) {
                setInvoices(data.invoices);
            }
        } catch (err) {
            console.error('Erro ao buscar faturas:', err);
        } finally {
            setLoadingInvoices(false);
        }
    }

    // --- POLLING PARA COBRANÇAS PENDENTES ---
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (pendingData?.pending) {
            console.log('[POLLING] Iniciando busca por cobrança processada...');
            interval = setInterval(async () => {
                try {
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    if (!session) return;

                    // Busca na tabela finance pelo seu_numero que salvamos no pending_data
                    const pollRes = await fetch(`/api/barbershop/check-pending-payment?seu_numero=${pendingData.seu_numero}`, {
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`
                        }
                    });

                    if (pollRes.ok) {
                        const data = await pollRes.json();
                        if (data.ready) {
                            console.log('[POLLING] Cobrança encontrada e pronta!');
                            if (data.type === 'pix') {
                                setPixData(data.payload);
                            } else {
                                setBoletoData(data.payload);
                            }
                            setPendingData(null);
                            fetchInvoices(); // Atualiza o histórico assim que pronto!
                        }
                    }
                } catch (e) {
                    console.error('[POLLING ERROR]', e);
                }
            }, 4000); // 4 segundos
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [pendingData]);

    async function handleChangePlan() {
        if (!selectedPlan) return;

        try {
            setSaving(true);
            setError(null);
            setPixData(null);
            setBoletoData(null);
            setPendingData(null);

            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) throw new Error('Usuário não autenticado ou sessão expirada');

            if (paymentMethod === 'card') {
                // SE JÁ TEM ASSINATURA E É ADDON -> ATIVAÇÃO DIRETA
                if (stripeSubscriptionId && selectedAddon) {
                    const res = await fetch('/api/barbershop/addons/activate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({ addonSlug: selectedAddon.slug }),
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);

                    alert(data.message || 'Add-on ativado com sucesso!');
                    setOpenDialog(false);
                    await fetchCurrentPlan();
                    return;
                }

                // CASO CONTRÁRIO -> CHECKOUT STRIPE (Upgrade de plano ou nova assinatura)
                const res = await fetch(`${API_URL}/api/checkout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        plan: selectedPlan,
                        addon: selectedAddon?.slug,
                        coupon: couponCode
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                if (data.url) {
                    window.location.href = data.url;
                } else {
                    throw new Error('URL de checkout não retornada');
                }
            } else if (paymentMethod === 'pix') {
                // ID numérico para evitar problemas de compatibilidade
                const tempId = Date.now().toString().slice(-15);
                setPendingData({ message: 'Iniciando registro do Pix...', pending: true, seu_numero: tempId });

                const res = await fetch('/api/checkout/inter-pix', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ plan: selectedPlan, coupon: couponCode, tempId }),
                });

                const data = await res.json();
                if (!res.ok) {
                    setPendingData(null);
                    throw new Error(data.error);
                }

                if (data.pending) {
                    setPendingData({
                        ...data,
                        seu_numero: data.seu_numero || tempId
                    });
                    return;
                }

                setPixData(data);
                setPendingData(null);
                fetchInvoices(); // Atualiza o histórico imediatamente
            } else if (paymentMethod === 'boleto-inter') {
                // ID numérico para evitar problemas de compatibilidade
                const tempId = Date.now().toString().slice(-15);
                setPendingData({ message: 'Iniciando registro do boleto...', pending: true, seu_numero: tempId });
                setPaymentMethod('boleto-result');

                const res = await fetch('/api/checkout/inter-boleto', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ plan: selectedPlan, coupon: couponCode, tempId }),
                });

                const data = await res.json();
                if (!res.ok) {
                    setPendingData(null);
                    setPaymentMethod('boleto-inter'); // Volta pro form se der erro
                    throw new Error(data.error);
                }

                if (data.pending) {
                    setPendingData({
                        ...data,
                        seu_numero: data.seu_numero || tempId
                    });
                    return;
                }

                setBoletoData(data);
                setPendingData(null);
                fetchInvoices(); // Atualiza o histórico imediatamente
            }
        } catch (err: any) {
            console.error('[CHECKOUT ERROR]', err);
            if (err.message === 'Failed to fetch' || err.message === 'fetch failed') {
                setError(`Erro de conexão (${err.message}). Tente novamente ou contate o suporte.`);
            } else {
                setError(err.message || 'Erro inesperado ao processar pagamento');
            }
        } finally {
            setSaving(false);
        }
    }

    async function handleCancelSubscription() {
        if (!confirm('Tem certeza que deseja cancelar sua assinatura? Você continuará com acesso até o final do período pago.')) return;

        try {
            setCanceling(true);
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) return;

            const res = await fetch('/api/checkout/cancel-subscription', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao cancelar');
            }

            alert('Assinatura cancelada com sucesso! Você continuará com acesso até o final do período atual.');
            fetchCurrentPlan();
        } catch (e: any) {
            alert('Erro: ' + e.message);
        } finally {
            setCanceling(false);
        }
    }

    return (
        <div className="space-y-6">
            {isExpired && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <p className="font-bold uppercase text-[10px] tracking-widest">Atenção: Período Expirado</p>
                        <p className="text-xs font-medium text-red-500/80">Seu período de teste ou assinatura expirou. Escolha um plano abaixo para continuar utilizando a plataforma.</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-20 text-slate-400">
                    <p>Carregando plano...</p>
                </div>
            ) : (
                <>
                    <Card className="bg-slate-900 border-slate-800 shadow-sm">
                        <CardHeader className="py-3 px-4 border-b border-slate-800/50">
                            <CardTitle className="text-slate-100 text-sm font-bold">Plano Atual</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-900/40">
                                            {currentPlan.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-100 capitalize tracking-tight leading-tight">
                                                {dynamicPlans.find(p => p.slug === currentPlan)?.name || currentPlan}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                R$ {(dynamicPlans.find(p => p.slug === currentPlan)?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className={cn(
                                            "px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border",
                                            subscriptionStatus === 'canceled'
                                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                        )}>
                                            {subscriptionStatus === 'canceled' ? 'Cancelamento Pendente' : 'Escalável & Ativo'}
                                        </span>
                                        {stripeSubscriptionId && subscriptionStatus !== 'canceled' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-[8px] text-red-500/70 hover:text-red-500 font-bold uppercase p-0"
                                                onClick={handleCancelSubscription}
                                                disabled={canceling}
                                            >
                                                {canceling ? 'Processando...' : 'Cancelar Assinatura'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* SEÇÃO TURBINAR PACOTE (ADD-ONS) */}
                    <div className="space-y-6 pt-4">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
                                    <Zap className="text-amber-400" size={24} /> Turbinar Pacote
                                </h2>
                                <p className="text-slate-500 text-xs font-medium">Adicione recursos específicos sem precisar trocar de plano.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dynamicAddons
                                .filter(addon => {
                                    const currentPlanData = dynamicPlans.find(p => p.slug === currentPlan);
                                    if (!currentPlanData) return true;
                                    // Se o nome do addon ou slug estiver em alguma feature do plano, oculta
                                    const featuresStr = JSON.stringify(currentPlanData.features || []).toLowerCase();
                                    return !featuresStr.includes(addon.slug.toLowerCase()) &&
                                        !featuresStr.includes(addon.name.toLowerCase().replace('módulo ', ''));
                                })
                                .map((addon) => {
                                    const isActive = activeAddons.includes(addon.slug);
                                    return (
                                        <Card key={addon.id} className={cn(
                                            "bg-slate-900 border-slate-800 transition-all hover:border-slate-700 relative overflow-hidden group shadow-sm",
                                            isActive && "border-emerald-500/50 bg-emerald-500/5"
                                        )}>
                                            {isActive && (
                                                <div className="absolute top-1 right-1">
                                                    <CheckCircle2 className="text-emerald-500" size={14} />
                                                </div>
                                            )}
                                            <CardContent className="p-4">
                                                <div className="space-y-0.5">
                                                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-tight">{addon.name}</h3>
                                                    <p className="text-[9px] text-slate-500 font-medium leading-tight line-clamp-1">{addon.description}</p>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between gap-2">
                                                    <p className="text-xs font-black text-amber-400">
                                                        + R$ {Number(addon.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<span className="text-[8px] text-slate-600 ml-1">/mês</span>
                                                    </p>
                                                    <Button
                                                        size="sm"
                                                        variant={isActive ? "outline" : "default"}
                                                        disabled={isActive || saving}
                                                        onClick={() => {
                                                            setSelectedAddon(addon);
                                                            setSelectedPlan(null);
                                                            setPaymentMethod('card');
                                                            setOpenDialog(true);
                                                        }}
                                                        className={cn(
                                                            "h-7 text-[8px] font-black uppercase tracking-widest px-3",
                                                            isActive ? "border-emerald-500/50 text-emerald-500" : "bg-blue-600 hover:bg-blue-500 text-white"
                                                        )}
                                                    >
                                                        {isActive ? 'Ativado' : 'Adicionar'}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                        </div>
                    </div>

                    <div className="space-y-6 pt-10">
                        <h2 className="text-xl md:text-2xl font-black text-slate-100 light:text-slate-900 uppercase">Deseja migrar de plano?</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {dynamicPlans.filter(p => p.slug !== 'trial').map((plan) => (
                                <Card
                                    key={plan.id}
                                    className={cn(
                                        'bg-slate-900 light:bg-white border-slate-800 light:border-slate-200 cursor-pointer transition-all hover:border-slate-700 light:hover:border-slate-300 rounded-2xl md:rounded-3xl p-2 relative overflow-hidden',
                                        currentPlan === plan.slug && 'border-blue-500 light:border-blue-600 ring-2 ring-blue-500/20'
                                    )}
                                >
                                    <CardHeader>
                                        <CardTitle className="text-slate-100 light:text-slate-900 font-black">{plan.name}</CardTitle>
                                        <CardDescription className="text-slate-500">
                                            <span className="text-2xl font-black text-slate-100 light:text-slate-900">
                                                R$ {plan.price}
                                            </span>
                                            <span className="text-xs">/mês</span>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-2 pt-4 border-t border-slate-800 light:border-slate-100">
                                            {plan.features?.map((feature: any, i: number) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-blue-500" />
                                                    <span className="text-xs text-slate-400 light:text-slate-600">{feature}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <Button
                                            className={cn(
                                                'w-full py-6 rounded-xl font-black uppercase tracking-widest',
                                                currentPlan === plan.slug
                                                    ? 'bg-slate-800 light:bg-slate-100 text-slate-500'
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
                                            )}
                                            disabled={currentPlan === plan.slug}
                                            onClick={() => {
                                                setSelectedPlan(plan.slug);
                                                setSelectedAddon(null);
                                                setPaymentMethod('card');
                                                setOpenDialog(true);
                                            }}
                                        >
                                            {currentPlan === plan.slug ? 'Plano Ativo' : 'Migrar Agora'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                    {/* O loading agora fecha mais abaixo, englobando tudo */}

                    <Dialog open={openDialog} onOpenChange={(open) => {
                        setOpenDialog(open);
                        if (!open) {
                            setPixData(null);
                            setBoletoData(null);
                            setPendingData(null);
                            setError(null);
                        }
                    }}>
                        <DialogContent
                            className="border-slate-800 light:border-slate-200 bg-slate-900 light:bg-white text-slate-100 light:text-slate-900 max-w-md rounded-2xl md:rounded-3xl"
                            onPointerDownOutside={() => fetchInvoices()}
                            onEscapeKeyDown={() => fetchInvoices()}
                        >
                            <DialogHeader>
                                <DialogTitle className="font-black text-xl md:text-2xl tracking-tighter uppercase">Confirmar Contratação</DialogTitle>
                                <DialogDescription className="text-slate-400 light:text-slate-500 font-bold">
                                    {selectedAddon ? (
                                        <>Módulo <span className="text-amber-500 uppercase">{selectedAddon.name}</span> — R$ {Number(selectedAddon.price).toFixed(2).replace('.', ',')}/mês</>
                                    ) : (
                                        <>Plano <span className="text-blue-600 capitalize">{selectedPlan}</span> — R$ {(dynamicPlans.find(p => p.slug === selectedPlan)?.price || 0).toFixed(2).replace('.', ',')}/mês</>
                                    )}
                                </DialogDescription>
                            </DialogHeader>


                            {!pixData && !boletoData && !pendingData && (
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

                                    <div className="space-y-2 pt-2">
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
                                        {paymentMethod === 'boleto-inter' && !tenantHasDocument && (
                                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight mt-2 animate-pulse leading-tight">
                                                Para gerar boleto, é necessário cadastrar o CPF ou CNPJ em Configurações &gt; Barbearia.
                                            </p>
                                        )}
                                        {error && (
                                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight mt-1 animate-pulse">
                                                {error}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {pendingData && (
                                <div className="py-8 text-center space-y-4">
                                    <div className="bg-amber-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto border border-amber-500/20">
                                        <Activity className="animate-spin text-amber-500 w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-100">Gerando Cobrança...</h3>
                                    <p className="text-slate-400 text-sm px-4">{pendingData.message || 'O banco está processando o documento. Isso pode levar alguns minutos devido à alta demanda.'}</p>
                                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-500 mt-4 mx-4">
                                        Fique tranquilo, a cobrança já foi registrada. Assim que o banco liberar o PDF/QR Code, ele aparecerá aqui ou no seu e-mail.
                                    </div>
                                </div>
                            )}

                            {pixData && !pendingData && (
                                <div className="py-4 flex flex-col items-center space-y-4">
                                    <div className="text-center bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl w-full">
                                        <p className="text-[10px] text-emerald-500 uppercase font-black tracking-widest">Valor do Pix</p>
                                        <p className="text-2xl font-black text-slate-100">
                                            R$ {(pixData.amount || Number((selectedAddon ? selectedAddon.price : dynamicPlans.find(p => p.slug === selectedPlan)?.price) || 0)).toFixed(2).replace('.', ',')}
                                        </p>
                                    </div>

                                    <p className="text-center text-xs text-slate-400">
                                        Escaneie o código abaixo para pagar via Pix. O acesso é liberado na hora!
                                    </p>

                                    <div className="bg-white p-3 rounded-xl border-4 border-emerald-500 shadow-xl">
                                        <QRCodeCanvas
                                            value={pixData.pixPayload}
                                            size={160}
                                            level="H"
                                            includeMargin={true}
                                        />
                                    </div>

                                    <div className="w-full space-y-2">
                                        <Label className="text-[10px] text-slate-500 uppercase font-black">Copia e Cola</Label>
                                        <div className="flex gap-2">
                                            <input
                                                readOnly
                                                value={pixData.pixPayload}
                                                className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-[10px] font-mono text-slate-400"
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-slate-700"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(pixData.pixPayload);
                                                    alert('Copiado!');
                                                }}
                                            >
                                                Copiar
                                            </Button>
                                        </div>
                                    </div>

                                    {pixData.pdfUrl && (
                                        <Button
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-tight py-6 rounded-xl"
                                            onClick={() => window.open(pixData.pdfUrl, '_blank')}
                                        >
                                            <FileCheck className="w-5 h-5 mr-2" />
                                            Baixar Comprovante / PDF
                                        </Button>
                                    )}
                                </div>
                            )}

                            {boletoData && !pendingData && (
                                <div className="py-4 space-y-4">
                                    <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl text-center space-y-2">
                                        <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <FileText className="w-6 h-6 text-blue-500" />
                                        </div>
                                        <h3 className="font-black text-slate-100 uppercase tracking-tight text-lg">Boleto Registrado</h3>
                                        <p className="text-xs text-slate-400">Pague agora pelo seu banco e libere seu acesso.</p>

                                        <div className="pt-4 flex justify-around border-t border-blue-500/10">
                                            <div className="text-center">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Valor</p>
                                                <p className="text-sm font-black text-slate-100">R$ {(boletoData.amount || Number((selectedAddon ? selectedAddon.price : dynamicPlans.find(p => p.slug === selectedPlan)?.price) || 0)).toFixed(2).replace('.', ',')}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Vencimento</p>
                                                <p className="text-sm font-black text-slate-100">{new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Código de Barras / Linha Digitável</Label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-[11px] font-mono text-blue-400 break-all leading-relaxed">
                                                {boletoData.linhaDigitavel}
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-auto border-slate-800 bg-slate-950 hover:bg-slate-900 group"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(boletoData.linhaDigitavel);
                                                    alert('Linha digitável copiada!');
                                                }}
                                            >
                                                <Copy className="w-4 h-4 text-slate-500 group-hover:text-blue-500" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <Button
                                            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-tight shadow-lg shadow-blue-600/20"
                                            onClick={() => window.open(boletoData.pdfUrl, '_blank')}
                                        >
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            Imprimir / Ver PDF Completo
                                        </Button>
                                    </div>

                                    <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 space-y-2">
                                        <p className="text-[10px] text-amber-500 text-center uppercase tracking-widest leading-relaxed font-bold">
                                            ⚠️ ATENÇÃO: O banco pode levar até 20 minutos para registrar o boleto.
                                            <br />
                                            Se o PDF não abrir ou der erro, aguarde alguns minutos e tente novamente pelo Histórico de Faturas.
                                        </p>
                                        <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest leading-relaxed font-medium pt-2 border-t border-slate-800/50">
                                            A compensação bancária ocorre em até 2 dias úteis.<br />
                                            Dica: Use o Pix para liberação instantânea.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <DialogFooter>
                                {!pixData && !boletoData && !pendingData ? (
                                    <>
                                        <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => { setOpenDialog(false); fetchInvoices(); }} disabled={saving}>Cancelar</Button>
                                        <Button onClick={handleChangePlan} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                                            {saving ? 'Processando...' : 'Confirmar e Pagar'}
                                        </Button>
                                    </>
                                ) : (
                                    <Button onClick={() => { setOpenDialog(false); fetchInvoices(); }} className="w-full bg-slate-800 text-white hover:bg-slate-700">Fechar</Button>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* --- SEÇÃO DE HISTÓRICO DE FATURAS --- */}
                    <div className="mt-12 space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-500/10 p-2 rounded-lg">
                                    <FileText className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-100">Meu Histórico de Faturas</h2>
                                    <p className="text-xs text-slate-500">Acompanhe seus pagamentos e baixe boletos anteriores.</p>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                            {loadingInvoices ? (
                                <div className="py-12 text-center text-slate-500 animate-pulse uppercase text-[10px] font-black tracking-widest"> Carregando faturas... </div>
                            ) : invoices.length === 0 ? (
                                <div className="py-12 text-center text-slate-600 uppercase text-[10px] font-black tracking-widest"> Nenhuma fatura encontrada. </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-950/50 border-b border-slate-800">
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Método</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {invoices.map((inv) => (
                                                <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4 text-xs text-slate-400">
                                                        {(() => {
                                                            const dateStr = inv.date;
                                                            if (!dateStr) return '---';
                                                            if (dateStr.length === 10) {
                                                                const [y, m, d] = dateStr.split('-');
                                                                return `${d}/${m}/${y}`;
                                                            }
                                                            return new Date(dateStr).toLocaleDateString('pt-BR');
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-xs font-bold text-slate-200">{inv.description}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono">ID: {inv.metadata?.nosso_numero || inv.id.slice(0, 8)}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            {inv.metadata?.method === 'pix_inter' ? (
                                                                <span className="flex items-center gap-1 font-black text-[9px] text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-tighter">
                                                                    <Zap className="w-2.5 h-2.5" /> Pix
                                                                </span>
                                                            ) : inv.metadata?.method === 'boleto_inter' ? (
                                                                <span className="flex items-center gap-1 font-black text-[9px] text-blue-500 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-tighter">
                                                                    <FileText className="w-2.5 h-2.5" /> Boleto
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-500 uppercase">Cartão</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-black text-slate-200">
                                                        R$ {inv.value.toFixed(2).replace('.', ',')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {inv.is_paid ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase">Pago</span>
                                                        ) : inv.metadata?.status_inter === 'CANCELADO' || inv.metadata?.status_inter === 'EXPIRADO' ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase">Cancelado</span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">Pendente</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-left whitespace-nowrap">
                                                        <div className="flex items-center justify-start gap-3">
                                                            {/* Só mostra botões de ação se NÃO estiver pago E NÃO estiver cancelado/expirado */}
                                                            {!inv.is_paid &&
                                                                (inv.metadata?.method === 'boleto_inter' || inv.metadata?.method === 'pix_inter') &&
                                                                inv.metadata?.status_inter !== 'CANCELADO' &&
                                                                inv.metadata?.status_inter !== 'EXPIRADO' && (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            className="h-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 text-[10px] font-black uppercase"
                                                                            onClick={async () => {
                                                                                if (!confirm('Verificar status do pagamento no banco agora?')) return;
                                                                                try {
                                                                                    // Tenta pelo seu_numero ou txid
                                                                                    const seuNumero = inv.metadata.seu_numero;
                                                                                    const txid = inv.metadata.txid;

                                                                                    // Chama endpoint de Polling para atualizar status
                                                                                    let url = `/api/barbershop/check-pending-payment?force=true`;
                                                                                    if (seuNumero) url += `&seu_numero=${seuNumero}`;
                                                                                    else if (txid) url += `&txid=${txid}`; // Fallback se o endpoint suportar txid direto no query

                                                                                    // Nota: o endpoint atual suporta seu_numero e busca pelo txid interno no metadada.
                                                                                    // Se o seu_numero falhar, podemos ter que usar o debug endpoint.

                                                                                    // Vamos usar também o endpoint de DEBUG FORCE CHECK que é garantido
                                                                                    if (txid) {
                                                                                        const debugRes = await fetch(`/api/debug/force-check?txid=${txid}`);
                                                                                        const debugData = await debugRes.json();
                                                                                        if (debugData.updatedIsPaid || debugData.updated) {
                                                                                            alert('Status Atualizado! 🚀');
                                                                                            fetchInvoices();
                                                                                            return;
                                                                                        }
                                                                                    }

                                                                                    // Fallback para polling normal
                                                                                    if (seuNumero) {
                                                                                        const res = await fetch(`/api/barbershop/check-pending-payment?seu_numero=${seuNumero}`);
                                                                                        const data = await res.json();
                                                                                        if (data.ready || data.statusUpdated) {
                                                                                            // O pooling já atualiza o is_paid se detectar
                                                                                            alert('Status Atualizado!');
                                                                                            fetchInvoices();
                                                                                        } else {
                                                                                            alert('Ainda consta como pendente no banco.');
                                                                                        }
                                                                                    }
                                                                                } catch (e: any) {
                                                                                    alert('Erro ao verificar: ' + e.message);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Activity className="w-3 h-3 mr-1" /> Check
                                                                        </Button>

                                                                        {inv.metadata?.method === 'pix_inter' ? (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-black uppercase"
                                                                                onClick={() => {
                                                                                    // Reabrir Modal Pix
                                                                                    setPixData({
                                                                                        amount: inv.value,
                                                                                        pixPayload: inv.metadata.pix_payload,
                                                                                        expiresAt: inv.metadata.expires_at || new Date().toISOString(),
                                                                                        pdfUrl: undefined // Pix pendente não tem PDF
                                                                                    });
                                                                                    setPendingData({
                                                                                        pending: true,
                                                                                        message: 'Aguardando pagamento...',
                                                                                        seu_numero: inv.metadata.seu_numero
                                                                                    }); // Ativa polling UI
                                                                                    setOpenDialog(true);
                                                                                }}
                                                                            >
                                                                                <Zap className="w-3 h-3 mr-1" /> Ver Pix
                                                                            </Button>
                                                                        ) : (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 text-[10px] font-black uppercase"
                                                                                onClick={() => {
                                                                                    const codigoSolicitacao = inv.metadata.txid;
                                                                                    const nossoNumero = inv.metadata.nosso_numero || '';
                                                                                    const url = codigoSolicitacao
                                                                                        ? `/api/checkout/inter-boleto/pdf?codigoSolicitacao=${codigoSolicitacao}&nossoNumero=${nossoNumero}`
                                                                                        : `/api/checkout/inter-boleto/pdf?nossoNumero=${nossoNumero}`;
                                                                                    window.open(url, '_blank')
                                                                                }}
                                                                            >
                                                                                <FileText className="w-3 h-3 mr-1" /> PDF
                                                                            </Button>
                                                                        )}
                                                                    </>
                                                                )}

                                                            {/* --- AÇÃO: EMITIR NFS-E (SÓ PARA PAGOS SEM NOTA) --- */}
                                                            {inv.is_paid && !inv.metadata?.nfe_id && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 text-[10px] font-black uppercase"
                                                                    onClick={async () => {
                                                                        if (!confirm('Deseja emitir a NFS-e Nacional para este pagamento agora?')) return;
                                                                        try {
                                                                            const { data: { session } } = await supabaseClient.auth.getSession();
                                                                            if (!session) return;

                                                                            const res = await fetch('/api/barbershop/invoices/emit-nfse', {
                                                                                method: 'POST',
                                                                                headers: {
                                                                                    'Content-Type': 'application/json',
                                                                                    'Authorization': `Bearer ${session.access_token}`
                                                                                },
                                                                                body: JSON.stringify({ financeId: inv.id }),
                                                                            });

                                                                            const data = await res.json();
                                                                            if (!res.ok) throw new Error(data.error);

                                                                            alert('NFS-e emitida com sucesso! A página será atualizada.');
                                                                            fetchInvoices();
                                                                        } catch (e: any) {
                                                                            alert('Erro ao emitir: ' + e.message);
                                                                        }
                                                                        console.log('Emitindo NFS-e...');
                                                                    }}
                                                                >
                                                                    <FileCheck className="w-3 h-3 mr-1" /> Emitir NFS-e
                                                                </Button>
                                                            )}

                                                            {/* --- AÇÃO: VER NOTA (SE JÁ EXISTIR) --- */}
                                                            {inv.metadata?.nfe_id && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-black uppercase"
                                                                    onClick={() => {
                                                                        if (inv.metadata?.nfe_pdf_url) {
                                                                            window.open(inv.metadata.nfe_pdf_url, '_blank');
                                                                        } else {
                                                                            alert('PDF da nota não disponível. ID: ' + inv.metadata.nfe_id);
                                                                        }
                                                                    }}
                                                                >
                                                                    <FileCheck className="w-3 h-3 mr-1" /> Ver NFS-e
                                                                </Button>
                                                            )}

                                                            {/* Mostra NF apenas se estiver pago */}
                                                            {inv.is_paid && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    disabled
                                                                    className="h-8 text-slate-600 border border-slate-800 text-[10px] font-black uppercase opacity-50 cursor-not-allowed group relative"
                                                                >
                                                                    <Shield className="w-3 h-3 mr-1" /> NF
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
