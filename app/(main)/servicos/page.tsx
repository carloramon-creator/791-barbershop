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
import { Plus, Trash2, Edit, Scissors, Clock, Package } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ProductTreeSelector } from '@/components/products/product-tree-selector';

import { Service, Product, ProductCategory } from '@/lib/types';

export default function ServicosPage() {
    const [servicos, setServicos] = useState<Service[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [newService, setNewService] = useState({
        name: '',
        price: '',
        duration_minutes: '30',
        product_ids: [] as string[]
    });
    const { role, tenant } = useAuth();
    const texts = getBusinessTexts(tenant?.business_type);

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

    const fetchProducts = async () => {
        try {
            const data = await Api.getProducts();
            setProducts(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchCategories = async () => {
        try {
            const data = await Api.getProductCategories();
            setCategories(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchServicos();
        fetchProducts();
        fetchCategories();
    }, []);

    const handleAddService = async () => {
        try {
            if (!newService.name || !newService.price) return alert('Preencha todos os campos obrigatórios');

            const serviceData = {
                name: newService.name,
                price: parseFloat(newService.price),
                duration_minutes: parseInt(newService.duration_minutes) || 30
            };

            const created = await Api.createService(serviceData);

            // Se tem produtos selecionados, vincular
            if (newService.product_ids.length > 0 && created.id) {
                await Api.updateServiceProducts(created.id, newService.product_ids);
            }

            setIsDialogOpen(false);
            setNewService({ name: '', price: '', duration_minutes: '30', product_ids: [] });
            fetchServicos();
        } catch (error: unknown) {
            const err = error as Error;
            alert('Erro ao criar serviço: ' + err.message);
        }
    };

    const handleUpdateService = async () => {
        try {
            if (!editingService || !editingService.name || !editingService.price)
                return alert('Preencha todos os campos obrigatórios');

            await Api.updateService(editingService.id, {
                name: editingService.name,
                price: parseFloat(editingService.price.toString()),
                duration_minutes: editingService.duration_minutes || 30
            });

            // Atualizar produtos vinculados
            if (editingService.product_ids) {
                await Api.updateServiceProducts(editingService.id, editingService.product_ids);
            }

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
            alert(`Erro ao remover ${texts.service.toLowerCase()}: ` + err.message);
        }
    };

    const formatDuration = (minutes?: number) => {
        if (!minutes) return '30 min';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
        }
        return `${mins} min`;
    };

    if (role !== 'owner' && role !== 'staff') return <div className="p-8 text-red-500">Acesso restrito.</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
                        <Scissors size={24} className="text-blue-500" /> Catálogo de {texts.services}
                    </h1>
                    <p className="text-slate-400 font-medium">Defina os {texts.services.toLowerCase()}, duração e produtos utilizados.</p>
                </div>

                <div className="flex gap-2">
                    <Button onClick={fetchServicos} variant="outline" className="border-slate-800 text-slate-400 hover:text-white">
                        Atualizar
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus size={16} className="mr-2" /> Novo {texts.service}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Adicionar {texts.service}</DialogTitle>
                                <DialogDescription>Configure o {texts.service.toLowerCase()}, tempo de duração e produtos utilizados.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="name">Nome do {texts.service} *</Label>
                                        <Input
                                            id="name"
                                            placeholder="Ex: Corte Degradê"
                                            value={newService.name}
                                            onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                            className="bg-slate-800 border-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="price">Preço (R$) *</Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            step="0.01"
                                            placeholder="45.00"
                                            value={newService.price}
                                            onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                                            className="bg-slate-800 border-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Duração (minutos)</Label>
                                        <Input
                                            id="duration"
                                            type="number"
                                            placeholder="30"
                                            value={newService.duration_minutes}
                                            onChange={(e) => setNewService({ ...newService, duration_minutes: e.target.value })}
                                            className="bg-slate-800 border-slate-700"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Package size={16} className="text-blue-500" />
                                        Produtos Utilizados (Opcional)
                                    </Label>
                                    <ProductTreeSelector
                                        products={products}
                                        categories={categories}
                                        selectedProductIds={newService.product_ids}
                                        onSelectionChange={(ids) => setNewService({ ...newService, product_ids: ids })}
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
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar {texts.service}</DialogTitle>
                        <DialogDescription>Atualize as informações do {texts.service.toLowerCase()}.</DialogDescription>
                    </DialogHeader>
                    {editingService && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="edit-name">Nome do {texts.service} *</Label>
                                    <Input
                                        id="edit-name"
                                        value={editingService.name}
                                        onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-price">Preço (R$) *</Label>
                                    <Input
                                        id="edit-price"
                                        type="number"
                                        step="0.01"
                                        value={editingService.price}
                                        onChange={(e) => setEditingService({ ...editingService, price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-duration">Duração (minutos)</Label>
                                    <Input
                                        id="edit-duration"
                                        type="number"
                                        value={editingService.duration_minutes}
                                        onChange={(e) => setEditingService({ ...editingService, duration_minutes: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Package size={16} className="text-blue-500" />
                                    Produtos Utilizados (Opcional)
                                </Label>
                                <ProductTreeSelector
                                    products={products}
                                    categories={categories}
                                    selectedProductIds={editingService.product_ids || []}
                                    onSelectionChange={(ids) => setEditingService({ ...editingService, product_ids: ids })}
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
                        <TableHead className="text-slate-500">{texts.service}</TableHead>
                        <TableHead className="text-slate-500">Duração</TableHead>
                        <TableHead className="text-slate-500">Preço</TableHead>
                        <TableHead className="text-slate-500 text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Carregando...</TableCell></TableRow>
                    ) : servicos.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Nenhum {texts.service.toLowerCase()} cadastrado.</TableCell></TableRow>
                    ) : servicos.map((s) => (
                        <TableRow key={s.id} className="border-slate-800 group hover:bg-slate-900/50 transition-colors">
                            <TableCell className="font-bold text-slate-100 uppercase tracking-tighter">{s.name}</TableCell>
                            <TableCell className="text-blue-400 font-mono text-sm flex items-center gap-1">
                                <Clock size={14} />
                                {formatDuration(s.duration_minutes)}
                            </TableCell>
                            <TableCell className="text-emerald-400 font-mono font-bold">R$ {Number(s.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={async () => {
                                        try {
                                            // Carregar produtos do serviço
                                            const serviceProducts = await Api.getServiceProducts(s.id);
                                            const productIds = serviceProducts.map((sp: any) => sp.product_id);

                                            setEditingService({ ...s, product_ids: productIds });
                                            setIsEditOpen(true);
                                        } catch (error) {
                                            console.error('Erro ao carregar produtos do serviço:', error);
                                            setEditingService({ ...s, product_ids: [] });
                                            setIsEditOpen(true);
                                        }
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
