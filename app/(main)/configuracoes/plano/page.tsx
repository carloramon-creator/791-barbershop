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
import AsaasCheckoutModal from '@/components/asaas/AsaasCheckoutModal';
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
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix' | 'boleto-inter' | 'boleto-result' | 'pix-result'>('card');
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
    const [tenantCreatedAt, setTenantCreatedAt] = useState<string | null>(null);
    const [tenantObject, setTenantObject] = useState<any>(null);
    const [canceling, setCanceling] = useState(false);
    const [selectedInterval, setSelectedInterval] = useState<number>(1);
    const [checkingAsaasPayment, setCheckingAsaasPayment] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);


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
                // Chama tudo em paralelo (Planos do sistema, Invoices/Sync e Status atual)
                await Promise.all([
                    (async () => {
                        const [plans, addons] = await Promise.all([
                            Api.getSystemPlans(),
                            Api.getSystemAddons()
                        ]);
                        setDynamicPlans(plans || []);
                        setDynamicAddons(addons || []);
                    })(),
                    fetchInvoices(),
                    fetchCurrentPlan(false)
                ]);
            } catch (e) {
                console.error('Erro na inicialização:', e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    // Monitorar pagamento pendente do Asaas
    useEffect(() => {
        const checkPendingAsaasPayment = async () => {
            const pendingStr = localStorage.getItem('asaas_pending_payment');
            if (!pendingStr) {
                setCheckingAsaasPayment(false);
                return;
            }

            try {
                setCheckingAsaasPayment(true);
                const pending = JSON.parse(pendingStr);
                const { paymentId, timestamp } = pending;

                // Verificar se não é muito antigo (máximo 30 minutos)
                const thirtyMinutes = 30 * 60 * 1000;
                if (Date.now() - timestamp > thirtyMinutes) {
                    localStorage.removeItem('asaas_pending_payment');
                    setCheckingAsaasPayment(false);
                    return;
                }

                console.log('[ASAAS] Verificando pagamento pendente:', paymentId);

                // Verificar status do pagamento
                const res = await fetch(`/api/asaas/check-payment?paymentId=${paymentId}`);
                if (!res.ok) {
                    console.error('[ASAAS] Erro ao verificar pagamento');
                    return;
                }

                const data = await res.json();
                console.log('[ASAAS] Status do pagamento:', data.payment.status);

                if (data.payment.isPaid || data.payment.localRecord.isPaid) {
                    // Pagamento confirmado!
                    localStorage.removeItem('asaas_pending_payment');
                    setCheckingAsaasPayment(false);

                    // Mostrar mensagem de sucesso
                    alert('✅ Pagamento confirmado! Seu plano foi ativado com sucesso.');

                    // Atualizar dados
                    await fetchCurrentPlan();
                    await fetchInvoices();
                } else if (data.payment.status === 'PENDING') {
                    // Ainda pendente, continuar monitorando
                    console.log('[ASAAS] Pagamento ainda pendente, continuando monitoramento...');
                }
            } catch (error) {
                console.error('[ASAAS] Erro ao verificar pagamento pendente:', error);
            }
        };

        // Verificar imediatamente ao carregar a página
        checkPendingAsaasPayment();

        // Continuar verificando a cada 5 segundos se houver pagamento pendente
        const interval = setInterval(() => {
            const pendingStr = localStorage.getItem('asaas_pending_payment');
            if (pendingStr) {
                checkPendingAsaasPayment();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, []);


    async function fetchCurrentPlan(shouldSetLoading = true) {
        try {
            if (shouldSetLoading) setLoading(true);

            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) throw new Error('Usuário não autenticado');

            // Busca plano e detalhes do tenant em paralelo
            const [planRes, tenantRes] = await Promise.all([
                fetch(`${API_URL}/api/barbershop/plan`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                }),
                fetch(`${API_URL}/api/barbershop`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                })
            ]);

            const [planData, tenantData] = await Promise.all([
                planRes.json(),
                tenantRes.json()
            ]);

            if (!planRes.ok) throw new Error(planData.error);

            setCurrentPlan(planData.currentPlan || 'trial');
            setStripeSubscriptionId(planData.stripeSubscriptionId);
            setSubscriptionStatus(planData.subscriptionStatus);
            setActiveAddons(planData.activeAddons || []);
            setTenantCreatedAt(tenantData.created_at);
            setTenantObject(tenantData);

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
                                setPaymentMethod('pix-result');
                            } else {
                                setBoletoData(data.payload);
                                setPaymentMethod('boleto-result');
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

    const [installments, setInstallments] = useState(1);

    async function handleChangePlan() {
        if (!selectedPlan && !selectedAddon) return;

        try {
            setSaving(true);
            setError(null);
            setPixData(null);
            setBoletoData(null);
            setPendingData(null);

            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) throw new Error('Usuário não autenticado ou sessão expirada');

            const paymentMethodMap = {
                'card': 'CREDIT_CARD',
                'pix': 'PIX',
                'boleto-inter': 'BOLETO'
            };

            let endpoint = '/api/asaas/create-checkout';
            if (paymentMethod === 'pix' || paymentMethod === 'boleto-inter') {
                setPendingData({
                    pending: true,
                    message: paymentMethod === 'pix' ? 'Gerando seu PIX no Banco Inter...' : 'Gerando seu Boleto no Banco Inter...'
                });
                endpoint = paymentMethod === 'pix' ? '/api/checkout/inter-pix' : '/api/checkout/inter-boleto';
            }

            const payload = {
                plan: selectedPlan,
                addon: selectedAddon?.slug,
                coupon: couponCode,
                interval: selectedInterval,
                paymentMethod: paymentMethodMap[paymentMethod as keyof typeof paymentMethodMap] || 'CREDIT_CARD',
                installments: paymentMethod === 'card' ? installments : 1
            };

            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            console.log('[PAYMENT DEBUG] Response:', { ok: res.ok, status: res.status, data, paymentMethod });
            if (!res.ok) throw new Error(data.error || 'Erro ao processar pagamento');

            if (data.checkoutUrl && paymentMethod === 'card') {
                // Abrir modal com checkout integrado (Asaas - Cartão)
                setCheckoutUrl(data.checkoutUrl);
                setShowCheckoutModal(true);
                setOpenDialog(false);
            } else if (data.seu_numero || data.pending || data.pixPayload || data.pdfUrl) {
                // Resposta do Banco Inter (Pix ou Boleto)
                if (paymentMethod === 'pix') {
                    if (data.pixPayload) {
                        setPixData({
                            pixPayload: data.pixPayload,
                            amount: data.amount,
                            expiresAt: data.expiresAt,
                            pdfUrl: data.pdfUrl
                        } as any);
                        setPaymentMethod('pix-result');
                        setPendingData(null);
                    } else {
                        setPendingData({
                            pending: true,
                            message: data.message || 'Gerando seu PIX no Banco Inter...',
                            seu_numero: data.seu_numero
                        });
                    }
                    setOpenDialog(true);
                } else if (paymentMethod === 'boleto-inter') {
                    if (data.pdfUrl && data.linhaDigitavel) {
                        setBoletoData({
                            linhaDigitavel: data.linhaDigitavel,
                            codigoBarras: data.codigoBarras,
                            pdfUrl: data.pdfUrl,
                            amount: data.amount,
                            nossoNumero: data.nossoNumero || ''
                        } as any);
                        setPaymentMethod('boleto-result');
                        setPendingData(null);
                    } else {
                        setPendingData({
                            pending: true,
                            message: 'Registrando boleto no Banco Inter...',
                            seu_numero: data.seu_numero
                        });
                        setOpenDialog(true);
                    }
                }
                fetchInvoices();
            } else if (data.pixQrCode || data.pixData) {
                // Fallback Asaas Pix
                setPixData({
                    pixPayload: data.pixCopyPaste || data.pixData?.payload,
                    amount: data.amount,
                    expiresAt: data.expiresAt || data.pixData?.expirationDate,
                    encodedImage: data.pixData?.encodedImage
                } as any);
                setOpenDialog(true);
                fetchInvoices();
            } else if (data.boletoUrl || data.boletoData) {
                // Fallback Asaas Boleto
                setBoletoData({
                    nossoNumero: '',
                    codigoBarras: data.barCode || data.boletoData?.barCode,
                    linhaDigitavel: data.barCode || data.boletoData?.identificationField,
                    pdfUrl: data.boletoUrl || data.boletoData?.bankSlipUrl,
                    amount: data.amount || data.boletoData?.value
                } as any);
                setPaymentMethod('boleto-result');
                fetchInvoices();
            } else {
                throw new Error('Retorno desconhecido do gateway');
            }

        } catch (err: any) {
            console.error('[CHECKOUT ERROR]', err);
            setError(err.message || 'Erro inesperado ao processar pagamento');
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
            {checkingAsaasPayment && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl space-y-4 animate-pulse">
                    <div className="flex items-start gap-4">
                        <Activity className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1 animate-spin" />
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-blue-500">Verificando Pagamento</h3>
                            <p className="text-blue-400 font-medium leading-relaxed">
                                Estamos verificando o status do seu pagamento no Asaas. Aguarde alguns instantes...
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {isExpired && (

                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl space-y-4">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-red-500">Atenção: Acesso Bloqueado</h3>
                            <p className="text-red-400 font-medium leading-relaxed">
                                Sua assinatura expirou ou o período de teste encerrou. Para continuar utilizando a plataforma, escolha um plano abaixo e realize o pagamento.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pl-0 md:pl-12">
                        <a
                            href={`mailto:contato@791solucoes.com.br?subject=Erro de Pagamento - ${tenantObject?.name || '791 Barber'}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold uppercase transition-colors"
                        >
                            <ExternalLink size={14} /> Reportar Erro (Email)
                        </a>
                        <a
                            href="https://wa.me/5548991803379?text=Olá, preciso de ajuda com minha assinatura no 791 Barber."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-bold uppercase transition-colors"
                        >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-4 h-4" />
                            Falar no Suporte
                        </a>

                        <Button
                            variant="default"
                            onClick={() => {
                                const targetPlan = (currentPlan && currentPlan !== 'trial') ? currentPlan : 'basic';
                                setSelectedPlan(targetPlan);
                                setSelectedAddon(null);
                                setPaymentMethod('card');
                                setOpenDialog(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs"
                        >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Regularizar Assinatura
                        </Button>

                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-20 text-slate-400">
                    <p>Carregando plano...</p>
                </div>
            ) : (
                <>
                    {/* LAYOUT LADO A LADO: PLANO ATUAL + ADD-ONS */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* COLUNA ESQUERDA: PLANO ATUAL */}
                        <div className="lg:col-span-4 space-y-6">
                            <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden ring-1 ring-white/5">
                                <CardHeader className="py-4 px-5 border-b border-slate-800/50 bg-slate-950/30">
                                    <CardTitle className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <CreditCard size={14} className="text-blue-500" /> Plano Atual
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="space-y-6">
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-xl shadow-blue-900/40 transform -rotate-3 group-hover:rotate-0 transition-transform">
                                                {currentPlan.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-3xl font-black text-slate-100 capitalize tracking-tight leading-none mb-2">
                                                    {dynamicPlans.find(p => p.slug === currentPlan)?.name || currentPlan}
                                                </h3>
                                                <p className="text-xl font-black text-blue-500">
                                                    {tenantObject?.subscription_current_period_end ? (
                                                        <>
                                                            Vence em: {new Date(tenantObject.subscription_current_period_end).toLocaleDateString('pt-BR')}
                                                            {(() => {
                                                                const end = new Date(tenantObject.subscription_current_period_end);
                                                                const now = new Date();
                                                                const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                                                return (
                                                                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                                                                        {diff > 0 ? `Faltam ${diff} dias` : 'Plano Expirado'}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </>
                                                    ) : (
                                                        <>R$ {(dynamicPlans.find(p => p.slug === currentPlan)?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-800/50 flex flex-col gap-3">
                                            <span className={cn(
                                                "w-fit px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border shadow-sm",
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
                                                    className="h-8 text-[10px] text-red-500/60 hover:text-red-500 hover:bg-red-500/10 font-black uppercase tracking-widest p-0 justify-start"
                                                    onClick={handleCancelSubscription}
                                                    disabled={canceling}
                                                >
                                                    {canceling ? 'Processando...' : '✖ Cancelar Assinatura'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* COLUNA DIREITA: TURBINAR PACOTE */}
                        <div className="lg:col-span-8 space-y-6">
                            <div>
                                <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight flex items-center gap-3">
                                    <Zap className="text-amber-400 fill-amber-400" size={24} /> Turbinar Pacote
                                </h2>
                                <p className="text-slate-500 text-sm font-medium mt-1">Recursos específicos para sua necessidade.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {dynamicAddons
                                    .filter(addon => {
                                        // Premium: TUDO INCLUSO (não mostrar turbinar)
                                        if (currentPlan === 'premium' || currentPlan === 'complete') {
                                            // Se for Complete, temos que ver se o usuário quer esconder ou mostrar?
                                            // Ele disse "no plano completo... deveria aparecer os módulos".
                                            // Então 'complete' NÃO DEVE ter return false direto se não tiver tudo.
                                            // Vou manter false apenas para 'premium' conforme a queixa da foto 5.
                                        }
                                        if (currentPlan === 'premium') return false;

                                        const currentPlanData = dynamicPlans.find(p => p.slug === currentPlan);
                                        if (!currentPlanData) return true;

                                        const addonName = addon.name.toLowerCase().replace('módulo ', '').trim();

                                        const features = (currentPlanData.features || []).map((f: any) => String(f).toLowerCase());

                                        const hasFeature = features.some((f: string) => {
                                            // Ignorar features negativas (ex: "Sem Estoque")
                                            if (f.includes('sem ') || f.includes('não ') || f.includes('no ')) return false;

                                            return f.includes(addonName) || f.includes(addon.slug);
                                        });

                                        return !hasFeature;
                                    })
                                    .map((addon) => {
                                        const isActive = activeAddons.includes(addon.slug);
                                        return (
                                            <Card key={addon.id} className={cn(
                                                "bg-slate-900/40 border-slate-800 transition-all hover:border-slate-700 relative overflow-hidden group shadow-sm backdrop-blur-sm",
                                                isActive && "border-emerald-500/50 bg-emerald-500/5"
                                            )}>
                                                {isActive && (
                                                    <div className="absolute top-2 right-2">
                                                        <CheckCircle2 className="text-emerald-500" size={16} />
                                                    </div>
                                                )}
                                                <CardContent className="p-5">
                                                    <div className="mb-4">
                                                        <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight mb-1">{addon.name}</h3>
                                                        <p className="text-[11px] text-slate-500 font-medium leading-normal h-8 line-clamp-2">{addon.description}</p>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Investimento</span>
                                                            <p className="text-sm font-black text-amber-500">
                                                                R$ {Number(addon.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<span className="text-[9px] text-slate-600 ml-1 lowercase">/mês</span>
                                                            </p>
                                                        </div>
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
                                                                "h-9 text-[10px] font-black uppercase tracking-widest px-4 shadow-lg active:scale-95 transition-all",
                                                                isActive ? "border-emerald-500/50 text-emerald-500 bg-transparent" : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
                                                            )}
                                                        >
                                                            {isActive ? 'Ativo' : 'Adicionar'}
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO DE MIGRAÇÃO DE PLANO */}
                    <div className="space-y-8 pt-16 mt-16 border-t border-slate-800/50">
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl md:text-4xl font-black text-slate-100 uppercase tracking-tighter">Escolha seu Próximo Nível</h2>
                            <p className="text-slate-500 font-medium">Migre agora e libere todo o potencial da sua barbearia.</p>
                        </div>

                        {/* SELETOR DE PERÍODO */}
                        <div className="flex justify-center mt-8">
                            <div className="bg-slate-900 border border-slate-800 p-1 rounded-2xl flex gap-1 shadow-2xl">
                                {[
                                    { id: 1, label: 'Mensal', discount: 0 },
                                    { id: 6, label: 'Semestral', discount: 10 },
                                    { id: 12, label: 'Anual', discount: 20 },
                                ].map((period) => (
                                    <button
                                        key={period.id}
                                        onClick={() => {
                                            setSelectedInterval(period.id);
                                            setInstallments(1); // Resetar parcelas ao mudar ciclo
                                        }}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden",
                                            selectedInterval === period.id
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                                        )}
                                    >
                                        {period.label}
                                        {period.discount > 0 && (
                                            <span className="ml-2 bg-emerald-500 text-[8px] px-1.5 py-0.5 rounded-full text-white animate-pulse">
                                                -{period.discount}%
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {dynamicPlans.filter(p => p.slug !== 'trial').map((plan) => (
                                <Card
                                    key={plan.id}
                                    className={cn(
                                        'bg-slate-900 border-slate-800 cursor-pointer transition-all hover:border-slate-600 rounded-3xl p-1 relative overflow-hidden group shadow-2xl',
                                        currentPlan === plan.slug && 'border-blue-500 ring-4 ring-blue-500/10'
                                    )}
                                >
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-blue-500/20">
                                                {plan.slug}
                                            </span>
                                            {currentPlan === plan.slug && (
                                                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg">
                                                    <CheckCircle2 size={12} /> Plano Ativo
                                                </span>
                                            )}
                                        </div>

                                        <CardHeader className="p-0 mb-6">
                                            <CardTitle className="text-3xl font-black text-slate-100 tracking-tight mb-2">{plan.name}</CardTitle>
                                            <div className="space-y-1">
                                                {(() => {
                                                    const basePrice = plan.price || 0;
                                                    const discount = selectedInterval === 6 ? 10 : selectedInterval === 12 ? 20 : 0;
                                                    const totalPrice = (basePrice * selectedInterval) * (1 - (discount / 100));
                                                    const monthlyEquivalent = totalPrice / selectedInterval;

                                                    return (
                                                        <>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-3xl font-black text-slate-100">R$ {monthlyEquivalent.toFixed(2).replace('.', ',')}</span>
                                                                <span className="text-xs text-slate-500 font-bold lowercase">/mês</span>
                                                            </div>
                                                            {selectedInterval > 1 && (
                                                                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">
                                                                    Total: R$ {totalPrice.toFixed(2).replace('.', ',')} ({selectedInterval} meses)
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            {plan.description && (
                                                <p className="mt-4 text-xs font-bold text-slate-500 leading-relaxed min-h-[40px]">
                                                    {plan.description}
                                                </p>
                                            )}
                                        </CardHeader>

                                        <CardContent className="p-0 space-y-8">
                                            <div className="space-y-4 pt-6 border-t border-slate-800">
                                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">O que está incluso:</p>
                                                <div className="space-y-3">
                                                    {plan.features?.map((feature: any, i: number) => (
                                                        <div key={i} className="flex items-start gap-3 group/item">
                                                            <div className="mt-0.5 w-4 h-4 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                                                <Check className="w-2.5 h-2.5 text-amber-500" />
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-400 group-hover/item:text-slate-200 transition-colors leading-tight">
                                                                {feature}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <Button
                                                className={cn(
                                                    'w-full py-7 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl',
                                                    currentPlan === plan.slug && subscriptionStatus === 'active'
                                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                                        : 'bg-blue-600 hover:bg-white hover:text-blue-600 text-white shadow-blue-600/20 active:scale-95'
                                                )}
                                                disabled={currentPlan === plan.slug && subscriptionStatus === 'active'}
                                                onClick={() => {
                                                    setSelectedPlan(plan.slug);
                                                    setSelectedAddon(null);
                                                    setPaymentMethod('card');
                                                    setOpenDialog(true);
                                                }}
                                            >
                                                {currentPlan === plan.slug && subscriptionStatus === 'active' ? 'Plano Ativo' : 'Assinar Agora'}
                                            </Button>
                                        </CardContent>
                                    </div>
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
                                        <div className="flex flex-col gap-1">
                                            <span>
                                                Plano <span className="text-blue-600 capitalize">{selectedPlan}</span> —
                                                {(() => {
                                                    const plan = dynamicPlans.find(p => p.slug === selectedPlan);
                                                    if (!plan) return '';
                                                    const basePrice = plan.price || 0;
                                                    const discount = selectedInterval === 6 ? 10 : selectedInterval === 12 ? 20 : 0;
                                                    const totalPrice = (basePrice * selectedInterval) * (1 - (discount / 100));
                                                    return ` R$ ${totalPrice.toFixed(2).replace('.', ',')} (${selectedInterval} ${selectedInterval === 1 ? 'mês' : 'meses'})`;
                                                })()}
                                            </span>
                                            {/* VISUALIZAÇÃO DO DESCONTO 10% (Apenas se cadastrado há menos de 5 dias) */}
                                            {(() => {
                                                const created = new Date(tenantCreatedAt || new Date());
                                                const now = new Date();
                                                const diffDays = Math.ceil(Math.abs(now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

                                                const isNewAccount = diffDays <= 5;
                                                const isTrialOrUnpaid = (!['active', 'active_paid'].includes(subscriptionStatus || '') || ['trial', 'trialing'].includes(subscriptionStatus || ''));

                                                if (tenantCreatedAt && isNewAccount && isTrialOrUnpaid) {
                                                    return (
                                                        <span className="text-emerald-500 font-black text-[10px] md:text-xs uppercase tracking-wider animate-pulse flex items-center gap-1">
                                                            <span>🎉</span> Desconto de 10% na 1ª fatura aplicado!
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
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
                                            <span className="text-[10px] font-black uppercase">Instantâneo</span>
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

                                    {/* SELETOR DE PARCELAS REMOVIDO A PEDIDO DO USUÁRIO - O CLIENTE ESCOLHE NO ASAAS */}

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
                                                                    onClick={async () => {
                                                                        if (inv.metadata?.nfe_pdf_url) {
                                                                            try {
                                                                                // Se a URL for do nosso provedor, precisamos mandar os dados da note para gerar
                                                                                if (inv.metadata.nfe_pdf_url.includes('/nfse/pdf')) {
                                                                                    const { data: { session } } = await supabaseClient.auth.getSession();
                                                                                    const res = await fetch(inv.metadata.nfe_pdf_url, {
                                                                                        method: 'POST',
                                                                                        headers: {
                                                                                            'Content-Type': 'application/json',
                                                                                            'Authorization': `Bearer ${session?.access_token}`
                                                                                        },
                                                                                        body: JSON.stringify({
                                                                                            dpsData: {
                                                                                                numero: inv.metadata.nfe_id || inv.id.slice(-8),
                                                                                                dataEmissao: inv.metadata.nfe_emission_date || inv.date,
                                                                                                prestador: { cnpj: 'XX.XXX.XXX/0001-XX', inscricaoMunicipal: 'XXXXXXX' },
                                                                                                tomador: { razaoSocial: inv.description, cnpj: 'XX.XXX.XXX/0001-XX' }, // Simplificado
                                                                                                servico: { valorServicos: inv.value, discriminacao: inv.description, codigoItemListaServico: '0101' }
                                                                                            }
                                                                                        })
                                                                                    });
                                                                                    const blob = await res.blob();
                                                                                    const url = window.URL.createObjectURL(blob);
                                                                                    window.open(url, '_blank');
                                                                                } else {
                                                                                    window.open(inv.metadata.nfe_pdf_url, '_blank');
                                                                                }
                                                                            } catch (e) {
                                                                                console.error('Erro ao abrir PDF:', e);
                                                                                alert('Erro ao gerar PDF da nota.');
                                                                            }
                                                                        } else {
                                                                            alert('PDF da nota não disponível. ID: ' + inv.metadata.nfe_id);
                                                                        }
                                                                    }}
                                                                >
                                                                    <FileCheck className="w-3 h-3 mr-1" /> Ver NFS-e
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

            {/* Modal de Checkout Integrado do Asaas */}
            {checkoutUrl && (
                <AsaasCheckoutModal
                    checkoutUrl={checkoutUrl}
                    isOpen={showCheckoutModal}
                    boletoData={boletoData ? {
                        identificationField: boletoData.linhaDigitavel,
                        barCode: boletoData.codigoBarras,
                        value: boletoData.amount || 0,
                        dueDate: (boletoData as any).dueDate,
                        bankSlipUrl: boletoData.pdfUrl
                    } : null}
                    pixData={pixData ? {
                        encodedImage: (pixData as any).encodedImage,
                        payload: pixData.pixPayload,
                        expirationDate: pixData.expiresAt
                    } : null}
                    onClose={() => {
                        setShowCheckoutModal(false);
                        setCheckoutUrl(null);
                        setBoletoData(null);
                        setPixData(null);
                        // Atualizar dados após fechar modal
                        fetchCurrentPlan();
                        fetchInvoices();
                    }}
                />
            )}
        </div>
    );
}
