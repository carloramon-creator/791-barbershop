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
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-100 tracking-tighter uppercase">Gerenciar Barbearias</h1>
                    <p className="text-slate-500 font-medium">Lista completa de licenciados e performance individual.</p>
                </div>

                {/* Global Summary Row */}
                <div className="flex bg-slate-900 border border-slate-800 rounded-2xl p-2 gap-4 shadow-xl">
                    <div className="text-center px-4">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Atendimentos</p>
                        <p className="text-sm font-black text-slate-100">{totals.attendances}</p>
                    </div>
                    <div className="text-center border-x border-slate-800 px-4">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Vendas</p>
                        <p className="text-sm font-black text-emerald-500">{formatCurrency(totals.revenue)}</p>
                    </div>
                    <div className="text-center px-4">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Usuários</p>
                        <p className="text-sm font-black text-purple-500">{totals.users}</p>
                    </div>
                </div>
            </div>
            {/* Business Type Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Store size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-100">{tenants.length}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Total de Empresas</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <Scissors size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-100">
                                {tenants.filter(t => t.business_type !== 'beauty_salon').length}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Barbearias</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-100">
                                {tenants.filter(t => t.business_type === 'beauty_salon').length}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Salões de Beleza</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                        placeholder="Buscar por nome ou proprietário..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-slate-900 border-slate-800 pl-12 h-12 rounded-xl text-slate-100 focus:ring-blue-500"
                    />
                </div>
                <Button variant="outline" className="border-slate-800 bg-slate-900 h-12 px-6 font-bold text-slate-400 hover:text-white">
                    <Filter className="w-4 h-4 mr-2" /> Filtros
                </Button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 gap-4">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-8 rounded-2xl text-center font-bold">
                        <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-xl mb-2">Ops! Algo deu errado.</p>
                        <p className="text-sm opacity-80">{error}</p>
                        <Button
                            onClick={loadTenants}
                            variant="outline"
                            className="mt-6 border-red-500/30 hover:bg-red-500/10"
                        >
                            Tentar Novamente
                        </Button>
                    </div>
                )}

                {loading ? (
                    <div className="py-20 text-center"><Activity className="animate-spin inline text-blue-500" /></div>
                ) : filteredTenants.map((tenant) => (
                    <Card key={tenant.id} className="bg-slate-900 border-slate-800 hover:border-blue-500/30 transition-all group shadow-xl">
                        <CardContent className="p-2">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                                {/* Brand & Location */}
                                <div className="flex items-center gap-3 min-w-[200px]">
                                    <div className="w-9 h-9 rounded-lg bg-slate-950 p-1 flex items-center justify-center border border-slate-800 shadow-inner shrink-0">
                                        {tenant.logo_url ? <img src={tenant.logo_url} className="w-full h-full object-cover rounded-md" /> : <Store className="text-slate-700" size={16} />}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-black text-slate-100 group-hover:text-blue-500 transition-colors truncate">
                                            {search ? (
                                                <span dangerouslySetInnerHTML={{
                                                    __html: tenant.name.replace(new RegExp(`(${search})`, 'gi'), '<span class="text-blue-500">$1</span>')
                                                }} />
                                            ) : tenant.name}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight truncate leading-none mt-0.5">{tenant.city}, {tenant.state}</p>
                                        {tenant.created_at && (
                                            <div className="flex items-center gap-1 text-[9px] text-slate-600 font-medium mt-0.5" title="Data de Cadastro">
                                                <Calendar size={8} />
                                                {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Owner Details */}
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter leading-none mb-0.5">Proprietário</p>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                                            <User size={12} className="text-blue-500" />
                                            <span className="truncate">{tenant.owner?.[0]?.name || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium italic">
                                            <Mail size={10} />
                                            <span className="truncate">{tenant.owner?.[0]?.email || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter leading-none mb-0.5">Plano</p>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-[9px] font-black px-1.5 py-0.5 rounded uppercase",
                                                tenant.plan === 'premium' ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                                            )}>
                                                {tenant.plan}
                                            </span>
                                            {tenant.subscription_status === 'active' || !tenant.subscription_status ? (
                                                <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase">
                                                    <CheckCircle2 size={10} /> OK
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[9px] font-black text-red-500 uppercase">
                                                    <XCircle size={10} /> {tenant.subscription_status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Block */}
                                <div className="flex items-center gap-4 lg:border-l lg:border-slate-800 lg:pl-4">
                                    <div className="text-center min-w-[60px]">
                                        <p className="text-sm font-black text-slate-100 leading-none">{tenant.stats?.total_attendances || 0}</p>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mt-0.5">Antendimentos</p>
                                    </div>
                                    <div className="text-center min-w-[50px]">
                                        <p className="text-sm font-black text-slate-100 leading-none">{tenant.stats?.total_users || 0}</p>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mt-0.5">Usuários</p>
                                    </div>
                                    <div className="text-center min-w-[80px]">
                                        <p className="text-sm font-black text-emerald-500 leading-none">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(tenant.stats?.total_revenue || 0)}</p>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mt-0.5">Fat. Total</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        className={cn(
                                            "h-8 w-8 border-slate-800 bg-slate-950 transition-colors",
                                            tenant.settings?.diagnostic_enabled
                                                ? "text-amber-500 border-amber-500/50 bg-amber-500/10"
                                                : "text-slate-400 hover:text-amber-500 hover:border-amber-500/50"
                                        )}
                                        onClick={async () => {
                                            try {
                                                const currentSettings = tenant.settings || {};
                                                const newValue = !currentSettings.diagnostic_enabled;
                                                await Api.updateSystemTenant(tenant.id, {
                                                    settings: {
                                                        ...currentSettings,
                                                        diagnostic_enabled: newValue
                                                    }
                                                });
                                                alert(`Diagnóstico ${newValue ? 'ativado' : 'desativado'} para ${tenant.name}`);
                                                window.location.reload();
                                            } catch (e: any) {
                                                alert('Erro ao atualizar: ' + e.message);
                                            }
                                        }}
                                        title={tenant.settings?.diagnostic_enabled ? "Desativar Diagnóstico" : "Ativar Diagnóstico de Suporte"}
                                    >
                                        <AlertTriangle size={14} />
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        className="h-8 w-8 border-slate-800 bg-slate-950 text-slate-400 hover:text-blue-500 hover:border-blue-500/50"
                                        onClick={() => handleEditClick(tenant)}
                                        title="Editar Barbearia"
                                    >
                                        <Pencil size={14} />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        className="border-slate-800 bg-slate-950 text-slate-400 hover:text-blue-500 hover:border-blue-500/50"
                                        onClick={() => {
                                            // Navigate to dashboard as hidden user (impersonation) via API to set cookie
                                            window.location.href = `/api/system/impersonate?tenant_id=${tenant.id}`;
                                        }}
                                        title="Acessar como usuário oculto"
                                    >
                                        <ExternalLink size={14} />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        className="h-8 w-8 border-slate-800 bg-slate-950 text-slate-400 hover:text-red-500 hover:border-red-500/50"
                                        onClick={async () => {
                                            if (window.confirm(`ATENÇÃO: Deseja EXCLUIR PERMANENTEMENTE a barbearia "${tenant.name}"?\n\nEsta ação apagará TODOS os dados vinculados e NÃO pode ser desfeita.`)) {
                                                try {
                                                    await Api.deleteSystemTenant(tenant.id);
                                                    setTenants(prev => prev.filter(t => t.id !== tenant.id));
                                                } catch (e: any) {
                                                    alert('Erro ao excluir: ' + e.message);
                                                }
                                            }
                                        }}
                                        title="Excluir Barbearia"
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {!loading && filteredTenants.length > 0 && (
                    <Card className="bg-slate-950 border-slate-800 border-t-4 border-t-blue-600">
                        <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-8 opacity-80">
                                <div className="flex items-center gap-4 min-w-[250px]">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-blue-500/30">
                                        <TrendingUp className="text-blue-500" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-100">Total Acumulado</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Soma de todos os licenciados</p>
                                    </div>
                                </div>
                                <div className="flex-1"></div>
                                <div className="flex items-center gap-8">
                                    <div className="text-center">
                                        <p className="text-lg font-black text-slate-100">{totals.attendances}</p>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Atendimentos</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-black text-slate-100">{totals.users}</p>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Usuários</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-black text-emerald-500">{formatCurrency(totals.revenue)}</p>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Faturamento Total</p>
                                    </div>
                                </div>
                                <div className="w-[84px]"></div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

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
