'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Api } from '@/lib/api';
import { supabaseClient } from '@/lib/supabase-client';
import {
    Ticket,
    Plus,
    Trash2,
    Clock,
    Users,
    Search,
    Loader2,
    Calendar,
    Tag,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // New coupon state
    const [code, setCode] = useState('');
    const [discountPercent, setDiscountPercent] = useState('');
    const [trialDays, setTrialDays] = useState('0');
    const [maxUses, setMaxUses] = useState('');
    const [expiresAt, setExpiresAt] = useState('');

    const loadCoupons = async () => {
        try {
            setLoading(true);
            const data = await Api.getSystemCoupons();
            setCoupons(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCoupons();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            await Api.createSystemCoupon({
                code: code.toUpperCase(),
                discount_percent: discountPercent ? parseFloat(discountPercent) : null,
                trial_days: parseInt(trialDays),
                max_uses: maxUses ? parseInt(maxUses) : null,
                expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
            });

            setSuccess('Cupom criado com sucesso! Sincronizado com Stripe.');

            // Limpa após 3 segundos
            setTimeout(() => {
                setIsAdding(false);
                setSuccess(null);
                setCode('');
                setDiscountPercent('');
                setTrialDays('0');
                setMaxUses('');
                setExpiresAt('');
            }, 2000);

            loadCoupons();
        } catch (e: any) {
            setError(e.message || 'Erro ao criar cupom');
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (id: string, current: boolean) => {
        try {
            await Api.updateSystemCoupon({ id, is_active: !current });
            loadCoupons();
        } catch (e: any) {
            alert('Erro ao atualizar status: ' + e.message);
        }
    };

    const deleteCoupon = async (id: string) => {
        if (!confirm('Excluir este cupom permanentemente? Todas as barbearias perderão este benefício no Stripe.')) return;
        try {
            setLoading(true);
            await Api.deleteSystemCoupon(id);
            setSuccess('Cupom removido com sucesso!');
            setTimeout(() => setSuccess(null), 3000);
            loadCoupons();
        } catch (e: any) {
            setError('Erro ao excluir: ' + e.message);
            setTimeout(() => setError(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-100 tracking-tighter uppercase">Cupons Promocionais</h1>
                    <p className="text-slate-500 font-medium">Crie ofertas especiais para novas barbearias.</p>
                </div>
                <Button
                    onClick={() => setIsAdding(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-900/40"
                >
                    <Plus className="w-4 h-4 mr-2" /> Novo Cupom
                </Button>
            </div>

            {isAdding && (
                <Card className="bg-slate-900 border-blue-500/30 shadow-2xl border-2 animate-in fade-in slide-in-from-top-4">
                    <CardHeader>
                        <CardTitle className="text-slate-100">Configurar Novo Cupom</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-6">
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold">Código (Ex: BROW20)</Label>
                                <Input value={code} onChange={e => setCode(e.target.value)} placeholder="PROMOCAO791" className="bg-slate-950 border-slate-800 h-11" required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold">Desconto (%)</Label>
                                <Input type="number" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} placeholder="Ex: 20" className="bg-slate-950 border-slate-800 h-11" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold">Dias de Teste (Trial)</Label>
                                <Input type="number" value={trialDays} onChange={e => setTrialDays(e.target.value)} className="bg-slate-950 border-slate-800 h-11" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold">Limite de Usos</Label>
                                <Input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Vazio = Ilimitado" className="bg-slate-950 border-slate-800 h-11" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold">Data de Expiração</Label>
                                <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="bg-slate-950 border-slate-800 h-11" />
                            </div>
                            {error && (
                                <div className="md:col-span-5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 animate-pulse">
                                    <AlertCircle size={20} />
                                    <p className="text-sm font-black uppercase">{error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="md:col-span-5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-500">
                                    <CheckCircle2 size={20} />
                                    <p className="text-sm font-black uppercase">{success}</p>
                                </div>
                            )}

                            <div className="md:col-span-5 flex justify-end gap-3 mt-4">
                                <Button type="button" variant="outline" onClick={() => { setIsAdding(false); setError(null); }} className="border-slate-800 text-slate-400" disabled={saving}>Cancelar</Button>
                                <Button type="submit" className="bg-blue-600 text-white min-w-[150px]" disabled={saving}>
                                    {saving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Salvar Cupom'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin inline mr-2 h-8 w-8 text-blue-500" /></div>
                ) : coupons.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-slate-500 bg-slate-900 rounded-3xl border border-dashed border-slate-800">
                        Nenhum cupom criado ainda.
                    </div>
                ) : coupons.map((coupon) => (
                    <Card key={coupon.id} className={cn(
                        "bg-slate-900 border-slate-800 shadow-xl overflow-hidden relative",
                        !coupon.is_active && "opacity-60"
                    )}>
                        {!coupon.is_active && (
                            <div className="absolute top-4 right-4 bg-red-500/20 text-red-500 text-[10px] font-black uppercase px-2 py-1 rounded-full border border-red-500/30">
                                Inativo
                            </div>
                        )}
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-500">
                                    <Tag size={20} />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-black text-slate-100">{coupon.code}</CardTitle>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">
                                        Criado em {new Date(coupon.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/50">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Desconto</p>
                                    <p className="text-lg font-black text-emerald-500">{coupon.discount_percent ? `${coupon.discount_percent}%` : 'Nenhum'}</p>
                                </div>
                                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/50">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Trial Extra</p>
                                    <p className="text-lg font-black text-blue-500">{coupon.trial_days} dias</p>
                                </div>
                                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/50 col-span-2">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Usos</p>
                                            <p className="text-lg font-black text-slate-100">{coupon.current_uses} / {coupon.max_uses || '∞'}</p>
                                        </div>
                                        <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500"
                                                style={{ width: coupon.max_uses ? `${(coupon.current_uses / coupon.max_uses) * 100}%` : '5%' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                {coupon.expires_at && (
                                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/50 col-span-2">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Expira em</p>
                                        <p className="text-sm font-black text-amber-500">
                                            {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleStatus(coupon.id, coupon.is_active)}
                                    className="flex-1 border-slate-800 text-xs font-bold"
                                >
                                    {coupon.is_active ? 'Desativar' : 'Ativar'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteCoupon(coupon.id)}
                                    className="bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
