'use client';

import { useEffect, useState } from 'react';
import { Api } from '@/lib/api';
import {
    Package,
    Plus,
    Edit2,
    Save,
    X,
    CheckCircle2,
    AlertCircle,
    Info,
    TrendingUp,
    Zap,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlansPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [addons, setAddons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isAddingAddon, setIsAddingAddon] = useState(false);
    const [newAddon, setNewAddon] = useState({ name: '', slug: '', price: '', description: '' });

    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [editingAddon, setEditingAddon] = useState<any>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [plansData, addonsData] = await Promise.all([
                Api.getSystemPlans(),
                Api.getSystemAddons()
            ]);
            setPlans(plansData);
            setAddons(addonsData);
        } catch (e: any) {
            console.error('Error loading plans/addons:', e);
            setStatusMsg({ type: 'error', text: 'Falha ao carregar dados: ' + e.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleUpdatePlan = async (planToUpdate = editingPlan) => {
        try {
            setSaving(true);
            await Api.updateSystemPlan(planToUpdate);
            setEditingPlan(null);
            setStatusMsg({ type: 'success', text: 'Plano atualizado!' });
            setTimeout(() => setStatusMsg(null), 3000);
            loadData();
        } catch (e: any) {
            setStatusMsg({ type: 'error', text: e.message });
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateAddon = async (addonToUpdate = editingAddon) => {
        try {
            setSaving(true);
            await Api.updateSystemAddon(addonToUpdate);
            setEditingAddon(null);
            setStatusMsg({ type: 'success', text: 'Add-on atualizado!' });
            setTimeout(() => setStatusMsg(null), 3000);
            loadData();
        } catch (e: any) {
            setStatusMsg({ type: 'error', text: e.message });
        } finally {
            setSaving(false);
        }
    };

    const handleCreateAddon = async () => {
        if (!newAddon.name || !newAddon.slug || !newAddon.price) {
            setStatusMsg({ type: 'error', text: 'Preencha todos os campos obrigatórios' });
            return;
        }
        try {
            setSaving(true);
            await Api.createSystemAddon({
                ...newAddon,
                price: parseFloat(newAddon.price)
            });
            setIsAddingAddon(false);
            setNewAddon({ name: '', slug: '', price: '', description: '' });
            setStatusMsg({ type: 'success', text: 'Módulo criado com sucesso!' });
            setTimeout(() => setStatusMsg(null), 3000);
            loadData();
        } catch (e: any) {
            setStatusMsg({ type: 'error', text: e.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-8 p-8">
                <Skeleton className="h-10 w-64 bg-slate-900" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-48 bg-slate-900" />
                    <Skeleton className="h-48 bg-slate-900" />
                    <Skeleton className="h-48 bg-slate-900" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-20 max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-100 tracking-tighter uppercase flex items-center gap-3">
                    <Package className="text-blue-500" size={32} />
                    Gestão de Planos & Extras
                </h1>
                <p className="text-slate-500 font-medium mt-2">Controle os preços, descrições e recursos disponíveis na plataforma.</p>
            </div>

            {statusMsg && (
                <div className={cn(
                    "p-4 rounded-xl border flex items-center gap-3 animate-in fade-in sticky top-4 z-50",
                    statusMsg.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                )}>
                    {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <p className="text-xs font-bold uppercase tracking-widest">{statusMsg.text}</p>
                </div>
            )}

            {/* Plans Section */}
            <section className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-400" /> Planos de Assinatura
                    </h2>
                    <Button variant="outline" className="bg-slate-900 border-slate-800 text-[10px] uppercase font-black tracking-widest h-8" disabled>
                        <Plus size={14} className="mr-1" /> Novo Plano
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <Card key={plan.id} className={cn(
                            "bg-slate-900 border-slate-800 shadow-xl overflow-hidden transition-all hover:border-slate-700",
                            editingPlan?.id === plan.id && "ring-2 ring-blue-500"
                        )}>
                            <CardHeader className="bg-slate-800/30 border-b border-slate-800/50 p-6">
                                <div className="flex justify-between items-center">
                                    <div className="px-3 py-1 bg-blue-600/10 text-blue-400 text-[9px] font-black uppercase tracking-tighter rounded-full border border-blue-600/20">
                                        {plan.slug}
                                    </div>
                                    <button
                                        onClick={() => setEditingPlan(editingPlan?.id === plan.id ? null : { ...plan })}
                                        className="text-slate-500 hover:text-blue-400 transition-colors"
                                    >
                                        {editingPlan?.id === plan.id ? <X size={18} /> : <Edit2 size={18} />}
                                    </button>
                                </div>
                                <CardTitle className="text-xl font-black text-slate-100 mt-4 tracking-tight">{plan.name}</CardTitle>
                                <CardDescription className="text-blue-400 font-black text-2xl uppercase tracking-tighter">
                                    R$ {Number(plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    <span className="text-[10px] text-slate-600 ml-1">/mês</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                {editingPlan?.id === plan.id ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] text-slate-500 uppercase font-bold">Valor Mensal</Label>
                                                <Input
                                                    type="number"
                                                    value={editingPlan.price}
                                                    onChange={(e) => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })}
                                                    className="bg-slate-950 border-slate-800 text-blue-400 font-mono h-11"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] text-slate-500 uppercase font-bold">Limite de Staff (0=Ilimitado)</Label>
                                                <Input
                                                    type="number"
                                                    value={editingPlan.staff_limit || 0}
                                                    onChange={(e) => setEditingPlan({ ...editingPlan, staff_limit: parseInt(e.target.value) || 0 })}
                                                    className="bg-slate-950 border-slate-800 text-emerald-400 font-mono h-11"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-slate-500 uppercase font-bold">Resumo / Descrição</Label>
                                            <Input
                                                value={editingPlan.description}
                                                onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                                                className="bg-slate-950 border-slate-800 text-slate-300 h-11"
                                            />
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-slate-800">
                                            <Label className="text-[10px] text-slate-500 uppercase font-bold">Permissões de Menu (Sidebar)</Label>
                                            <div className="grid grid-cols-2 gap-2 p-4 bg-slate-950 rounded-xl border border-slate-800">
                                                {[
                                                    { key: 'dashboard', label: 'Dashboard' },
                                                    { key: 'queue', label: 'Fila' },
                                                    { key: 'appointments', label: 'Agendamentos' },
                                                    { key: 'clients', label: 'Clientes' },
                                                    { key: 'professionals', label: 'Profissionais' },
                                                    { key: 'services', label: 'Serviços' },
                                                    { key: 'products', label: 'Produtos' },
                                                    { key: 'inventory', label: 'Estoque' },
                                                    { key: 'finance', label: 'Financeiro' },
                                                    { key: 'settings', label: 'Configurações' },
                                                ].map((item) => (
                                                    <label key={item.key} className="flex items-center gap-2 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            checked={(editingPlan.menu_permissions || []).includes(item.key)}
                                                            onChange={(e) => {
                                                                const current = editingPlan.menu_permissions || [];
                                                                const next = e.target.checked
                                                                    ? [...current, item.key]
                                                                    : current.filter((k: string) => k !== item.key);
                                                                setEditingPlan({ ...editingPlan, menu_permissions: next });
                                                            }}
                                                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-950"
                                                        />
                                                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 uppercase tracking-tighter">
                                                            {item.label}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-4 pt-4 border-t border-slate-800">
                                            <Label className="text-[10px] text-slate-500 uppercase font-bold">Funcionalidades (Até 5)</Label>
                                            {[0, 1, 2, 3, 4].map((idx) => (
                                                <Input
                                                    key={idx}
                                                    placeholder={`Funcionalidade ${idx + 1}...`}
                                                    value={editingPlan.features?.[idx] || ''}
                                                    onChange={(e) => {
                                                        const newFeatures = [...(editingPlan.features || [])];
                                                        newFeatures[idx] = e.target.value;
                                                        setEditingPlan({ ...editingPlan, features: newFeatures });
                                                    }}
                                                    className="bg-slate-950 border-slate-800 text-slate-300 h-10 text-xs"
                                                />
                                            ))}
                                        </div>
                                        <Button
                                            onClick={() => {
                                                const cleanedFeatures = (editingPlan.features || []).filter((f: string) => f && f.trim() !== '');
                                                handleUpdatePlan({ ...editingPlan, features: cleanedFeatures });
                                            }}
                                            disabled={saving}
                                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs h-11"
                                        >
                                            {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save size={16} className="mr-2" />}
                                            Salvar Alterações
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed">{plan.description}</p>
                                        <div className="space-y-2 pt-4 border-t border-slate-800/50">
                                            {plan.features?.map((f: string, i: number) => (
                                                <div key={i} className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                                    <CheckCircle2 size={12} className="text-emerald-500" /> {f}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Addons Section */}
            <section className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <Zap size={20} className="text-amber-400" /> Módulos & Add-ons Opcionais
                    </h2>
                    <Button
                        variant="outline"
                        className={cn(
                            "text-[10px] uppercase font-black tracking-widest h-8",
                            isAddingAddon ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-slate-900 border-slate-800"
                        )}
                        onClick={() => setIsAddingAddon(!isAddingAddon)}
                    >
                        {isAddingAddon ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
                        {isAddingAddon ? 'Cancelar' : 'Novo Add-on'}
                    </Button>
                </div>

                {isAddingAddon && (
                    <Card className="bg-slate-950 border-amber-500/30 border-2 animate-in slide-in-from-top-4">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm uppercase tracking-widest font-black text-amber-500">Configurar Novo Add-on</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500">Nome</Label>
                                    <Input value={newAddon.name} onChange={e => setNewAddon({ ...newAddon, name: e.target.value })} className="bg-slate-900 h-10 text-white" placeholder="Ex: Módulo TV" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500">Slug</Label>
                                    <Input value={newAddon.slug} onChange={e => setNewAddon({ ...newAddon, slug: e.target.value.toLowerCase() })} className="bg-slate-900 h-10 text-white" placeholder="ex: modulo_tv" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500">Preço Mensal</Label>
                                    <Input type="number" value={newAddon.price} onChange={e => setNewAddon({ ...newAddon, price: e.target.value })} className="bg-slate-900 h-10 text-white" placeholder="20.00" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500">Descrição</Label>
                                    <Input value={newAddon.description} onChange={e => setNewAddon({ ...newAddon, description: e.target.value })} className="bg-slate-900 h-10 text-white" placeholder="Recurso extra..." />
                                </div>
                            </div>
                            <Button onClick={handleCreateAddon} disabled={saving} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-widest text-xs h-10 w-full">
                                {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Plus size={16} className="mr-2" />} Criar e Ativar Módulo
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {addons.map((addon) => (
                        <Card key={addon.id} className={cn(
                            "bg-slate-900 border-slate-800 shadow-xl overflow-hidden transition-all hover:border-slate-700",
                            editingAddon?.id === addon.id && "ring-2 ring-amber-500/50"
                        )}>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-black text-slate-100 tracking-tight">{addon.name}</h3>
                                            <div className="px-2 py-0.5 bg-slate-800 text-slate-500 text-[8px] font-black uppercase tracking-tighter rounded border border-slate-700">
                                                {addon.slug}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium">{addon.description}</p>
                                    </div>
                                    <button
                                        onClick={() => setEditingAddon(editingAddon?.id === addon.id ? null : { ...addon })}
                                        className="text-slate-600 hover:text-amber-400 transition-colors"
                                    >
                                        {editingAddon?.id === addon.id ? <X size={16} /> : <Edit2 size={16} />}
                                    </button>
                                </div>

                                {editingAddon?.id === addon.id ? (
                                    <div className="space-y-4 mt-6 animate-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-slate-500 uppercase font-bold">Valor Adicional</Label>
                                            <Input
                                                type="number"
                                                value={editingAddon.price}
                                                onChange={(e) => setEditingAddon({ ...editingAddon, price: Number(e.target.value) })}
                                                className="bg-slate-950 border-slate-800 text-amber-400 font-mono h-11"
                                            />
                                        </div>
                                        <Button
                                            onClick={() => handleUpdateAddon()}
                                            disabled={saving}
                                            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-widest text-xs h-11"
                                        >
                                            {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save size={16} className="mr-2" />}
                                            Salvar Add-on
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="mt-6 flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                                        <p className="text-sm font-black text-amber-400">R$ {Number(addon.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<span className="text-[9px] text-slate-600 font-bold uppercase ml-1">/mês</span></p>
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <Info size={12} />
                                            <span className="text-[9px] font-black uppercase tracking-tighter">Configurável</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
}
