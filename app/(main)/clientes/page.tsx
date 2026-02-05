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
    MessageSquare,
    Clock,
    ShoppingBag,
    CalendarCheck,
    ListOrdered,
    Ticket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatPhone, formatCPF, formatCurrency, normalizePhone } from '@/lib/utils';
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
import { WhatsAppBroadcastDialog } from '@/components/whatsapp/whatsapp-broadcast-dialog';

interface Client {
    id: string;
    name: string;
    phone: string;
    cpf?: string;
    photo_url?: string;
    birth_date?: string;
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
    const [showHistoryDialog, setShowHistoryDialog] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [clientHistory, setClientHistory] = useState<any[]>([]);
    const [selectedHistoryClient, setSelectedHistoryClient] = useState<Client | null>(null);
    const [showVoucherDialog, setShowVoucherDialog] = useState(false);
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [voucherLoading, setVoucherLoading] = useState(false);
    const [voucherFormData, setVoucherFormData] = useState({
        code: '',
        discount_type: 'fixed' as 'fixed' | 'percentage',
        discount_value: 0,
        expires_at: '',
        is_birthday: false
    });

    // Broadcast state
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
    const [broadcastConfig, setBroadcastConfig] = useState<any>({
        message: '',
        target: 'all',
        clientIds: []
    });

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        cpf: '',
        photo_url: '',
        birth_date: ''
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

            // Normaliza o telefone antes de salvar (E.164)
            const submissionData = {
                ...formData,
                phone: normalizePhone(formData.phone)
            };

            if (editingClient) {
                await Api.updateClient(editingClient.id, submissionData);
            } else {
                await Api.createClient(submissionData);
            }
            setShowRegisterDialog(false);
            setEditingClient(null);
            setFormData({ name: '', phone: '', cpf: '', photo_url: '', birth_date: '' });
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
            photo_url: client.photo_url || '',
            birth_date: client.birth_date || ''
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

