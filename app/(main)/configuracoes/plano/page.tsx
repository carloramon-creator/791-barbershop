'use client';

// RAILWAY MIGRATION TRIGGER - GOL DA VITÓRIA ⚽
import React, { useState, useEffect } from 'react';
import { Users, Building2, CreditCard, Check, Shield, FileText, ExternalLink, Copy, Activity } from 'lucide-react';
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
    const [pixData, setPixData] = useState<{ pixPayload: string; amount: number; expiresAt: string } | null>(null);
    const [boletoData, setBoletoData] = useState<{ nossoNumero: string; codigoBarras: string; linhaDigitavel: string; pdfUrl: string } | null>(null);
    const [pendingData, setPendingData] = useState<{ message: string; pending: boolean; seu_numero?: string } | null>(null);
    const [tenantHasDocument, setTenantHasDocument] = useState<boolean>(true);
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
                        <h2 className="text-xl md:text-2xl font-black text-slate-100 light:text-slate-900 uppercase italic">Escolha um Plano</h2>
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
                <DialogContent className="border-slate-800 light:border-slate-200 bg-slate-900 light:bg-white text-slate-100 light:text-slate-900 max-w-md rounded-2xl md:rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl md:text-2xl italic tracking-tighter uppercase">Confirmar Assinatura</DialogTitle>
                        <DialogDescription className="text-slate-400 light:text-slate-500 font-bold">
                            Plano <span className="text-blue-600 capitalize">{selectedPlan}</span> — R$ {selectedPlan ? PLANS[selectedPlan]?.price : 0}/mês
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
                            <p className="text-center text-sm text-slate-300">
                                Escaneie o código abaixo para pagar via Pix. O acesso é liberado na hora!
                            </p>

                            <div className="bg-white p-3 rounded-xl border-4 border-emerald-500 shadow-xl">
                                <QRCodeCanvas
                                    value={pixData.pixPayload}
                                    size={200}
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
                                        <p className="text-sm font-black text-slate-100">R$ {selectedPlan ? PLANS[selectedPlan]?.price : '0'},00</p>
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

                            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                                <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest leading-relaxed font-medium">
                                    A compensação bancária ocorre em até 2 dias úteis.<br />
                                    Dica: Use o Pix para liberação instantânea.
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        {!pixData && !boletoData && !pendingData ? (
                            <>
                                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setOpenDialog(false)} disabled={saving}>Cancelar</Button>
                                <Button onClick={handleChangePlan} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                                    {saving ? 'Processando...' : 'Confirmar e Pagar'}
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => setOpenDialog(false)} className="w-full bg-slate-800 text-white hover:bg-slate-700">Fechar</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
