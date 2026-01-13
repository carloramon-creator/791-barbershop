'use client';

import React, { useState, useEffect } from 'react';
import {
    Users, Building2, CreditCard, Check, Shield, FileText, Activity, Zap, FileCheck, CheckCircle2, Tag, Download, AlertCircle, Search, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Api } from '@/lib/api';
import { Label } from '@/components/ui/label';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { QRCodeCanvas } from 'qrcode.react';
import { supabaseClient } from '@/lib/supabase-client';

const API_URL = '';

export default function PlanPage() {
    const searchParams = useSearchParams();
    const isExpired = searchParams.get('expired') === 'true';

    const [dynamicPlans, setDynamicPlans] = useState<any[]>([]);
    const [dynamicAddons, setDynamicAddons] = useState<any[]>([]);
    const [currentPlan, setCurrentPlan] = useState<string>('trial');
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [selectedAddon, setSelectedAddon] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix' | 'boleto-inter'>('card');
    const [couponCode, setCouponCode] = useState('');
    const [pixData, setPixData] = useState<any>(null);
    const [boletoData, setBoletoData] = useState<any>(null);
    const [pendingData, setPendingData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [stripeSubscriptionId, setStripeSubscriptionId] = useState<string | null>(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
    const [activeAddons, setActiveAddons] = useState<string[]>([]);
    const [canceling, setCanceling] = useState(false);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const [plans, addons] = await Promise.all([
                    Api.getSystemPlans(),
                    Api.getSystemAddons()
                ]);
                setDynamicPlans(plans || []);
                setDynamicAddons(addons || []);
                await fetchInvoices();
                await fetchCurrentPlan(false);
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
            if (!session) return;
            const res = await fetch(`${API_URL}/api/barbershop/plan`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setCurrentPlan(data.currentPlan || 'trial');
                setStripeSubscriptionId(data.stripeSubscriptionId);
                setSubscriptionStatus(data.subscriptionStatus);
                setActiveAddons(data.activeAddons || []);
            }
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
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (data.invoices) setInvoices(data.invoices);
        } finally {
            setLoadingInvoices(false);
        }
    }

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (pendingData?.pending) {
            interval = setInterval(async () => {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (!session) return;
                const pollRes = await fetch(`/api/barbershop/check-pending-payment?seu_numero=${pendingData.seu_numero}`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                if (pollRes.ok) {
                    const data = await pollRes.json();
                    if (data.ready) {
                        if (data.type === 'pix') setPixData(data.payload);
                        else setBoletoData(data.payload);
                        setPendingData(null);
                        fetchInvoices();
                    }
                }
            }, 4000);
        }
        return () => clearInterval(interval);
    }, [pendingData]);

    async function handleChangePlan() {
        if (!selectedPlan && !selectedAddon) return;
        try {
            setSaving(true);
            setError(null);
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) throw new Error('Sessão expirada');

            if (paymentMethod === 'card') {
                if (stripeSubscriptionId && selectedAddon) {
                    const res = await fetch('/api/barbershop/addons/activate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                        body: JSON.stringify({ addonSlug: selectedAddon.slug }),
                    });
                    if (!res.ok) throw new Error((await res.json()).error);
                    alert('Add-on ativado! Atualizando permissões...');
                    window.location.reload();
                    return;
                }
                const res = await fetch(`${API_URL}/api/checkout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify({ plan: selectedPlan, addon: selectedAddon?.slug, coupon: couponCode }),
                });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
                else throw new Error(data.error);
            } else if (paymentMethod === 'pix') {
                const tempId = Date.now().toString().slice(-15);
                setPendingData({ message: 'Iniciando Pix...', pending: true, seu_numero: tempId });
                const res = await fetch('/api/checkout/inter-pix', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify({ plan: selectedPlan, addon: selectedAddon?.slug, coupon: couponCode, tempId }),
                });
                const data = await res.json();
                if (!res.ok) { setPendingData(null); throw new Error(data.error); }
                if (data.pending) setPendingData({ ...data, seu_numero: data.seu_numero || tempId });
                else { setPixData(data); setPendingData(null); fetchInvoices(); }
            } else if (paymentMethod === 'boleto-inter') {
                const tempId = Date.now().toString().slice(-15);
                setPendingData({ message: 'Iniciando Boleto...', pending: true, seu_numero: tempId });
                const res = await fetch('/api/checkout/inter-boleto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify({ plan: selectedPlan, addon: selectedAddon?.slug, coupon: couponCode, tempId }),
                });
                const data = await res.json();
                if (!res.ok) { setPendingData(null); throw new Error(data.error); }
                if (data.pending) setPendingData({ ...data, seu_numero: data.seu_numero || tempId });
                else { setBoletoData(data); setPendingData(null); fetchInvoices(); }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleCancelSubscription() {
        if (!confirm('Cancelar assinatura?')) return;
        try {
            setCanceling(true);
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) return;
            const res = await fetch('/api/checkout/cancel-subscription', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) { alert('Cancelamento solicitado.'); fetchCurrentPlan(); }
        } finally { setCanceling(false); }
    }

    return (
        <div className="space-y-8 max-w-none px-2 pb-20">
            {isExpired && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <p className="font-bold uppercase text-[10px] tracking-widest">Atenção: Período Expirado</p>
                        <p className="text-xs font-medium text-red-500/80">Escolha um plano abaixo para continuar.</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Sincronizando...</p>
                </div>
            ) : (
                <>
                    <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
                        <div className="flex-1 lg:flex-[2] w-full">
                            <Card className="bg-slate-900 border-slate-800 shadow-2xl">
                                <CardHeader className="py-4 px-6 border-b border-slate-800/50">
                                    <CardTitle className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <CreditCard size={14} className="text-blue-500" /> Assinatura Ativa
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <div className="flex flex-col sm:flex-row items-center gap-8">
                                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl flex items-center justify-center font-black text-white text-4xl shadow-xl">
                                            {currentPlan.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 text-center sm:text-left">
                                            <h3 className="text-3xl font-black text-slate-100 uppercase tracking-tighter">
                                                Plano {dynamicPlans.find(p => p.slug === currentPlan)?.name || currentPlan}
                                            </h3>
                                            <p className="text-2xl font-black text-blue-500">
                                                R$ {(dynamicPlans.find(p => p.slug === currentPlan)?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                <span className="text-[10px] text-slate-500 ml-1 uppercase">/mês</span>
                                            </p>
                                        </div>
                                        {stripeSubscriptionId && subscriptionStatus !== 'canceled' && (
                                            <Button variant="ghost" size="sm" onClick={handleCancelSubscription} disabled={canceling} className="text-red-500/50 hover:text-red-500 text-[10px] uppercase font-black">
                                                Cancelar Plano
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="flex-1 lg:flex-[1] w-full space-y-4">
                            <h2 className="text-lg font-black text-slate-100 uppercase tracking-tight flex items-center gap-2 px-1">
                                <Zap className="text-amber-400 fill-amber-400" size={18} /> Turbinar Pacote
                            </h2>
                            <div className="grid grid-cols-1 gap-3">
                                {dynamicAddons.filter(addon => {
                                    const currentPlanData = dynamicPlans.find(p => p.slug === currentPlan);
                                    const featuresStr = JSON.stringify(currentPlanData?.features || []).toLowerCase();
                                    return !featuresStr.includes(addon.slug.toLowerCase());
                                }).map((addon) => (
                                    <div key={addon.id} className={cn("p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between", activeAddons.includes(addon.slug) && "border-emerald-500/30 bg-emerald-500/5")}>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-[11px] font-black text-slate-100 uppercase">{addon.name}</h3>
                                            <p className="text-[9px] text-slate-500 font-bold truncate">{addon.description}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[11px] font-black text-amber-500">R${Number(addon.price).toFixed(0)}</span>
                                            {!activeAddons.includes(addon.slug) && (
                                                <Button size="sm" onClick={() => { setSelectedAddon(addon); setSelectedPlan(null); setPaymentMethod('card'); setOpenDialog(true); }} className="h-7 text-[9px] font-black uppercase bg-blue-600">Ativar</Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-10 space-y-6">
                        <h2 className="text-xl font-black text-slate-100 uppercase tracking-tighter italic px-1">Opções de Upgrade</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {dynamicPlans.filter(p => !['trial', currentPlan].includes(p.slug)).map((plan) => (
                                <Card key={plan.id} className="bg-slate-900 border-slate-800 hover:border-blue-500/50 transition-all rounded-3xl overflow-hidden group">
                                    <div className="p-6 space-y-6">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-100 tracking-tight leading-none mb-2">{plan.name}</h3>
                                            <p className="text-3xl font-black text-white">R$ {plan.price}<span className="text-[10px] text-slate-500 ml-1 uppercase">/mês</span></p>
                                        </div>
                                        <div className="space-y-2 py-4 border-y border-slate-800/50">
                                            {plan.features?.slice(0, 5).map((f: string, i: number) => (
                                                <div key={i} className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-500" /><span className="text-[10px] font-bold text-slate-400 uppercase">{f}</span></div>
                                            ))}
                                        </div>
                                        <Button onClick={() => { setSelectedPlan(plan.slug); setSelectedAddon(null); setPaymentMethod('card'); setOpenDialog(true); }} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] h-12 shadow-xl shadow-blue-900/10">Migrar para {plan.name}</Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    <div className="mt-12 space-y-4">
                        <h2 className="text-lg font-black text-slate-100 uppercase px-1 flex items-center gap-2"><FileText className="text-blue-500" size={18} /> Histórico</h2>
                        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-2xl overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-950/40">
                                    <TableRow className="border-slate-800">
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-6">Data</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Descrição</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Valor</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.map((inv) => (
                                        <TableRow key={inv.id} className="border-slate-800/50 hover:bg-slate-800/30 h-14">
                                            <TableCell className="px-6 text-[11px] font-black text-slate-100">{inv.date ? new Date(inv.date).toLocaleDateString() : '---'}</TableCell>
                                            <TableCell className="text-xs font-black text-slate-300 uppercase">{inv.description || inv.title}</TableCell>
                                            <TableCell className="text-xs font-black text-slate-300">R$ {inv.value.toFixed(2).replace('.', ',')}</TableCell>
                                            <TableCell>
                                                <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border", inv.is_paid ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20")}>
                                                    {inv.is_paid ? 'Pago' : 'Pendente'}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </>
            )}

            <Dialog open={openDialog} onOpenChange={(v) => { setOpenDialog(v); if (!v) { setPixData(null); setBoletoData(null); setPendingData(null); setError(null); } }}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-sm rounded-3xl p-8 ring-1 ring-white/10">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Pagar</DialogTitle>
                        <DialogDescription className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                            {selectedAddon ? `Extra: ${selectedAddon.name}` : `Plano: ${selectedPlan}`}
                        </DialogDescription>
                    </DialogHeader>

                    {!pixData && !boletoData && !pendingData ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'card', label: 'Cartão', icon: CreditCard },
                                    { id: 'pix', label: 'Pix', icon: Zap },
                                    { id: 'boleto-inter', label: 'Boleto', icon: FileText }
                                ].map((m) => (
                                    <button key={m.id} onClick={() => setPaymentMethod(m.id as any)} className={cn("flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all", paymentMethod === m.id ? "border-blue-500 bg-blue-500/10 text-white" : "border-slate-800 text-slate-500 hover:border-slate-700")}>
                                        <m.icon size={16} />
                                        <span className="text-[9px] font-black uppercase">{m.label}</span>
                                    </button>
                                ))}
                            </div>
                            <Button onClick={handleChangePlan} disabled={saving} className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-900/40">
                                {saving ? 'Processando...' : 'Pagar Agora ⚡'}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center space-y-6">
                            {pixData ? (
                                <>
                                    <div className="bg-white p-3 rounded-2xl border-4 border-white"><QRCodeCanvas value={pixData.pixPayload} size={180} /></div>
                                    <Button variant="outline" className="w-full h-11 border-slate-800 text-[10px] font-black uppercase" onClick={() => { navigator.clipboard.writeText(pixData.pixPayload); alert('Pix Copiado!'); }}>Copiar Pix</Button>
                                    <p className="text-[9px] text-emerald-500 font-black animate-pulse">Aguardando Confirmação...</p>
                                </>
                            ) : boletoData ? (
                                <>
                                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center"><FileText className="text-blue-500" size={32} /></div>
                                    <Button className="w-full h-11 bg-blue-600 font-black text-[10px] uppercase" onClick={() => window.open(`/api/checkout/inter-boleto/pdf?nossoNumero=${boletoData.nossoNumero}`, '_blank')}>Abrir Boleto (PDF)</Button>
                                </>
                            ) : <div className="py-10 text-center"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div><p className="text-slate-400 text-[10px] font-black uppercase">{pendingData?.message}</p></div>}
                            <Button variant="ghost" className="text-slate-500 text-[10px] font-black uppercase" onClick={() => { setOpenDialog(false); window.location.reload(); }}>Fechar e Atualizar</Button>
                        </div>
                    )}
                    {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-500 font-bold uppercase">{error}</div>}
                </DialogContent>
            </Dialog>
        </div>
    );
}
