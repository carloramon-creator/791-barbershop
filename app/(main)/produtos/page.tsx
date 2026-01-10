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
import { Plus, Trash2, Edit, ShoppingBag, Tag, FolderPlus } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { Product, ProductCategory } from '@/lib/types';

export default function ProdutosPage() {
    const [produtos, setProdutos] = useState<Product[]>([]);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', price: '', category_id: '' });
    const [newCategoryName, setNewCategoryName] = useState('');
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

    const fetchCategories = async () => {
        try {
            const data = await Api.getProductCategories();
            setCategories(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchProdutos();
        fetchCategories();
    }, []);

    const handleAddProduct = async () => {
        try {
            if (!newProduct.name || !newProduct.price) return alert('Preencha todos os campos');
            await Api.createProduct({
                name: newProduct.name,
                price: parseFloat(newProduct.price),
                category_id: newProduct.category_id || null
            });
            setIsDialogOpen(false);
            setNewProduct({ name: '', price: '', category_id: '' });
            fetchProdutos();
        } catch (error: unknown) {
            const err = error as Error;
            alert('Erro ao criar produto: ' + err.message);
        }
    };

    const handleUpdateProduct = async () => {
        try {
            if (!editingProduct || !editingProduct.name || !editingProduct.price)
                return alert('Preencha todos os campos');
            await Api.updateProduct(editingProduct.id, {
                name: editingProduct.name,
                price: parseFloat(editingProduct.price.toString()),
                category_id: editingProduct.category_id || null
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

    const handleAddCategory = async () => {
        try {
            if (!newCategoryName) return alert('Digite o nome da categoria');
            await Api.createProductCategory({ name: newCategoryName });
            setIsCategoryDialogOpen(false);
            setNewCategoryName('');
            fetchCategories();
        } catch (error: unknown) {
            const err = error as Error;
            alert('Erro ao criar categoria: ' + err.message);
        }
    };

    const getCategoryName = (categoryId?: string) => {
        if (!categoryId) return null;
        const category = categories.find(c => c.id === categoryId);
        return category?.name;
    };

    if (role !== 'owner' && role !== 'staff') return <div className="p-8 text-red-500">Acesso restrito.</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
                        <ShoppingBag size={24} className="text-emerald-500" /> Produtos Disponíveis
                    </h1>
                    <p className="text-slate-400 font-medium">Gerencie o estoque e vendas de produtos por categoria.</p>
                </div>

                <div className="flex gap-2">
                    <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-slate-800 text-slate-400 hover:text-white">
                                <FolderPlus size={16} className="mr-2" /> Nova Categoria
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                            <DialogHeader>
                                <DialogTitle>Adicionar Categoria</DialogTitle>
                                <DialogDescription>Crie uma nova categoria para organizar seus produtos.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category-name">Nome da Categoria</Label>
                                    <Input
                                        id="category-name"
                                        placeholder="Ex: Bebidas, Comida, Cosméticos"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddCategory} className="bg-blue-600 hover:bg-blue-700 w-full">Criar Categoria</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

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
                                        step="0.01"
                                        placeholder="35.00"
                                        value={newProduct.price}
                                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Categoria</Label>
                                    <Select value={newProduct.category_id} onValueChange={(value) => setNewProduct({ ...newProduct, category_id: value })}>
                                        <SelectTrigger className="bg-slate-800 border-slate-700">
                                            <SelectValue placeholder="Selecione uma categoria" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                            {categories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                    step="0.01"
                                    value={editingProduct.price}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                                    className="bg-slate-800 border-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-category">Categoria</Label>
                                <Select value={editingProduct.category_id || ''} onValueChange={(value) => setEditingProduct({ ...editingProduct, category_id: value })}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700">
                                        <SelectValue placeholder="Selecione uma categoria" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                        {categories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                        <TableHead className="text-slate-500">Categoria</TableHead>
                        <TableHead className="text-slate-500">Preço</TableHead>
                        <TableHead className="text-slate-500 text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Carregando...</TableCell></TableRow>
                    ) : produtos.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Nenhum produto cadastrado.</TableCell></TableRow>
                    ) : produtos.map((p) => (
                        <TableRow key={p.id} className="border-slate-800 group hover:bg-slate-900/50 transition-colors">
                            <TableCell className="font-bold text-slate-100 uppercase tracking-tighter">{p.name}</TableCell>
                            <TableCell>
                                {getCategoryName(p.category_id) ? (
                                    <Badge variant="outline" className="text-blue-400 border-blue-400/30 bg-blue-400/5">
                                        <Tag size={12} className="mr-1" />
                                        {getCategoryName(p.category_id)}
                                    </Badge>
                                ) : (
                                    <span className="text-slate-600 text-xs">Sem categoria</span>
                                )}
                            </TableCell>
                            <TableCell className="text-blue-400 font-mono font-bold">R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
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
