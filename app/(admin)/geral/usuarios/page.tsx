'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import {
    ShieldCheck,
    UserPlus,
    Trash2,
    Mail,
    Shield,
    Loader2,
    Search,
    AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SystemAdminsPage() {
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);

    const loadAdmins = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('is_system_admin', true)
                .order('name', { ascending: true });

            if (error) throw error;
            setAdmins(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAdmins();
    }, []);

    const handlePromoteByEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setInviting(true);

            const res = await fetch('/api/admin/system-admins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao processar solicitação.');
            }

            setInviteEmail('');
            loadAdmins();
            alert(data.message || 'Operação realizada com sucesso!');
        } catch (e: any) {
            alert('Erro: ' + e.message);
        } finally {
            setInviting(false);
        }
    };

    const handleRemoveAdmin = async (id: string, email: string) => {
        if (!confirm(`Remover acesso administrativo de ${email}?`)) return;

        try {
            const { error } = await supabaseClient
                .from('users')
                .update({ is_system_admin: false })
                .eq('id', id);

            if (error) throw error;
            loadAdmins();
        } catch (e: any) {
            alert('Erro ao remover: ' + e.message);
        }
    };

    const filteredAdmins = admins.filter(a =>
        a.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-100 tracking-tighter uppercase flex items-center gap-3">
                        <ShieldCheck className="text-blue-500" size={32} />
                        Administradores do Sistema
                    </h1>
                    <p className="text-slate-500 font-medium">Gerencie quem tem acesso total às configurações globais do SaaS.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Invite Section */}
                <Card className="lg:col-span-1 bg-slate-900 border-slate-800 shadow-xl self-start">
                    <CardHeader>
                        <CardTitle className="text-slate-100 flex items-center gap-2">
                            <UserPlus size={18} className="text-blue-500" />
                            Convidar ou Promover
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            Convide um novo Super Admin ou promova um usuário existente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePromoteByEmail} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-400 text-[10px] font-black uppercase tracking-widest">E-mail do Usuário</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="novo.admin@email.com"
                                        value={inviteEmail}
                                        onChange={e => setInviteEmail(e.target.value)}
                                        className="bg-slate-950 border-slate-800 pl-10 h-11 text-sm text-slate-100"
                                        required
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                disabled={inviting || !inviteEmail}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11"
                            >
                                {inviting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Convidar / Promover'}
                            </Button>
                        </form>
                        <div className="mt-6 p-4 bg-blue-600/5 border border-blue-600/10 rounded-xl">
                            <div className="flex gap-3">
                                <AlertCircle size={16} className="text-blue-500 shrink-0" />
                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                    <strong>Atenção:</strong> Novos usuários receberão um e-mail de convite. Usuários existentes terão acesso imediato ao painel <strong>/geral</strong>.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Admins List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <Input
                            placeholder="Buscar administradores por nome ou e-mail..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-slate-900 border-slate-800 pl-12 h-14 rounded-2xl text-slate-100 shadow-xl"
                        />
                    </div>

                    {loading ? (
                        <div className="py-20 text-center"><Loader2 className="animate-spin inline text-blue-500 w-10 h-10" /></div>
                    ) : filteredAdmins.length === 0 ? (
                        <div className="py-20 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl">
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum administrador encontrado</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredAdmins.map((admin) => (
                                <Card key={admin.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all group overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner overflow-hidden">
                                                    {admin.photo_url ? (
                                                        <img src={admin.photo_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Shield className="text-blue-500" size={24} />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-100 leading-none">{admin.name}</h3>
                                                    <p className="text-xs text-slate-500 mt-1">{admin.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right hidden sm:block">
                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 bg-blue-600/10 text-blue-500 rounded-full">Sistema Ativo</span>
                                                    <p className="text-[10px] text-slate-600 mt-1">ID: {admin.id.slice(0, 8)}</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                                                    className="text-slate-700 hover:text-red-500 hover:bg-red-500/10 h-11 w-11 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
