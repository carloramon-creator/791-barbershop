'use client';

import { useState, useEffect } from 'react';
import { Api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { getBusinessTexts } from '@/lib/business-dictionary';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Camera, RefreshCw, Users, ShieldAlert, FileText, History, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabaseClient } from '@/lib/supabase-client';
import Link from 'next/link';
import Image from 'next/image';
import { BarberClosingDialog } from '@/components/barbers/barber-closing-dialog';

import { Barber, Sale, Service } from '@/lib/types';

export default function BarbeirosPage() {
    const [barbeiros, setBarbeiros] = useState<Barber[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Closing states
    const [showClosingDialog, setShowClosingDialog] = useState(false);
    const [closingSales, setClosingSales] = useState<Sale[]>([]);
    const [closingLoading, setClosingLoading] = useState(false);
    const [closingBarber, setClosingBarber] = useState<Barber | null>(null);
    const [reportBarbers, setReportBarbers] = useState<string[]>([]);

    // Services
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [loadingServices, setLoadingServices] = useState(false);
    const [reportShowActive, setReportShowActive] = useState(true);
    const [reportShowInactive, setReportShowInactive] = useState(false);

    const { role, tenant } = useAuth();
    const texts = getBusinessTexts(tenant?.business_type);

    const fetchBarbeiros = async () => {
        try {
            const data = await Api.getBarbers();
            setBarbeiros(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchServices = async () => {
        try {
            const data = await Api.getServices();
            setServices(data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const [showInactive, setShowInactive] = useState(false);

    // Filtered list based on active state
    const filteredBarbers = barbeiros.filter(b => showInactive ? !b.is_active : b.is_active);

    useEffect(() => {
        fetchBarbeiros();
        fetchServices();
    }, []);

    const handlePhotoUpload = async (file: File) => {
        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `barbers/${fileName}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('barber-photos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabaseClient.storage
                .from('barber-photos')
                .getPublicUrl(filePath);

            setEditingBarber(prev => prev ? { ...prev, photo_url: publicUrl } : null);
        } catch (err: unknown) {
            const error = err as Error;
            alert('Erro no upload: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateBarber = async () => {
        try {
            if (!editingBarber || !editingBarber.name) return alert('Nome é obrigatório');

            // Remove status from payload to avoid "User not logged in" validation error
            // The status should only be changed by the barber login/logout or specific status actions, not profile editing.
            const { status, ...payload } = editingBarber as any;

            await Api.updateBarber(editingBarber.id, payload);

            // Update services
            await Api.updateBarberServices(editingBarber.id, selectedServiceIds);

            setIsEditOpen(false);
            setEditingBarber(null);
            fetchBarbeiros();
        } catch (err: unknown) {
            const error = err as Error;
            alert(`Erro ao atualizar ${texts.professional.toLowerCase()}: ` + (error.message || 'Erro desconhecido'));
        }
    };

    const handleOpenClosing = async (barber: Barber) => {
        setClosingLoading(true);
        setClosingBarber(barber);
        try {
            const response = await Api.getBarberClosing(barber.id);
            // Handle new format { sales, barberName } or old array format
            const salesArray = response?.sales || (Array.isArray(response) ? response : []);
            setClosingSales(salesArray);
            setShowClosingDialog(true);
        } catch (error: unknown) {
            const err = error as Error;
            alert('Erro ao carregar fechamento: ' + err.message);
        } finally {
            setClosingLoading(false);
        }
    };

    const handleConfirmClosing = async (barberId: string, total: number, bonus: number, saleIds: string[]) => {
        if (!confirm(`Confirmar o fechamento no valor de ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}?`)) return;
        setClosingLoading(true);
        try {
            await Api.confirmBarberClosing(barberId, {
                saleIds,
                totalCommission: total - bonus,
                bonus
            });
            setShowClosingDialog(false);
            alert('Fechamento realizado com sucesso! Registro enviado ao Financeiro.');
            fetchBarbeiros();
        } catch (error: unknown) {
            const err = error as Error;
            alert('Erro ao confirmar fechamento: ' + err.message);
        } finally {
            setClosingLoading(false);
        }
    };

    if (role !== 'owner' && role !== 'staff') return <div className="p-8 text-red-500">Acesso restrito.</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
                        <Users className="text-blue-500" /> Equipe de {texts.professionals}
                    </h1>
                    <p className="text-slate-400 font-medium">Visualize o status e disponibilidade dos {texts.professionals.toLowerCase()}.</p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant={showInactive ? "default" : "outline"}
                        onClick={() => setShowInactive(!showInactive)}
                        className={cn(
                            "border-slate-800 transition-all",
                            showInactive ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-white"
                        )}
                    >
                        {showInactive ? 'Ver Ativos' : 'Ver Inativos'}
                    </Button>

                    <Button onClick={fetchBarbeiros} variant="outline" className="border-slate-800 text-slate-400 hover:text-white">
                        <RefreshCw size={16} className={cn("mr-2", loading && "animate-spin")} />
                        Atualizar
                    </Button>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white">
                                <History size={16} className="mr-2" /> Movimentação
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                            <DialogHeader>
                                <DialogTitle>Relatório de Movimentação</DialogTitle>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Data Inicial</Label>
                                        <Input type="date" id="rep-start" className="bg-slate-800 border-slate-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Data Final</Label>
                                        <Input type="date" id="rep-end" className="bg-slate-800 border-slate-700" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <Label className="block">{texts.professionals}</Label>

                                    <div className="flex gap-4 bg-slate-800/30 p-2 rounded-lg border border-slate-800">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="filter-active" checked={reportShowActive} onCheckedChange={(c) => setReportShowActive(!!c)} />
                                            <Label htmlFor="filter-active" className="text-xs cursor-pointer">Ativos</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="filter-inactive" checked={reportShowInactive} onCheckedChange={(c) => setReportShowInactive(!!c)} />
                                            <Label htmlFor="filter-inactive" className="text-xs cursor-pointer">Inativos</Label>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-x-6 gap-y-3 bg-slate-800/50 p-4 rounded-lg max-h-[200px] overflow-y-auto border border-slate-700">
                                        <div className="flex items-center space-x-2 w-full border-b border-slate-700 pb-2 mb-1">
                                            <Checkbox id="all"
                                                checked={reportBarbers.length === barbeiros.filter(b => (b.is_active && reportShowActive) || (!b.is_active && reportShowInactive)).length && barbeiros.filter(b => (b.is_active && reportShowActive) || (!b.is_active && reportShowInactive)).length > 0}
                                                onCheckedChange={(c) => {
                                                    const visibleIds = barbeiros
                                                        .filter(b => (b.is_active && reportShowActive) || (!b.is_active && reportShowInactive))
                                                        .map(b => b.id);
                                                    setReportBarbers(c ? visibleIds : []);
                                                }}
                                            />
                                            <Label htmlFor="all" className="font-bold cursor-pointer">Selecionar Todos Visíveis</Label>
                                        </div>
                                        {barbeiros
                                            .filter(b => (b.is_active && reportShowActive) || (!b.is_active && reportShowInactive))
                                            .map(b => (
                                                <div key={b.id} className="flex items-center space-x-2">
                                                    <Checkbox id={`rb-${b.id}`}
                                                        checked={reportBarbers.includes(b.id)}
                                                        onCheckedChange={(c) => {
                                                            if (c) setReportBarbers([...reportBarbers, b.id]);
                                                            else setReportBarbers(reportBarbers.filter(id => id !== b.id));
                                                        }}
                                                    />
                                                    <Label htmlFor={`rb-${b.id}`} className={cn("cursor-pointer", !b.is_active && "text-slate-500")}>
                                                        {b.name} {!b.is_active && '(Inativo)'}
                                                    </Label>
                                                </div>
                                            ))}
                                        {barbeiros.filter(b => (b.is_active && reportShowActive) || (!b.is_active && reportShowInactive)).length === 0 && (
                                            <p className="text-xs text-slate-500 w-full text-center py-2">Nenhum {texts.professional.toLowerCase()} encontrado com este filtro.</p>
                                        )}
                                    </div>
                                </div>
                                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => {
                                    const s = (document.getElementById('rep-start') as HTMLInputElement).value;
                                    const e = (document.getElementById('rep-end') as HTMLInputElement).value;
                                    const ids = reportBarbers.join(',');
                                    window.open(`/reports/barbeiros?start=${s}&end=${e}&ids=${ids}`, '_blank');
                                }}>
                                    Gerar Relatório PDF
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Link href="/configuracoes/usuarios">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                            <Users className="w-4 h-4" />
                            Gerenciar Equipe
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex items-start gap-3">
                <ShieldAlert className="text-blue-400 w-5 h-5 mt-0.5" />
                <div className="text-sm">
                    <p className="text-blue-100 font-bold">Otimização do Sistema</p>
                    <p className="text-blue-400/80">Para adicionar novos {texts.professionals.toLowerCase()}, utilize o botão <span className="text-white font-bold">Gerenciar Equipe</span>. Lá você define e-mail, foto, endereço e comissões de forma centralizada.</p>
                </div>
            </div>

            {/* Dialog de Edição Rápida (Status/Foto) */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Perfil Público do {texts.professional}</DialogTitle>
                    </DialogHeader>
                    {editingBarber && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 flex justify-center">
                                    <div className="relative group cursor-pointer" onClick={() => document.getElementById('edit-photo-input')?.click()}>
                                        <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden">
                                            {editingBarber.photo_url ? (
                                                <Image src={editingBarber.photo_url} alt="Preview" width={96} height={96} className="w-full h-full object-cover" unoptimized />
                                            ) : (
                                                <Camera size={24} className="text-slate-600 group-hover:text-blue-500 transition-colors" />
                                            )}
                                        </div>
                                        <input
                                            id="edit-photo-input"
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                                        />
                                        {uploading && <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center rounded-full"><RefreshCw className="animate-spin" /></div>}
                                    </div>
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="edit-name">Nome de Exibição (App do Cliente)</Label>
                                    <Input
                                        id="edit-name"
                                        value={editingBarber.name}
                                        onChange={(e) => setEditingBarber({ ...editingBarber, name: e.target.value })}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                                <div className="flex items-center space-x-2 col-span-2 pt-2">
                                    <Label className="flex-1">{texts.professional} Ativo</Label>
                                    <Button
                                        variant={editingBarber.is_active ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => {
                                            // Se está tentando desativar, pede confirmação
                                            if (editingBarber.is_active) {
                                                if (confirm(`⚠️ ATENÇÃO: Deseja realmente DESATIVAR ${editingBarber.name}?\n\nO ${texts.professional.toLowerCase()} ficará "FORA DE OPERAÇÃO" e não aparecerá mais para os clientes.\n\nEsta ação deve ser usada apenas quando o ${texts.professional.toLowerCase()} não trabalha mais no estabelecimento.`)) {
                                                    setEditingBarber({ ...editingBarber, is_active: false });
                                                }
                                            } else {
                                                // Se está reativando, não precisa confirmação
                                                setEditingBarber({ ...editingBarber, is_active: true });
                                            }
                                        }}
                                        className={cn("w-20", editingBarber.is_active ? "bg-emerald-600 hover:bg-emerald-700" : "border-slate-700")}
                                    >
                                        {editingBarber.is_active ? 'Ativo' : 'Inativo'}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2 col-span-2 pt-4 border-t border-slate-800">
                                <Label className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Scissors size={16} className="text-blue-500" />
                                        Serviços Habilitados
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            if (selectedServiceIds.length === services.length) {
                                                setSelectedServiceIds([]);
                                            } else {
                                                setSelectedServiceIds(services.map(s => s.id));
                                            }
                                        }}
                                        className="text-[10px] h-6 uppercase font-black text-blue-500 hover:text-blue-400 hover:bg-blue-500/5 transition-all"
                                    >
                                        {selectedServiceIds.length === services.length ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                                    </Button>
                                </Label>
                                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 max-h-[150px] overflow-y-auto space-y-2">
                                    {loadingServices ? (
                                        <p className="text-xs text-slate-500 text-center">Carregando serviços...</p>
                                    ) : services.length === 0 ? (
                                        <p className="text-xs text-slate-500 text-center">Nenhum serviço cadastrado.</p>
                                    ) : (
                                        services.map(service => (
                                            <div key={service.id} className="flex items-center space-x-2 hover:bg-slate-800/50 p-1 rounded transition-colors">
                                                <Checkbox
                                                    id={`srv-${service.id}`}
                                                    checked={selectedServiceIds.includes(service.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) setSelectedServiceIds([...selectedServiceIds, service.id]);
                                                        else setSelectedServiceIds(selectedServiceIds.filter(id => id !== service.id));
                                                    }}
                                                    className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                />
                                                <Label htmlFor={`srv-${service.id}`} className="text-sm cursor-pointer flex-1 user-select-none">
                                                    {service.name}
                                                </Label>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-500">Selecione quais serviços este {texts.professional.toLowerCase()} pode realizar.</p>
                            </div>

                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={handleUpdateBarber} className="bg-blue-600 hover:bg-blue-700 w-full" disabled={uploading}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Table>
                <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-500 w-[80px]">Foto</TableHead>
                        <TableHead className="text-slate-500">{texts.professional}</TableHead>
                        <TableHead className="text-slate-500">Status</TableHead>
                        <TableHead className="text-slate-500">Atendimento</TableHead>
                        <TableHead className="text-slate-500 text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Carregando...</TableCell></TableRow>
                    ) : filteredBarbers.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhum {texts.professional.toLowerCase()} {showInactive ? 'inativo' : 'ativo'} encontrado.</TableCell></TableRow>
                    ) : filteredBarbers.map((b) => (
                        <TableRow key={b.id} className={cn("border-slate-800 group hover:bg-slate-900/50 transition-colors", !b.is_active && "opacity-50")}>
                            <TableCell>
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700">
                                    {b.photo_url ? (
                                        <Image src={b.photo_url} alt={b.name} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                                    ) : (
                                        <Users size={16} className="text-slate-600" />
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-100 uppercase tracking-tighter">{b.nickname || b.name}</span>
                                    {b.nickname && <span className="text-[10px] text-slate-500">{b.name}</span>}
                                    {!b.is_active && <span className="text-[10px] text-red-500 font-bold uppercase">Fora de Operação</span>}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase w-fit",
                                    (b.is_active && (b.status === 'available' || b.status === 'busy'))
                                        ? "bg-emerald-500/10 text-emerald-500"
                                        : "bg-red-500/10 text-red-500"
                                )}>
                                    <div className={cn("w-1.5 h-1.5 rounded-full", (b.is_active && (b.status === 'available' || b.status === 'busy')) ? "bg-emerald-500" : "bg-red-500")} />
                                    {(b.is_active && (b.status === 'available' || b.status === 'busy')) ? 'Online' : 'Offline'}
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className={cn(
                                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                    !b.is_active ? "text-slate-600" :
                                        b.status === 'available' ? "text-slate-500" :
                                            b.status === 'busy' ? "bg-yellow-500/10 text-yellow-500" : "text-slate-600"
                                )}>
                                    {!b.is_active ? 'Inativo' :
                                        b.status === 'available' ? 'Livre' :
                                            b.status === 'busy' ? 'Atendendo' : '---'}
                                </span>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenClosing(b)}
                                    className="bg-blue-600/10 text-blue-500 border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all text-[10px] font-bold uppercase h-8"
                                >
                                    <FileText size={14} className="mr-1.5" />
                                    Fechar Caixa
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={async () => {
                                        setEditingBarber(b);
                                        setIsEditOpen(true);
                                        // Load services
                                        setLoadingServices(true);
                                        try {
                                            const ids = await Api.getBarberServices(b.id);
                                            setSelectedServiceIds(ids || []);
                                        } catch (e) {
                                            console.error(e);
                                            setSelectedServiceIds([]);
                                        } finally {
                                            setLoadingServices(false);
                                        }
                                    }}
                                    className="text-slate-600 hover:text-white transition-colors"
                                >
                                    <Edit size={16} />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {showClosingDialog && closingBarber && (
                <BarberClosingDialog
                    isOpen={showClosingDialog}
                    onClose={() => setShowClosingDialog(false)}
                    barberName={closingBarber.name}
                    barberId={closingBarber.id}
                    sales={closingSales}
                    onConfirm={handleConfirmClosing}
                    loading={closingLoading}
                />
            )}
        </div>
    );
}