    const handleViewHistory = async (client: Client) => {
        setSelectedHistoryClient(client);
        setShowHistoryDialog(true);
        setHistoryLoading(true);
        try {
            const data = await Api.getClientHistory(client.id);
            setClientHistory(data.history || []);
        } catch (error) {
            console.error('Erro ao carregar histórico', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleViewVouchers = async (client: Client) => {
        setSelectedHistoryClient(client);
        setShowVoucherDialog(true);
        setVoucherLoading(true);
        try {
            const data = await Api.getVouchers(client.id);
            setVouchers(data);
            setVoucherFormData({
                code: `PROMO${Math.floor(1000 + Math.random() * 9000)}`,
                discount_type: 'fixed',
                discount_value: 10,
                expires_at: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                is_birthday: false
            });
        } catch (error) {
            console.error('Erro ao carregar vouchers', error);
        } finally {
            setVoucherLoading(false);
        }
    };

    const handleCreateVoucher = async () => {
        if (!selectedHistoryClient) return;
        try {
            setVoucherLoading(true);
            await Api.createVoucher({
                ...voucherFormData,
                client_id: selectedHistoryClient.id
            });
            const data = await Api.getVouchers(selectedHistoryClient.id);
            setVouchers(data);
            alert('Voucher criado com sucesso!');
        } catch (error: any) {
            alert('Erro ao criar: ' + error.message);
        } finally {
            setVoucherLoading(false);
        }
    };

    const handleDeleteVoucher = async (id: string) => {
        if (!confirm('Excluir este voucher?')) return;
        try {
            setVoucherLoading(true);
            await Api.deleteVoucher(id);
            const data = await Api.getVouchers(selectedHistoryClient?.id);
            setVouchers(data);
        } catch (error: any) {
            alert('Erro ao excluir: ' + error.message);
        } finally {
            setVoucherLoading(false);
        }
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
                        setFormData({ name: '', phone: '', cpf: '', photo_url: '', birth_date: '' });
                        setShowRegisterDialog(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 px-6 rounded-xl shadow-lg shadow-blue-600/20"
                >
                    <Plus size={20} />
                    Novo {texts.client}
                </Button>
                <Button
                    variant="outline"
                    onClick={() => {
                        setBroadcastConfig({ message: '', target: 'all', clientIds: [] });
                        setIsBroadcastOpen(true);
                    }}
                    className="bg-slate-800 border-slate-700 text-slate-100 font-bold gap-2 h-12 px-6 rounded-xl shadow-lg shadow-blue-500/5 active:scale-95 transition-transform"
                >
                    <MessageSquare size={20} className="text-blue-500" />
                    Broadcast WhatsApp
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
                                                            {formatPhone(client.phone)}
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
                                                            <DropdownMenuItem onClick={() => handleViewHistory(client)} className="gap-2 focus:bg-slate-800 focus:text-slate-100">
                                                                <Clock size={16} /> Ver Histórico
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleShareLink(client)} className="gap-2 text-green-400 focus:bg-green-400/10 focus:text-green-400 cursor-pointer">
                                                                <MessageSquare size={16} /> Enviar Link WhatsApp
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleViewVouchers(client)} className="gap-2 text-blue-400 focus:bg-blue-400/10 focus:text-blue-400 cursor-pointer">
                                                                <Ticket size={16} /> Ver Cupons / Fidelidade
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setBroadcastConfig({ message: '', target: 'specific', clientIds: [client.id] });
                                                                    setIsBroadcastOpen(true);
                                                                }}
                                                                className="gap-2 text-indigo-400 focus:bg-indigo-400/10 focus:text-indigo-400 cursor-pointer"
                                                            >
                                                                <MessageSquare size={16} /> Enviar Mensagem Direta
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
                                <div className="space-y-2">
                                    <Label htmlFor="birth_date" className="text-xs font-bold uppercase text-slate-400">Data de Nascimento</Label>
                                    <Input
                                        id="birth_date"
                                        type="date"
                                        value={formData.birth_date}
                                        onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                        className="bg-slate-900 border-slate-700 h-11 focus:ring-blue-500/20"
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
            {/* History Dialog */}
            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b border-slate-800 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-500">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-black text-slate-100">HISTÓRICO DE ATENDIMENTO</DialogTitle>
                                    <DialogDescription className="text-slate-500 text-xs font-medium">
                                        {selectedHistoryClient?.name} • {selectedHistoryClient?.phone}
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/30">
                        {historyLoading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                <p className="text-sm font-bold uppercase tracking-widest">Carregando histórico...</p>
                            </div>
                        ) : clientHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-600">
                                <ListOrdered size={48} className="opacity-20" />
                                <p className="font-medium">Nenhum registro encontrado para este cliente.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-800">
                                {clientHistory.map((item, idx) => (
                                    <div key={idx} className="relative flex flex-col gap-2">
                                        <div className="flex items-center gap-4">
                                            {/* Timeline dot */}
                                            <div className={cn(
                                                "w-8 h-8 rounded-full border-2 border-slate-950 flex items-center justify-center z-10",
                                                item.type === 'service_sale' ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"
                                            )}>
                                                {item.type === 'service_sale' ? <Scissors size={14} /> : <ShoppingBag size={14} />}
                                            </div>

                                            <div
                                                onClick={() => {
                                                    const detailText = item.items?.map((i: any) => `${i.quantity}x ${i.name} (${formatCurrency(i.price)})`).join('\n') || 'Nenhum detalhe';
                                                    alert(`${item.title}\n\n${detailText}\n\nTotal: ${formatCurrency(item.amount)}`);
                                                }}
                                                className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all cursor-pointer group"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h4 className="font-bold text-slate-100 text-xs uppercase">{item.title}</h4>
                                                        <p className="text-[10px] text-slate-400 font-medium">{item.barber || item.vendedor}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={cn("font-black text-sm", item.type === 'service_sale' ? "text-emerald-400" : "text-blue-400")}>{formatCurrency(item.amount)}</p>
                                                        <p className="text-[9px] font-bold text-slate-600">{format(new Date(item.date), "dd/MM/yy HH:mm")}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-4 border-t border-slate-800 shrink-0">
                        <Button variant="ghost" onClick={() => setShowHistoryDialog(false)} className="w-full rounded-xl text-slate-400 font-bold hover:bg-slate-900 hover:text-white transition-all">
                            FECHAR
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Vouchers Dialog */}
            <Dialog open={showVoucherDialog} onOpenChange={setShowVoucherDialog}>
                <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-slate-100 flex items-center gap-2">
                            <Ticket size={24} className="text-blue-500" />
                            CUPONS E FIDELIDADE
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 text-xs">
                            Gerencie os vouchers de desconto de <span className="text-white font-bold">{selectedHistoryClient?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        {/* List Vouchers */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cupons Ativos</h4>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {voucherLoading && vouchers.length === 0 ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>
                                ) : vouchers.length === 0 ? (
                                    <p className="text-xs text-slate-600 text-center py-8 font-medium">Nenhum cupom ativo.</p>
                                ) : (
                                    vouchers.map((v: any) => (
                                        <div key={v.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl relative group">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-black text-blue-400 uppercase tracking-tighter">{v.code}</span>
                                                <button onClick={() => handleDeleteVoucher(v.id)} className="text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <p className="text-lg font-black text-slate-100">
                                                    {v.discount_type === 'percentage' ? `${v.discount_value}%` : formatCurrency(v.discount_value)}
                                                </p>
                                                <p className="text-[9px] font-medium text-slate-500">EXP: {v.expires_at ? format(new Date(v.expires_at), "dd/MM/yy") : 'N/A'}</p>
                                            </div>
                                            {v.is_birthday && (
                                                <span className="absolute -top-1 -right-1 bg-pink-600 text-[8px] font-black text-white px-1.5 py-0.5 rounded-full uppercase">Aniversário 🎂</span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Create Voucher */}
                        <div className="space-y-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 shadow-inner">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Novo Voucher</h4>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Código</Label>
                                    <Input
                                        value={voucherFormData.code}
                                        onChange={e => setVoucherFormData({ ...voucherFormData, code: e.target.value.toUpperCase() })}
                                        className="h-10 bg-slate-950 border-slate-800 text-sm font-mono focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Tipo</Label>
                                        <select
                                            className="w-full h-10 bg-slate-950 border-slate-800 rounded-md px-3 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                            value={voucherFormData.discount_type}
                                            onChange={(e: any) => setVoucherFormData({ ...voucherFormData, discount_type: e.target.value })}
                                        >
                                            <option value="fixed">Fixo (R$)</option>
                                            <option value="percentage">Percentual (%)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Valor</Label>
                                        <Input
                                            type="number"
                                            value={voucherFormData.discount_value}
                                            onChange={e => setVoucherFormData({ ...voucherFormData, discount_value: Number(e.target.value) })}
                                            className="h-10 bg-slate-950 border-slate-800 text-sm focus:ring-blue-500/20"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Validade</Label>
                                    <Input
                                        type="date"
                                        value={voucherFormData.expires_at}
                                        onChange={e => setVoucherFormData({ ...voucherFormData, expires_at: e.target.value })}
                                        className="h-10 bg-slate-950 border-slate-800 text-sm focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="is_birthday"
                                        checked={voucherFormData.is_birthday}
                                        onChange={e => setVoucherFormData({ ...voucherFormData, is_birthday: e.target.checked })}
                                        className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-500/10"
                                    />
                                    <Label htmlFor="is_birthday" className="text-[10px] font-bold text-slate-400 uppercase cursor-pointer select-none">Cupom Especial de Aniversário</Label>
                                </div>
                                <Button
                                    onClick={handleCreateVoucher}
                                    disabled={voucherLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase h-12 mt-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
                                >
                                    {voucherLoading ? <Loader2 className="animate-spin" /> : 'GERAR CUPOM'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            <WhatsAppBroadcastDialog
                open={isBroadcastOpen}
                onOpenChange={setIsBroadcastOpen}
                initialMessage={broadcastConfig.message}
                initialTarget={broadcastConfig.target}
                initialClientIds={broadcastConfig.clientIds}
            />
        </div >
    );
}
