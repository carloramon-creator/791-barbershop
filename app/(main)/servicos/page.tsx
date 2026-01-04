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
import { Plus, Trash2, Edit, Scissors } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

import { Service } from '@/lib/types';

export default function ServicosPage() {
    const [servicos, setServicos] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [newService, setNewService] = useState({ name: '', price: '' });
    const { role } = useAuth();

    const fetchServicos = async () => {
        try {
            const data = await Api.getServices();
            setServicos(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServicos();
    }, []);

    const handleAddService = async () => {
        try {
            if (!newService.name || !newService.price) return alert('Preecha todos os campos');
            await Api.createService({
                name: newService.name,
                price: parseFloat(newService.price)
            });
            setIsDialogOpen(false);
            setNewService({ name: '', price: '' });
            fetchServicos();
        } catch (error: unknown) {
            const err = error as Error;
            alert('Erro ao criar serviço: ' + err.message);
        }
    };

    const handleUpdateService = async () => {
        try {
            if (!editingService || !editingService.name || !editingService.price) return alert('Preecha todos os campos');
            await Api.updateService(editingService.id, {
                name: editingService.name,
                price: parseFloat(editingService.price.toString())
            });
            setIsEditOpen(false);
            setEditingService(null);
            fetchServicos();
        } catch (error: unknown) {
            const err = error as Error;
            alert('Erro ao atualizar serviço: ' + err.message);
        }
    };

    const handleDeleteService = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja remover o serviço ${name}?`)) return;
        try {
            await Api.deleteService(id);
            fetchServicos();
        } catch (error: unknown) {
            const err = error as Error;
            alert('Erro ao remover serviço: ' + err.message);
        }
    };

    if (role !== 'owner' && role !== 'staff') return <div className="p-8 text-red-500">Acesso restrito.</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 italic flex items-center gap-2">
                        <Scissors size={24} className="text-blue-500" /> Catálogo de Serviços
                    </h1>
                    <p className="text-slate-400 font-medium">Defina os serviços e preços da sua barbearia.</p>
                </div>

                <div className="flex gap-2">
                    <Button onClick={fetchServicos} variant="outline" className="border-slate-800 text-slate-400 hover:text-white">
                        Atualizar
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus size={16} className="mr-2" /> Novo Serviço
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                            <DialogHeader>
                                <DialogTitle>Adicionar Serviço</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome do Serviço</Label>
                                    <Input
                                        id="name"
                                        placeholder="Ex: Corte Degradê"
                                        value={newService.name}
                                        onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="price">Preço (R$)</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        placeholder="45.00"
                                        value={newService.price}
                                        onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddService} className="bg-blue-600 hover:bg-blue-700 w-full">Salvar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Dialog de Edição */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <DialogTitle>Editar Serviço</DialogTitle>
                    </DialogHeader>
                    {editingService && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Nome do Serviço</Label>
                                <Input
                                    id="edit-name"
                                    value={editingService.name}
                                    onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                                    className="bg-slate-800 border-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-price">Preço (R$)</Label>
                                <Input
                                    id="edit-price"
                                    type="number"
                                    value={editingService.price}
                                    onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })}
                                    className="bg-slate-800 border-slate-700"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={handleUpdateService} className="bg-blue-600 hover:bg-blue-700 w-full">Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Table>
                <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-500">Serviço</TableHead>
                        <TableHead className="text-slate-500">Preço</TableHead>
                        <TableHead className="text-slate-500 text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-500">Carregando...</TableCell></TableRow>
                    ) : servicos.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-500">Nenhum serviço cadastrado.</TableCell></TableRow>
                    ) : servicos.map((s) => (
                        <TableRow key={s.id} className="border-slate-800 group hover:bg-slate-900/50 transition-colors">
                            <TableCell className="font-bold text-slate-100 uppercase tracking-tighter">{s.name}</TableCell>
                            <TableCell className="text-emerald-400 font-mono font-bold">R$ {Number(s.price).toFixed(2)}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setEditingService(s);
                                        setIsEditOpen(true);
                                    }}
                                    className="text-slate-600 hover:text-white transition-colors"
                                >
                                    <Edit size={16} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteService(s.id, s.name)}
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
