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
    Sparkles
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

    // Edit State
    const [editingTenant, setEditingTenant] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        plan: '',
        subscription_status: '',
        trial_ends_at: ''
    });

    const [error, setError] = useState<string | null>(initialError);

    const loadTenants = async () => {
        setLoading(true);
        setError(null);
        try {
            const [data, stats] = await Promise.all([
                Api.getSystemTenants(),
                Api.getSystemStats()
            ]);

            setTenants(data || []);
            // Se o stats retornar métricas globais, poderíamos processar aqui,
            // mas o TenantsPage já faz um reduce. Vou apenas garantir que os dados vieram.
            console.log('[CLIENT] Dados carregados:', data.length, 'barbearias');
        } catch (e: any) {
            console.error('[CLIENT ERROR]', e);
            setError(e.message || 'Falha ao carregar barbearias. Verifique se você é um administrador.');
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
            trial_ends_at: tenant.trial_ends_at ? new Date(tenant.trial_ends_at).toISOString().split('T')[0] : ''
        });
    };

    const handleSaveTenant = async () => {
        if (!editingTenant) return;
        setSaving(true);
        try {
            await Api.updateSystemTenant(editingTenant.id, editForm);

            // Refresh local list
            setTenants(prev => prev.map(t => t.id === editingTenant.id ? { ...t, ...editForm } : t));
            setEditingTenant(null);
            alert('Barbearia atualizada com sucesso!');
        } catch (e: any) {
            alert('Erro ao atualizar: ' + e.message);
        } finally {
            setSaving(false);
        }
    };



    const filteredTenants = tenants.filter(t =>
        t.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.owner?.[0]?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const totals = tenants.reduce((acc, t) => ({
        attendances: acc.attendances + (t.stats?.total_attendances || 0),
        users: acc.users + (t.stats?.total_users || 0),
        revenue: acc.revenue + (t.stats?.total_revenue || 0)
    }), { attendances: 0, users: 0, revenue: 0 });

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700">
            {/* Header and Summary */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mb-3">Gestão de Licenciados</h1>
                    <p className="text-slate-500 font-medium max-w-lg">Administre barbearias, salões e acompanhe a saúde de cada contrato em tempo real.</p>
                </div>

                {/* Summary Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full xl:w-auto">
                    {[
                        { label: 'Atendimentos', value: totals.attendances, color: 'text-slate-100', bg: 'bg-slate-900/50' },
                        { label: 'Sales Total', value: formatCurrency(totals.revenue), color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                        { label: 'Usuários', value: totals.users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                        { label: 'Barbearias', value: tenants.length, color: 'text-blue-500', bg: 'bg-blue-600/10' },
                    ].map((m, idx) => (
                        <div key={idx} className={cn("px-6 py-4 rounded-2xl border border-white/5 backdrop-blur-md", m.bg)}>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">{m.label}</p>
                            <p className={cn("text-xl font-black tracking-tight", m.color)}>{m.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Market Share', value: tenants.length, icon: Store, color: 'blue', desc: 'Licenças Ativas' },
                    { label: 'Segmento Masculino', value: tenants.filter(t => t.business_type !== 'beauty_salon').length, icon: Scissors, color: 'amber', desc: 'Barbearias' },
                    { label: 'Segmento Feminino', value: tenants.filter(t => t.business_type === 'beauty_salon').length, icon: Sparkles, color: 'pink', desc: 'Salões de Beleza' },
                ].map((f, idx) => (
                    <Card key={idx} className="bg-slate-900/40 border-slate-800 shadow-xl group hover:border-slate-700 transition-colors">
                        <CardContent className="p-6 flex items-center gap-5">
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg",
                                f.color === 'blue' ? 'bg-blue-600/20 text-blue-500 shadow-blue-900/10' :
                                    f.color === 'amber' ? 'bg-amber-600/20 text-amber-500 shadow-amber-900/10' :
                                        'bg-pink-600/20 text-pink-500 shadow-pink-900/10'
                            )}>
                                <f.icon size={26} />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-3xl font-black text-white leading-none">{f.value}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{f.desc}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <Input
                        placeholder="Buscar por nome da empresa ou proprietário..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-slate-900/80 border-slate-800/50 pl-14 h-14 rounded-2xl text-slate-100 focus:ring-blue-600 focus:border-blue-600/50 shadow-2xl transition-all"
                    />
                </div>
                <Button variant="outline" className="border-slate-800 bg-slate-900 h-14 px-8 font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl shadow-xl">
                    <Filter className="w-4 h-4 mr-2" /> Filtros Avançados
                </Button>
            </div>

            {/* List Section */}
            <div className="grid grid-cols-1 gap-6">
                {error && (
                    <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-12 rounded-3xl text-center shadow-2xl backdrop-blur-md">
                        <AlertTriangle className="w-16 h-16 mx-auto mb-6 text-red-500 opacity-60" />
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Conexão Interrompida</h2>
                        <p className="text-sm font-medium opacity-70 mb-8 max-w-md mx-auto">{error}</p>
                        <Button
                            onClick={loadTenants}
                            variant="outline"
                            className="border-red-500/30 hover:bg-red-500/10 px-8 py-6 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
                        >
                            Restabelecer Conexão
                        </Button>
                    </div>
                )}

                {loading ? (
                    <div className="py-40 flex flex-col items-center gap-4">
                        <Activity className="animate-spin text-blue-600 w-10 h-10" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincronizando dados...</p>
                    </div>
                ) : filteredTenants.map((tenant) => (
                    <Card key={tenant.id} className="bg-slate-900/40 border-slate-800/50 hover:border-blue-500/40 transition-all group shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-1">
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full shadow-[0_0_8px]",
                                (tenant.subscription_status === 'active' || !tenant.subscription_status) ? "bg-emerald-500 shadow-emerald-500/50" : "bg-red-500 shadow-red-500/50"
                            )} />
                        </div>
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                                {/* Branding + Info */}
                                <div className="flex items-center gap-5 min-w-[280px]">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-950 p-1.5 flex items-center justify-center border border-white/5 shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-500">
                                            {tenant.logo_url ? <img src={tenant.logo_url} className="w-full h-full object-cover rounded-xl" /> : <Store className="text-slate-800" size={24} />}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg">
                                            {tenant.business_type === 'beauty_salon' ? <Sparkles size={10} className="text-pink-500" /> : <Scissors size={10} className="text-amber-500" />}
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors truncate tracking-tight uppercase leading-none mb-1">
                                            {tenant.name}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{tenant.city}, {tenant.state}</p>
                                        <div className="flex items-center gap-3 mt-3">
                                            <span className={cn(
                                                "text-[8px] font-black px-2 py-0.5 rounded shadow-sm border uppercase tracking-widest",
                                                tenant.plan === 'premium' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-blue-600/10 text-blue-500 border-blue-600/20"
                                            )}>
                                                {tenant.plan || 'Basic'}
                                            </span>
                                            <div className="h-3 w-px bg-slate-800" />
                                            <span className={cn(
                                                "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tight",
                                                (tenant.subscription_status === 'active' || !tenant.subscription_status) ? "text-emerald-500" : "text-red-500"
                                            )}>
                                                <div className={cn("w-1 h-1 rounded-full animate-pulse", (tenant.subscription_status === 'active' || !tenant.subscription_status) ? "bg-emerald-500" : "bg-red-500")} />
                                                {tenant.subscription_status || 'Ativa'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Owner Information */}
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 lg:border-l lg:border-white/5 lg:pl-8">
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">Administrador Responsável</p>
                                        <div className="flex items-center gap-2 text-[13px] font-bold text-slate-300">
                                            <User size={14} className="text-blue-500 opacity-70" />
                                            <span className="truncate">{tenant.owner?.[0]?.name || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium lowercase italic opacity-80">
                                            <Mail size={12} />
                                            <span className="truncate">{tenant.owner?.[0]?.email || 'N/A'}</span>
                                        </div>
                                    </div>

                                    {/* Stats Summary */}
                                    <div className="flex items-center justify-between gap-4 md:justify-around">
                                        <div className="text-center group/stat">
                                            <p className="text-lg font-black text-white group-hover/stat:text-blue-500 transition-colors leading-none mb-1">{tenant.stats?.total_attendances || 0}</p>
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Atendimentos</p>
                                        </div>
                                        <div className="text-center group/stat">
                                            <p className="text-lg font-black text-white group-hover/stat:text-purple-500 transition-colors leading-none mb-1">{tenant.stats?.total_users || 0}</p>
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Colaboradores</p>
                                        </div>
                                        <div className="text-center group/stat">
                                            <p className="text-lg font-black text-emerald-500 group-hover/stat:scale-110 transition-transform leading-none mb-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(tenant.stats?.total_revenue || 0)}</p>
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Faturamento</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Management Actions */}
                                <div className="flex flex-row lg:flex-col items-center justify-center gap-2 border-t lg:border-t-0 lg:border-l border-white/5 pt-4 lg:pt-0 lg:pl-6">
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className={cn(
                                                "h-10 w-10 border-slate-800 bg-slate-950 transition-all rounded-xl shadow-lg",
                                                tenant.settings?.diagnostic_enabled
                                                    ? "text-amber-500 border-amber-500/50 bg-amber-500/10 shadow-amber-500/5"
                                                    : "text-slate-500 hover:text-amber-500 hover:border-amber-500/50"
                                            )}
                                            onClick={async () => {
                                                try {
                                                    const currentSettings = tenant.settings || {};
                                                    const newValue = !currentSettings.diagnostic_enabled;
                                                    await Api.updateSystemTenant(tenant.id, {
                                                        settings: { ...currentSettings, diagnostic_enabled: newValue }
                                                    });
                                                    alert(`Diagnóstico ${newValue ? 'ATIVADO' : 'DESATIVADO'} para ${tenant.name}`);
                                                    window.location.reload();
                                                } catch (e: any) { alert('Erro: ' + e.message); }
                                            }}
                                            title="Ativar/Desativar Diagnóstico de Suporte"
                                        >
                                            <AlertTriangle size={16} />
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-10 border-slate-800 bg-slate-950 text-slate-500 hover:text-blue-500 hover:border-blue-500/50 rounded-xl shadow-lg transition-all"
                                            onClick={() => handleEditClick(tenant)}
                                            title="Editar Configurações de Plano"
                                        >
                                            <Pencil size={16} />
                                        </Button>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-10 border-slate-800 bg-slate-950 text-blue-500 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all rounded-xl shadow-lg"
                                            onClick={() => {
                                                window.location.href = `/api/system/impersonate?tenant_id=${tenant.id}`;
                                            }}
                                            title="Acessar como usuário oculto (Impersonate)"
                                        >
                                            <ExternalLink size={16} />
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-10 border-slate-800 bg-slate-950 text-slate-500 hover:text-red-500 hover:border-red-500/50 rounded-xl shadow-lg transition-all"
                                            onClick={async () => {
                                                if (window.confirm(`PERIGO: Deseja EXCLUIR PERMANENTEMENTE a barbearia "${tenant.name}"?\n\nEsta ação é irreversível e apagará usuários, agendamentos e faturamento.`)) {
                                                    try {
                                                        await Api.deleteSystemTenant(tenant.id);
                                                        setTenants(prev => prev.filter(t => t.id !== tenant.id));
                                                    } catch (e: any) { alert('Falha ao excluir: ' + e.message); }
                                                }
                                            }}
                                            title="Remover Licenciado"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Global Summary Statistics Card (Bottom) */}
            {!loading && filteredTenants.length > 0 && (
                <Card className="bg-slate-900 border-slate-800/80 border-t-2 border-t-blue-600 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-700">
                    <CardContent className="p-10">
                        <div className="flex flex-col lg:flex-row items-center gap-12">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-3xl bg-blue-600/10 flex items-center justify-center border border-blue-600/20 shadow-[0_0_30px_rgba(37,99,235,0.1)]">
                                    <TrendingUp className="text-blue-500" size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Ecossistema Consolidado</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Métricas somadas de todos os parceiros</p>
                                </div>
                            </div>

                            <div className="flex-1" />

                            <div className="grid grid-cols-3 gap-12 w-full lg:w-auto">
                                <div className="text-center space-y-2">
                                    <p className="text-3xl font-black text-white leading-none tracking-tight">{totals.attendances}</p>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Atendimentos</p>
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-3xl font-black text-white leading-none tracking-tight">{totals.users}</p>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Colaboradores</p>
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-3xl font-black text-emerald-500 leading-none tracking-tight">{formatCurrency(totals.revenue)}</p>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Volume de Negócios</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editingTenant} onOpenChange={(open) => !open && setEditingTenant(null)}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <DialogTitle>Editar Barbearia</DialogTitle>
                        <DialogDescription>Alterar plano e status manualmente.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome da Barbearia</Label>
                            <Input value={editingTenant?.name || ''} disabled className="bg-slate-950 border-slate-800" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Plano</Label>
                                <Select
                                    value={editForm.plan}
                                    onValueChange={(val) => setEditForm(prev => ({ ...prev, plan: val }))}
                                >
                                    <SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800">
                                        <SelectItem value="basic">Basic</SelectItem>
                                        <SelectItem value="premium">Premium</SelectItem>
                                        <SelectItem value="complete">Completo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Status da Assinatura</Label>
                                <Select
                                    value={editForm.subscription_status}
                                    onValueChange={(val) => setEditForm(prev => ({ ...prev, subscription_status: val }))}
                                >
                                    <SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800">
                                        <SelectItem value="active">Ativo (Adimplente)</SelectItem>
                                        <SelectItem value="past_due">Atrasado</SelectItem>
                                        <SelectItem value="canceled">Cancelado</SelectItem>
                                        <SelectItem value="trialing">Trial / Teste</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Fim do Período de Teste/Ciclo</Label>
                            <Input
                                type="date"
                                value={editForm.trial_ends_at}
                                onChange={(e) => setEditForm(prev => ({ ...prev, trial_ends_at: e.target.value }))}
                                className="bg-slate-950 border-slate-800 text-slate-100"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingTenant(null)}>Cancelar</Button>
                        <Button onClick={handleSaveTenant} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
