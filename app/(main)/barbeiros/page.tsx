'use client';

import { useState, useEffect } from 'react';
import { Api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit, Camera, Check, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabaseClient } from '@/lib/supabase-client';

export default function BarbeirosPage() {
    const [barbeiros, setBarbeiros] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBarber, setEditingBarber] = useState<any>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [newBarber, setNewBarber] = useState({
        name: '',
        avg_time_minutes: 30,
        photo_url: '',
        commission_percentage: 0,
        is_active: true
    });
    const { role } = useAuth();

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

    useEffect(() => {
        fetchBarbeiros();
    }, []);

    const handlePhotoUpload = async (file: File, isEdit = false) => {
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

            if (isEdit) {
                setEditingBarber({ ...editingBarber, photo_url: publicUrl });
            } else {
                setNewBarber({ ...newBarber, photo_url: publicUrl });
            }
        } catch (error: any) {
            alert('Erro no upload: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleAddBarber = async () => {
        try {
            if (!newBarber.name) return alert('Nome é obrigatório');
            await Api.createBarber(newBarber);
            setIsDialogOpen(false);
            setNewBarber({
                name: '',
                avg_time_minutes: 30,
                photo_url: '',
                commission_percentage: 0,
                is_active: true
            });
            fetchBarbeiros();
        } catch (error: any) {
            alert('Erro ao criar barbeiro: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleUpdateBarber = async () => {
        try {
            if (!editingBarber.name) return alert('Nome é obrigatório');
            await Api.updateBarber(editingBarber.id, editingBarber);
            setIsEditOpen(false);
            setEditingBarber(null);
            fetchBarbeiros();
        } catch (error: any) {
            alert('Erro ao atualizar barbeiro: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const toggleStatus = async (barber: any) => {
        try {
            const newStatus = !barber.is_active;
            await Api.updateBarber(barber.id, { is_active: newStatus });
            fetchBarbeiros();
        } catch (error: any) {
            alert('Erro ao alterar status: ' + error.message);
        }
    };

    const handleDeleteBarber = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja remover o barbeiro ${name}?`)) return;
        try {
            await Api.deleteBarber(id);
            fetchBarbeiros();
        } catch (error: any) {
            alert('Erro ao remover barbeiro: ' + (error.message || 'Erro desconhecido'));
        }
    };

    if (role !== 'owner') return <div className="p-8 text-red-500">Acesso restrito ao proprietário.</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 italic flex items-center gap-2">
                        <Plus className="text-blue-500" /> Equipe de Barbeiros
                    </h1>
                    <p className="text-slate-400 font-medium">Gerencie os profissionais e suas comissões.</p>
                </div>

                <div className="flex gap-2">
                    <Button onClick={fetchBarbeiros} variant="outline" className="border-slate-800 text-slate-400 hover:text-white">
                        <RefreshCw size={16} className={cn("mr-2", loading && "animate-spin")} />
                        Atualizar
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Novo Barbeiro
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
                            <DialogHeader>
                                <DialogTitle>Adicionar Barbeiro</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 flex justify-center">
                                        <div className="relative group cursor-pointer" onClick={() => document.getElementById('new-photo-input')?.click()}>
                                            <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden">
                                                {newBarber.photo_url ? (
                                                    <img src={newBarber.photo_url} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Camera size={24} className="text-slate-600 group-hover:text-blue-500 transition-colors" />
                                                )}
                                            </div>
                                            <input
                                                id="new-photo-input"
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                                            />
                                            {uploading && <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center rounded-full"><RefreshCw className="animate-spin" /></div>}
                                        </div>
                                    </div>

                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="name">Nome Completo</Label>
                                        <Input
                                            id="name"
                                            placeholder="Ex: João Silva"
                                            value={newBarber.name}
                                            onChange={(e) => setNewBarber({ ...newBarber, name: e.target.value })}
                                            className="bg-slate-800 border-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="time">Média (min)</Label>
                                        <Input
                                            id="time"
                                            type="number"
                                            value={newBarber.avg_time_minutes}
                                            onChange={(e) => setNewBarber({ ...newBarber, avg_time_minutes: parseInt(e.target.value) || 0 })}
                                            className="bg-slate-800 border-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="commission">Comissão (%)</Label>
                                        <Input
                                            id="commission"
                                            type="number"
                                            placeholder="0"
                                            value={newBarber.commission_percentage}
                                            onChange={(e) => setNewBarber({ ...newBarber, commission_percentage: parseFloat(e.target.value) || 0 })}
                                            className="bg-slate-800 border-slate-700"
                                        />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddBarber} className="bg-blue-600 hover:bg-blue-700 w-full" disabled={uploading}>Salvar Barbeiro</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Dialog de Edição */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Barbeiro</DialogTitle>
                    </DialogHeader>
                    {editingBarber && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 flex justify-center">
                                    <div className="relative group cursor-pointer" onClick={() => document.getElementById('edit-photo-input')?.click()}>
                                        <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden">
                                            {editingBarber.photo_url ? (
                                                <img src={editingBarber.photo_url} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <Camera size={24} className="text-slate-600 group-hover:text-blue-500 transition-colors" />
                                            )}
                                        </div>
                                        <input
                                            id="edit-photo-input"
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], true)}
                                        />
                                        {uploading && <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center rounded-full"><RefreshCw className="animate-spin" /></div>}
                                    </div>
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="edit-name">Nome Completo</Label>
                                    <Input
                                        id="edit-name"
                                        value={editingBarber.name}
                                        onChange={(e) => setEditingBarber({ ...editingBarber, name: e.target.value })}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-time">Média (min)</Label>
                                    <Input
                                        id="edit-time"
                                        type="number"
                                        value={editingBarber.avg_time_minutes}
                                        onChange={(e) => setEditingBarber({ ...editingBarber, avg_time_minutes: parseInt(e.target.value) || 0 })}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-commission">Comissão (%)</Label>
                                    <Input
                                        id="edit-commission"
                                        type="number"
                                        value={editingBarber.commission_percentage || 0}
                                        onChange={(e) => setEditingBarber({ ...editingBarber, commission_percentage: parseFloat(e.target.value) || 0 })}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                                <div className="flex items-center space-x-2 col-span-2 pt-2">
                                    <Label className="flex-1">Barbeiro Ativo (Disponível na lista)</Label>
                                    <Button
                                        variant={editingBarber.is_active ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setEditingBarber({ ...editingBarber, is_active: !editingBarber.is_active })}
                                        className={cn("w-20", editingBarber.is_active ? "bg-emerald-600 hover:bg-emerald-700" : "border-slate-700")}
                                    >
                                        {editingBarber.is_active ? 'Ativo' : 'Inativo'}
                                    </Button>
                                </div>
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
                        <TableHead className="text-slate-500">Barbeiro</TableHead>
                        <TableHead className="text-slate-500">Média</TableHead>
                        <TableHead className="text-slate-500">Comissão</TableHead>
                        <TableHead className="text-slate-500">Status</TableHead>
                        <TableHead className="text-slate-500">Atendimento</TableHead>
                        <TableHead className="text-slate-500 text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Carregando...</TableCell></TableRow>
                    ) : barbeiros.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Nenhum barbeiro cadastrado.</TableCell></TableRow>
                    ) : barbeiros.map((b) => (
                        <TableRow key={b.id} className={cn("border-slate-800 group hover:bg-slate-900/50 transition-colors", !b.is_active && "opacity-50")}>
                            <TableCell>
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700">
                                    {b.photo_url ? (
                                        <img src={b.photo_url} alt={b.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Plus size={16} className="text-slate-600" />
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-100 uppercase tracking-tighter">{b.name}</span>
                                    {!b.is_active && <span className="text-[10px] text-red-500 font-bold uppercase">Fora de Operação</span>}
                                </div>
                            </TableCell>
                            <TableCell className="text-slate-400 font-mono">{b.avg_time_minutes} min</TableCell>
                            <TableCell className="text-blue-400 font-bold">{b.commission_percentage}%</TableCell>
                            <TableCell>
                                <button
                                    onClick={() => toggleStatus(b)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all",
                                        b.is_active
                                            ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                                            : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                    )}
                                >
                                    {b.is_active ? <Check size={10} /> : <X size={10} />}
                                    {b.is_active ? 'Online' : 'Pausa / Almoço'}
                                </button>
                            </TableCell>
                            <TableCell>
                                <span className={cn(
                                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                    b.status === 'available' ? "text-slate-500" : "bg-blue-500/10 text-blue-500"
                                )}>
                                    {b.status === 'available' ? 'Livre' : 'Ocupado'}
                                </span>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setEditingBarber(b);
                                        setIsEditOpen(true);
                                    }}
                                    className="text-slate-600 hover:text-white transition-colors"
                                >
                                    <Edit size={16} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteBarber(b.id, b.name)}
                                    className="text-slate-600 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
