'use client';

import { useState, useEffect } from 'react';
import { Api } from '@/lib/api';
import {
    Users,
    Search,
    Plus,
    Phone,
    User,
    Mail,
    Trash2,
    Edit2,
    MoreHorizontal,
    X,
    Upload,
    Loader2,
    Calendar,
    Copy,
    ExternalLink,
    UserCheck,
    Scissors,
    MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatPhone, formatCPF } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth-provider';
import { getBusinessTexts } from '@/lib/business-dictionary';
import Image from 'next/image';
import { supabaseClient } from '@/lib/supabase-client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Client {
    id: string;
    name: string;
    phone: string;
    cpf?: string;
    photo_url?: string;
    last_service_at?: string;
    created_at: string;
}

export default function ClientsPage() {
    const { tenant } = useAuth();
    const texts = getBusinessTexts(tenant?.business_type);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showRegisterDialog, setShowRegisterDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<string | null>(null);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        cpf: '',
        photo_url: ''
    });

    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async (search = '') => {
        try {
            setLoading(true);
            const data = await Api.getClients(search);
            setClients(data);
        } catch (error) {
            console.error('Failed to load clients', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadClients(searchTerm);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            if (editingClient) {
                await Api.updateClient(editingClient.id, formData);
            } else {
                await Api.createClient(formData);
            }
            setShowRegisterDialog(false);
            setEditingClient(null);
            setFormData({ name: '', phone: '', cpf: '', photo_url: '' });
            loadClients();
        } catch (error: any) {
            alert('Erro ao salvar: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (client: Client) => {
        setEditingClient(client);
        setFormData({
            name: client.name,
            phone: client.phone,
            cpf: client.cpf || '',
            photo_url: client.photo_url || ''
        });
        setShowRegisterDialog(true);
    };

    const handleDelete = (id: string) => {
        setClientToDelete(id);
        setShowDeleteDialog(true);
    };

    const confirmDelete = async () => {
        if (!clientToDelete) return;
        try {
            setDeleting(true);
            await Api.deleteClient(clientToDelete);
            setShowDeleteDialog(false);
            setClientToDelete(null);
            loadClients();
        } catch (error: any) {
            alert('Erro ao excluir: ' + error.message);
        } finally {
            setDeleting(false);
        }
    };

    const handleShareLink = (client: Client) => {
        if (!tenant) return;
        const slugOrId = tenant.slug || tenant.id;
        const baseUrl = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://app.791barber.com';
        const personalizedUrl = `${baseUrl}/${slugOrId}?c=${client.id}`;

        const message = `Olá ${client.name}! Use nosso aplicativo para agendar um horário rapidamente: ${personalizedUrl}`;
        const whatsappUrl = `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        try {
            setUploading(true);
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `client-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('logos') // Using 'logos' bucket as it's already configured for public access
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabaseClient.storage
                .from('logos')
                .getPublicUrl(filePath);

            setFormData({ ...formData, photo_url: data.publicUrl });
        } catch (error: any) {
            alert('Erro no upload: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tighter">{texts.clients}</h1>
                    <p className="text-slate-500 text-sm">Gerencie o cadastro e histórico dos seus {texts.clients.toLowerCase()}.</p>
                </div>
                <Button
                    onClick={() => {
                        setEditingClient(null);
                        setFormData({ name: '', phone: '', cpf: '', photo_url: '' });
                        setShowRegisterDialog(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 px-6 rounded-xl shadow-lg shadow-blue-600/20"
                >
                    <Plus size={20} />
                    Novo {texts.client}
                </Button>
            </div>

            {/* Search & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-3 bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
                    <CardHeader className="pb-0">
                        <form onSubmit={handleSearch} className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <Input
                                placeholder="Buscar por nome, telefone ou CPF..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 h-14 bg-slate-950 border-slate-800 text-slate-100 focus:ring-blue-500/20 placeholder:text-slate-600 rounded-xl"
                            />
                            <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-800 hover:bg-slate-700 h-10 px-4 rounded-lg">
                                Buscar
                            </Button>
                        </form>
                    </CardHeader>
                    <CardContent className="p-0 mt-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-20 gap-4 text-slate-500">
                                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                                <p>Carregando {texts.clients.toLowerCase()}...</p>
                            </div>
                        ) : clients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-20 gap-4 text-slate-600">
                                <Users size={48} className="opacity-20" />
                                <p>Nenhum {texts.client.toLowerCase()} encontrado.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-800 bg-slate-800/20">
                                            <th className="p-4 px-6 text-xs uppercase font-black text-slate-500 tracking-wider">{texts.client}</th>
                                            <th className="p-4 px-6 text-xs uppercase font-black text-slate-500 tracking-wider">Contato</th>
                                            <th className="p-4 px-6 text-xs uppercase font-black text-slate-500 tracking-wider">CPF</th>
                                            <th className="p-4 px-6 text-xs uppercase font-black text-slate-500 tracking-wider text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {clients.map((client) => (
                                            <tr key={client.id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="p-4 px-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                                                            {client.photo_url ? (
                                                                <Image src={client.photo_url} alt={client.name} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                                                            ) : (
                                                                <User className="w-5 h-5 text-slate-500" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-100">{client.name}</div>
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="text-[10px] text-slate-500 flex items-center gap-1 uppercase">
                                                                    <Calendar size={10} />
                                                                    Deste {format(new Date(client.created_at), 'MM/yyyy')}
                                                                </div>
                                                                {client.last_service_at && (
                                                                    <div className="text-[10px] text-emerald-500 flex items-center gap-1 uppercase font-bold">
                                                                        <UserCheck size={10} />
                                                                        Atendido em: {format(new Date(client.last_service_at), 'dd/MM/yyyy')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 px-6">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="text-slate-300 flex items-center gap-2 text-sm font-medium">
                                                            <Phone size={14} className="text-blue-500" />
                                                            {client.phone}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 px-6">
                                                    <div className="text-slate-400 text-sm font-mono">
                                                        {client.cpf || '—'}
                                                    </div>
                                                </td>
                                                <td className="p-4 px-6 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-100">
                                                                <MoreHorizontal size={18} />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-300">
                                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                            <DropdownMenuSeparator className="bg-slate-800" />
                                                            <DropdownMenuItem onClick={() => handleEdit(client)} className="gap-2 focus:bg-slate-800 focus:text-slate-100">
                                                                <Edit2 size={16} /> Editar Cadastro
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleShareLink(client)} className="gap-2 text-green-400 focus:bg-green-400/10 focus:text-green-400 cursor-pointer">
                                                                <MessageSquare size={16} /> Enviar Link WhatsApp
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="bg-slate-800" />
                                                            <DropdownMenuItem onClick={() => handleDelete(client.id)} className="gap-2 text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer">
                                                                <Trash2 size={16} /> Remover {texts.client}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="space-y-6">
                    <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-none shadow-xl text-white">
                        <CardContent className="pt-6">
                            <div className="space-y-1">
                                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Total de {texts.clients}</p>
                                <h3 className="text-4xl font-black">{clients.length}</h3>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-blue-100 bg-white/10 w-fit px-2 py-1 rounded-full">
                                <Users size={12} />
                                Base consolidada
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-300 uppercase shrink-0">Últimos Cadastros</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {clients.slice(0, 4).map(c => (
                                    <div key={c.id} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold overflow-hidden border border-slate-700">
                                            {c.photo_url ? (
                                                <Image src={c.photo_url} alt={c.name} width={32} height={32} unoptimized />
                                            ) : (
                                                c.name.substring(0, 2).toUpperCase()
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-200 truncate">{c.name}</p>
                                            <p className="text-[10px] text-slate-500">{format(new Date(c.created_at), 'dd/MM/yyyy')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Register/Edit Dialog */}
            <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
                <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-100 tracking-tight">
                            {editingClient ? `Editar ${texts.client}` : `Cadastrar ${texts.client}`}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Preencha as informações básicas para o cadastro.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-6 pt-4">
                        <div className="flex flex-col items-center gap-4 mb-6">
                            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900 flex items-center justify-center overflow-hidden relative group shrink-0">
                                {formData.photo_url ? (
                                    <Image src={formData.photo_url} alt="Profile" width={96} height={96} className="w-full h-full object-cover transition-transform group-hover:scale-110" unoptimized />
                                ) : (
                                    <User className="w-8 h-8 text-slate-600" />
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                    </div>
                                )}
                                <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 bg-blue-600/40 transition-opacity">
                                    <Upload className="w-6 h-6 text-white" />
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
                                </label>
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Foto de Perfil</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs font-bold uppercase text-slate-400">Nome Completo</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="João Silva"
                                    required
                                    className="bg-slate-900 border-slate-700 h-11 focus:ring-blue-500/20"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-xs font-bold uppercase text-slate-400">Telefone / WhatsApp</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                                        placeholder="(11) 99999-9999"
                                        required
                                        className="bg-slate-900 border-slate-700 h-11 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cpf" className="text-xs font-bold uppercase text-slate-400">CPF (Opcional)</Label>
                                    <Input
                                        id="cpf"
                                        value={formData.cpf}
                                        onChange={e => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                                        placeholder="000.000.000-00"
                                        className="bg-slate-900 border-slate-700 h-11 focus:ring-blue-500/20 font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 h-12">
                            <Button type="button" variant="ghost" onClick={() => setShowRegisterDialog(false)} className="h-full text-slate-400 hover:text-white rounded-xl">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={saving || uploading} className="bg-blue-600 hover:bg-blue-700 text-white h-full px-8 rounded-xl shrink-0">
                                {saving ? <Loader2 className="animate-spin" /> : editingClient ? 'Salvar Alterações' : `Cadastrar ${texts.client}`}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-red-500 tracking-tight flex items-center gap-2">
                            <Trash2 size={24} />
                            REMOVER CLIENTE
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <h4 className="text-red-500 font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                AVISO DE RESTRIÇÃO
                            </h4>
                            <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                <span className="text-red-400 font-bold">ATENÇÃO!</span> Não remova clientes do sistema, a não ser que o cadastro esteja <span className="text-white font-bold underline underline-offset-4 Decoration-red-500">DUPLICADO</span>.
                            </p>
                        </div>

                        <p className="text-xs text-slate-500 text-center font-medium">
                            Remover um cliente apagará permanentemente seu histórico de atendimentos e preferências.
                        </p>
                    </div>

                    <DialogFooter className="grid grid-cols-2 gap-3 pb-2 h-auto">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowDeleteDialog(false)}
                            className="w-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl h-12 font-bold"
                        >
                            CANCELAR
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmDelete}
                            disabled={deleting}
                            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl h-12 font-black shadow-lg shadow-red-600/20"
                        >
                            {deleting ? <Loader2 className="animate-spin" /> : 'EXCLUIR'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
