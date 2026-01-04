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
import { Plus, Trash2, Edit, ShoppingBag } from 'lucide-react';
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

import { Product } from '@/lib/types';

export default function ProdutosPage() {
    const [produtos, setProdutos] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', price: '' });
    const { role } = useAuth();

    const fetchProdutos = async () => {
        try {
            const data = await Api.getProducts();
            setProdutos(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProdutos();
    }, []);

    const handleAddProduct = async () => {
        try {
            if (!newProduct.name || !newProduct.price) return alert('Preencha todos os campos');
            await Api.createProduct({
                name: newProduct.name,
                price: parseFloat(newProduct.price)
            });
            setIsDialogOpen(false);
            setNewProduct({ name: '', price: '' });
            fetchProdutos();
        } catch (error: unknown) {
            const err = error as Error;
            alert('Erro ao criar produto: ' + err.message);
        }
    };
    const handleUpdateProduct = async () => {
        try {
            if (!editingProduct || !editingProduct.name || !editingProduct.price) return alert('Preencha todos os campos');
            await Api.updateProduct(editingProduct.id, {
                name: editingProduct.name,
                price: parseFloat(editingProduct.price.toString())
            });
            setIsEditOpen(false);
            setEditingProduct(null);
            fetchProdutos();
        } catch (error: unknown) {
            const err = error as Error;
            alert('Erro ao atualizar produto: ' + err.message);
        }
    };

    const handleDeleteProduct = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja remover o produto ${name}?`)) return;
        try {
            await Api.deleteProduct(id);
            fetchProdutos();
        } catch (error: unknown) {
            const err = error as Error;
            alert('Erro ao remover produto: ' + err.message);
        }
    };

    if (role !== 'owner' && role !== 'staff') return <div className="p-8 text-red-500">Acesso restrito.</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 italic flex items-center gap-2">
                        <ShoppingBag size={24} className="text-emerald-500" /> Produtos Disponíveis
                    </h1>
                    <p className="text-slate-400 font-medium">Gerencie o estoque e vendas de produtos.</p>
                </div>

                <div className="flex gap-2">
                    <Button onClick={fetchProdutos} variant="outline" className="border-slate-800 text-slate-400 hover:text-white">
                        Atualizar
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-emerald-600 hover:bg-emerald-700">
                                <Plus size={16} className="mr-2" /> Novo Produto
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                            <DialogHeader>
                                <DialogTitle>Adicionar Produto</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome do Produto</Label>
                                    <Input
                                        id="name"
                                        placeholder="Ex: Pomada Modeladora"
                                        value={newProduct.name}
                                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="price">Preço (R$)</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        placeholder="35.00"
                                        value={newProduct.price}
                                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddProduct} className="bg-emerald-600 hover:bg-emerald-700 w-full">Salvar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Dialog de Edição */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <DialogTitle>Editar Produto</DialogTitle>
                    </DialogHeader>
                    {editingProduct && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Nome do Produto</Label>
                                <Input
                                    id="edit-name"
                                    value={editingProduct.name}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                    className="bg-slate-800 border-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-price">Preço (R$)</Label>
                                <Input
                                    id="edit-price"
                                    type="number"
                                    value={editingProduct.price}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                                    className="bg-slate-800 border-slate-700"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={handleUpdateProduct} className="bg-emerald-600 hover:bg-emerald-700 w-full">Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Table>
                <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-500">Produto</TableHead>
                        <TableHead className="text-slate-500">Preço</TableHead>
                        <TableHead className="text-slate-500 text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-500">Carregando...</TableCell></TableRow>
                    ) : produtos.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-500">Nenhum produto cadastrado.</TableCell></TableRow>
                    ) : produtos.map((p) => (
                        <TableRow key={p.id} className="border-slate-800 group hover:bg-slate-900/50 transition-colors">
                            <TableCell className="font-bold text-slate-100 uppercase tracking-tighter">{p.name}</TableCell>
                            <TableCell className="text-blue-400 font-mono font-bold">R$ {Number(p.price).toFixed(2)}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setEditingProduct(p);
                                        setIsEditOpen(true);
                                    }}
                                    className="text-slate-600 hover:text-white transition-colors"
                                >
                                    <Edit size={16} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteProduct(p.id, p.name)}
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
