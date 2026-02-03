'use client';

import { useEffect, useState } from 'react';
import { Api } from '@/lib/api';
import {
    Store,
    Search,
    ChevronRight,
    Filter,
    User,
    Mail,
    Phone,
    CreditCard,
    CheckCircle2,
    XCircle,
    Activity,
    ExternalLink,
    TrendingUp,
    Pencil,
    Trash2,
    Calendar,
    AlertTriangle,
    Scissors,
    Sparkles,
    ArrowUp,
    ArrowDown,
    Clock,
    UserCheck,
    Smartphone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ClientPageProps {
    initialTenants: any[];
    initialError: string | null;
}

export default function TenantsPage({ initialTenants, initialError }: ClientPageProps) {
    const [tenants, setTenants] = useState<any[]>(initialTenants || []);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [whatsappFilter, setWhatsappFilter] = useState<'all' | 'with' | 'without'>('all');

    // Edit State
    const [editingTenant, setEditingTenant] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        plan: '',
        subscription_status: '',
        subscription_current_period_end: ''
    });

    const [error, setError] = useState<string | null>(initialError);

    const loadTenants = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await Api.getSystemTenants();
            setTenants(data || []);
        } catch (e: any) {
            console.error('[CLIENT ERROR]', e);
            setError(e.message || 'Falha ao carregar barbearias.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTenants();
    }, []);

    const handleEditClick = (tenant: any) => {
        setEditingTenant(tenant);
        setEditForm({
            plan: tenant.plan || 'basic',
            subscription_status: tenant.subscription_status || 'trialing',
            subscription_current_period_end: tenant.subscription_current_period_end ? new Date(tenant.subscription_current_period_end).toISOString().split('T')[0] : ''
        });
    };

    const handleSaveTenant = async () => {
        if (!editingTenant) return;
        setSaving(true);
        try {
            await Api.updateSystemTenant(editingTenant.id, editForm);
            setTenants(prev => prev.map(t => t.id === editingTenant.id ? { ...t, ...editForm } : t));
            setEditingTenant(null);
            alert('Barbearia atualizada com sucesso!');
        } catch (e: any) {
            alert('Erro ao atualizar: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const sortedTenants = [...tenants].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    const filteredTenants = sortedTenants.filter(t => {
        const matchesSearch = t.name?.toLowerCase().includes(search.toLowerCase()) ||
            t.owner?.[0]?.name?.toLowerCase().includes(search.toLowerCase()) ||
            t.city?.toLowerCase().includes(search.toLowerCase());

        const matchesWhatsapp = whatsappFilter === 'all'
            ? true
            : whatsappFilter === 'with'
                ? t.has_whatsapp
                : !t.has_whatsapp;

        return matchesSearch && matchesWhatsapp;
    });

    const totals = tenants.reduce((acc, t) => ({
        attendances: acc.attendances + (t.stats?.total_attendances || 0),
        users: acc.users + (t.stats?.total_users || 0),
        revenue: acc.revenue + (t.stats?.total_revenue || 0)
    }), { attendances: 0, users: 0, revenue: 0 });

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-700">
            {/* Header and Summary */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-2">Gestão de Licenciados</h1>
                    <p className="text-slate-500 text-xs font-medium max-w-lg">Administre barbearias e acompanhe a saúde dos contratos.</p>
                </div>

                {/* Summary Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full xl:w-auto">
                    {[
                        { label: 'Atendimentos', value: totals.attendances, color: 'text-slate-100', bg: 'bg-slate-900/50' },
                        { label: 'Sales Total', value: formatCurrency(totals.revenue), color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                        { label: 'Usuários', value: totals.users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                        { label: 'Barbearias', value: tenants.length, color: 'text-blue-500', bg: 'bg-blue-600/10' },
                    ].map((m, idx) => (
                        <div key={idx} className={cn("px-4 py-3 rounded-xl border border-white/5 backdrop-blur-md", m.bg)}>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{m.label}</p>
                            <p className={cn("text-base font-black tracking-tight", m.color)}>{m.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <Input
                        placeholder="Buscar por nome, proprietário ou cidade..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-slate-900/80 border-slate-800/50 pl-11 h-11 rounded-xl text-slate-100 focus:ring-blue-600 text-xs shadow-2xl transition-all"
                    />
                </div>

                <div className="flex gap-2">
                    <Select value={whatsappFilter} onValueChange={(v: any) => setWhatsappFilter(v)}>
                        <SelectTrigger className="w-[140px] h-11 bg-slate-900 border-slate-800 text-[10px] uppercase font-bold text-slate-400 rounded-xl">
                            <SelectValue placeholder="Filtro WhatsApp" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-slate-800">
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="with">Com WhatsApp</SelectItem>
                            <SelectItem value="without">Sem WhatsApp</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={() => setSortOrder('desc')}
                        variant={sortOrder === 'desc' ? 'default' : 'outline'}
                        className={cn("h-11 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", sortOrder === 'desc' ? "bg-blue-600" : "border-slate-800 bg-slate-900 text-slate-400")}
                    >
                        <ArrowDown className="w-3 h-3 mr-1.5" /> Últimos
                    </Button>
                    <Button
                        onClick={() => setSortOrder('asc')}
                        variant={sortOrder === 'asc' ? 'default' : 'outline'}
                        className={cn("h-11 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", sortOrder === 'asc' ? "bg-blue-600" : "border-slate-800 bg-slate-900 text-slate-400")}
                    >
                        <ArrowUp className="w-3 h-3 mr-1.5" /> Primeiros
                    </Button>
                </div>
            </div>

            {/* List Section */}
            <div className="grid grid-cols-1 gap-4">
                {error && (
                    <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-8 rounded-2xl text-center shadow-2xl backdrop-blur-md">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500 opacity-60" />
                        <h2 className="text-xl font-black uppercase tracking-tighter mb-1">Erro de Conexão</h2>
                        <p className="text-xs font-medium opacity-70 mb-6">{error}</p>
                        <Button onClick={loadTenants} variant="outline" className="border-red-500/30 text-[9px] uppercase tracking-widest">Tentar Novamente</Button>
                    </div>
                )}

                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-3">
                        <Activity className="animate-spin text-blue-600 w-8 h-8" />
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Carregando...</p>
                    </div>
                ) : filteredTenants.map((tenant) => {
                    // CÁLCULO REAL DE ONLINE (Baseado em atividade nos últimos 5 minutos)
                    const now = new Date().getTime();
                    const FIVE_MINS = 5 * 60 * 1000;
                    const onlineCount = (tenant.users || []).filter((u: any) => {
                        if (!u.last_seen_at) return false;
                        return (now - new Date(u.last_seen_at).getTime()) < FIVE_MINS;
                    }).length;

                    const totalUsers = (tenant.users || []).length;

                    return (
                        <Card key={tenant.id} className="bg-slate-900/40 border-slate-800/50 hover:border-blue-500/40 transition-all group shadow-xl relative overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                    {/* Branding + Info */}
                                    <div className="flex items-center gap-4 min-w-[240px]">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-xl bg-slate-950 p-1 flex items-center justify-center border border-white/5 shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                                                {tenant.logo_url ? <img src={tenant.logo_url} className="w-full h-full object-cover rounded-lg" /> : <Store className="text-slate-800" size={18} />}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg">
                                                {tenant.business_type === 'beauty_salon' ? <Sparkles size={8} className="text-pink-500" /> : <Scissors size={8} className="text-amber-500" />}
                                            </div>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="text-sm font-black text-white group-hover:text-blue-400 transition-colors truncate tracking-tight uppercase">
                                                    {tenant.name}
                                                </h3>
                                                {/* WhatsApp Indicator */}
                                                <div
                                                    className={cn(
                                                        "flex items-center justify-center w-5 h-5 rounded-md border",
                                                        tenant.has_whatsapp
                                                            ? "bg-green-500/10 border-green-500/30 text-green-500"
                                                            : "bg-slate-800/50 border-slate-700/50 text-slate-600 opacity-50"
                                                    )}
                                                    title={tenant.has_whatsapp ? "WhatsApp Integrado" : "Sem WhatsApp"}
                                                >
                                                    <Smartphone size={10} strokeWidth={3} />
                                                </div>

                                                {onlineCount > 0 && (
                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                                                        <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                                        <span className="text-[7px] font-black text-emerald-500 uppercase">{onlineCount} Online</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate">{tenant.city}</p>
                                                <div className="w-1 h-1 bg-slate-800 rounded-full" />
                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                                    <Clock size={8} /> {formatDate(tenant.created_at)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={cn(
                                                    "text-[7px] font-black px-1.5 py-0.5 rounded shadow-sm border uppercase tracking-widest",
                                                    tenant.plan === 'premium' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-blue-600/10 text-blue-500 border-blue-600/20"
                                                )}>
                                                    {tenant.plan || 'Basic'}
                                                </span>
                                                <span className={cn(
                                                    "text-[7px] font-black uppercase tracking-tight",
                                                    (tenant.subscription_status === 'active' || tenant.subscription_status === 'trial') ? "text-emerald-500" : "text-red-500"
                                                )}>
                                                    {tenant.subscription_status || 'Ativa'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Owner Information */}
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 lg:border-l lg:border-white/5 lg:pl-6">
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none">Responsável</p>
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                                                <User size={12} className="text-blue-500 opacity-70" />
                                                <span className="truncate">{tenant.owner?.[0]?.name || '---'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[9px] text-slate-500 font-medium lowercase opacity-80">
                                                <Mail size={10} />
                                                <span className="truncate">{tenant.owner?.[0]?.email || '---'}</span>
                                            </div>
                                        </div>

                                        {/* Stats Summary */}
                                        <div className="flex items-center justify-between gap-4 md:justify-around">
                                            <div className="text-center">
                                                <p className="text-sm font-black text-white leading-none mb-1">{tenant.stats?.total_attendances || 0}</p>
                                                <p className="text-[7px] font-black text-slate-600 uppercase tracking-tighter">Atendimentos</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-black text-white leading-none mb-1">{totalUsers}</p>
                                                <p className="text-[7px] font-black text-slate-600 uppercase tracking-tighter">Colaboradores</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-black text-emerald-500 mb-1">{formatCurrency(tenant.stats?.total_revenue || 0)}</p>
                                                <p className="text-[7px] font-black text-slate-600 uppercase tracking-tighter">Receita</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Management Actions */}
                                    <div className="flex flex-row lg:flex-col items-center justify-center gap-1.5 border-t lg:border-t-0 lg:border-l border-white/5 pt-3 lg:pt-0 lg:pl-4">
                                        <div className="flex gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className={cn(
                                                    "h-8 w-8 border-slate-800 bg-slate-950 transition-all rounded-lg",
                                                    tenant.settings?.diagnostic_enabled ? "text-amber-500 border-amber-500/50 bg-amber-500/10" : "text-slate-500 hover:text-amber-500"
                                                )}
                                                onClick={async () => {
                                                    try {
                                                        const currentSettings = tenant.settings || {};
                                                        const newValue = !currentSettings.diagnostic_enabled;
                                                        await Api.updateSystemTenant(tenant.id, { settings: { ...currentSettings, diagnostic_enabled: newValue } });
                                                        alert(`Diagnóstico ${newValue ? 'ativado' : 'desativado'}`);
                                                        loadTenants();
                                                    } catch (e: any) { alert(e.message); }
                                                }}
                                                title="Diagnóstico"
                                            >
                                                <AlertTriangle size={14} />
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 border-slate-800 bg-slate-950 text-slate-500 hover:text-blue-500 rounded-lg shadow-lg"
                                                onClick={() => handleEditClick(tenant)}
                                                title="Editar"
                                            >
                                                <Pencil size={14} />
                                            </Button>
                                        </div>

                                        <div className="flex gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 border-slate-800 bg-slate-950 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg shadow-lg"
                                                onClick={() => {
                                                    window.open(`/api/system/impersonate?tenant_id=${tenant.id}`, '_blank');
                                                }}
                                                title="Acessar"
                                            >
                                                <ExternalLink size={14} />
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 border-slate-800 bg-slate-950 text-slate-500 hover:text-red-500 rounded-lg shadow-lg"
                                                onClick={async () => {
                                                    if (window.confirm(`Excluir permanentemente "${tenant.name}"?`)) {
                                                        try {
                                                            await Api.deleteSystemTenant(tenant.id);
                                                            setTenants(prev => prev.filter(t => t.id !== tenant.id));
                                                        } catch (e: any) { alert(e.message); }
                                                    }
                                                }}
                                                title="Remover"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingTenant} onOpenChange={(open) => !open && setEditingTenant(null)}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base font-black uppercase">Editar Barbearia</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-500">Plano</Label>
                            <Select
                                value={editForm.plan}
                                onValueChange={(val) => setEditForm(prev => ({ ...prev, plan: val }))}
                            >
                                <SelectTrigger className="bg-slate-950 border-slate-800 h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800">
                                    <SelectItem value="basic">Basic (Gratuito)</SelectItem>
                                    <SelectItem value="premium">Premium (Mensal)</SelectItem>
                                    <SelectItem value="complete">Completo (Anual)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-500">Status</Label>
                            <Select
                                value={editForm.subscription_status}
                                onValueChange={(val) => setEditForm(prev => ({ ...prev, subscription_status: val }))}
                            >
                                <SelectTrigger className="bg-slate-950 border-slate-800 h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800">
                                    <SelectItem value="active">Ativo</SelectItem>
                                    <SelectItem value="past_due">Atrasado</SelectItem>
                                    <SelectItem value="canceled">Cancelado</SelectItem>
                                    <SelectItem value="trialing">Em Teste</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-500">Próxima Renovação / Fim Trial</Label>
                            <Input
                                type="date"
                                value={editForm.subscription_current_period_end}
                                onChange={(e) => setEditForm(prev => ({ ...prev, subscription_current_period_end: e.target.value }))}
                                className="bg-slate-950 border-slate-800 text-xs h-9"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setEditingTenant(null)} className="text-[10px] uppercase font-bold">Cancelar</Button>
                        <Button onClick={handleSaveTenant} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] uppercase font-bold">
                            {saving ? 'Gravando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
