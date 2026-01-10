'use client';

// RAILWAY MIGRATION TRIGGER - GOL DA VITÓRIA ⚽
import React, { useState, useEffect } from 'react';
import { Users, Building2, CreditCard, Check, Shield, FileText, ExternalLink, Copy, Activity, Zap, FileCheck } from 'lucide-react';
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
import { QRCodeCanvas } from 'qrcode.react';

import { supabaseClient } from '@/lib/supabase-client';

// Use NEXT_PUBLIC_BACKEND_URL if set, else fallback.
// Hardcoding production URL to ensure immediate fix
const API_URL = '';

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
    trial: { id: 'trial', name: 'Período de Teste', price: 0, barbers: 'Total', appointments: 'Ilimitados', support: 'Limitado', features: ['Teste grátis'] },
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
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix' | 'boleto-inter' | 'boleto-result'>('card');
    const [couponCode, setCouponCode] = useState('');
    const [pixData, setPixData] = useState<{ pixPayload: string; amount: number; expiresAt: string; pdfUrl?: string } | null>(null);
    const [boletoData, setBoletoData] = useState<{ nossoNumero: string; codigoBarras: string; linhaDigitavel: string; pdfUrl: string; amount?: number } | null>(null);
    const [pendingData, setPendingData] = useState<{ message: string; pending: boolean; seu_numero?: string } | null>(null);
    const [tenantHasDocument, setTenantHasDocument] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

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

            // Also check if tenant has CNPJ/CPF
            const tenantRes = await fetch(`${API_URL}/api/barbershop`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const tenantData = await tenantRes.json();
            // Check both cnpj and potentially other fields if needed, being robust
            const doc = tenantData.cnpj || tenantData.cpf_cnpj || '';
            setTenantHasDocument(doc.replace(/\D/g, '').length >= 11);
        } catch (err: unknown) {
            const errorObj = err as Error;
            console.error('Erro ao buscar plano:', errorObj.message);
            setError(errorObj.message);
        } finally {
            setLoading(false);
            fetchInvoices();
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
                                            {PLANS[currentPlan]?.name || currentPlan}
                                        </h3>
                                        <p className="text-sm text-slate-400 mt-1">
                                            R$ {PLANS[currentPlan]?.price || 0}/mês
                                        </p>
                                    </div>
                                    <span className="px-4 py-2 bg-green-500/10 text-green-500 text-sm rounded-full border border-green-500/20">
                                        Ativo
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <h2 className="text-xl md:text-2xl font-black text-slate-100 light:text-slate-900 uppercase">Escolha um Plano</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {Object.values(PLANS).filter(p => p.id !== 'trial').map((plan) => (
                                <Card
                                    key={plan.id}
                                    className={cn(
                                        'bg-slate-900 light:bg-white border-slate-800 light:border-slate-200 cursor-pointer transition-all hover:border-slate-700 light:hover:border-slate-300 rounded-2xl md:rounded-3xl p-2',
                                        currentPlan === plan.id && 'border-blue-500 light:border-blue-600 ring-2 ring-blue-500/20'
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
                                        <div className="space-y-2">
                                            <p className="text-sm text-slate-400 light:text-slate-500">
                                                <span className="font-bold text-slate-200 light:text-slate-700">Barbeiros:</span> {plan.barbers}
                                            </p>
                                            <p className="text-sm text-slate-400 light:text-slate-500">
                                                <span className="font-bold text-slate-200 light:text-slate-700">Agendamentos:</span> {plan.appointments}
                                            </p>
                                        </div>

                                        <div className="space-y-2 pt-4 border-t border-slate-800 light:border-slate-100">
                                            {plan.features.slice(0, 4).map((feature, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-blue-500" />
                                                    <span className="text-xs text-slate-400 light:text-slate-600">{feature}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <Button
                                            className={cn(
                                                'w-full py-6 rounded-xl font-black uppercase tracking-widest',
                                                currentPlan === plan.id
                                                    ? 'bg-slate-800 light:bg-slate-100 text-slate-500'
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
                                            )}
                                            disabled={currentPlan === plan.id}
                                            onClick={() => {
                                                setSelectedPlan(plan.id);
                                                setPaymentMethod('card');
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
                        <DialogTitle className="font-black text-xl md:text-2xl tracking-tighter uppercase">Confirmar Assinatura</DialogTitle>
                        <DialogDescription className="text-slate-400 light:text-slate-500 font-bold">
                            Plano <span className="text-blue-600 capitalize">{selectedPlan}</span> — R$ {(boletoData?.amount || (selectedPlan ? PLANS[selectedPlan]?.price : 0)).toFixed(2).replace('.', ',')}/mês
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
                                    R$ {(pixData.amount || Number(PLANS[selectedPlan || 'basic']?.price || 0)).toFixed(2).replace('.', ',')}
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
                                        <p className="text-sm font-black text-slate-100">R$ {(boletoData.amount || (selectedPlan ? PLANS[selectedPlan]?.price : 0)).toFixed(2).replace('.', ',')}</p>
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
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {invoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 text-xs text-slate-400">
                                                {new Date(inv.date).toLocaleDateString('pt-BR')}
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
                                            <td className="px-6 py-4">
                                                {inv.is_paid ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase">Pago</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">Pendente</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                {!inv.is_paid && (inv.metadata?.method === 'boleto_inter' || inv.metadata?.method === 'pix_inter') && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 text-[10px] font-black uppercase"
                                                        onClick={() => {
                                                            // Prioriza codigoSolicitacao (txid) que sempre está disponível
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
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled
                                                    className="h-8 text-slate-600 border border-slate-800 text-[10px] font-black uppercase opacity-50 cursor-not-allowed group relative"
                                                >
                                                    <Shield className="w-3 h-3 mr-1" /> NF
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
