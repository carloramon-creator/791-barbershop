'use client';

import { useEffect, useState } from 'react';
import { Api } from '@/lib/api';
import { HoldingCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Edit2, Tag } from 'lucide-react';
import { toast } from 'sonner';

export function CategoriesManager() {
    const [categories, setCategories] = useState<HoldingCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');

    // Form
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [color, setColor] = useState('#94a3b8');
    const [parentId, setParentId] = useState<string | null>('none');

    useEffect(() => {
        loadCategories();
    }, []);

    async function loadCategories() {
        try {
            const data = await Api.getHoldingCategories(); // Fetches all
            setCategories(data);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar categorias');
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setEditingId(null);
        setName('');
        setColor('#94a3b8');
        setParentId('none');
    }

    async function handleSubmit() {
        if (!name) return toast.error('Nome obrigatório');

        try {
            const payload = {
                name,
                color,
                type: activeTab,
                parent_id: parentId === 'none' ? null : parentId
            };

            if (editingId) {
                await Api.updateHoldingCategory(editingId, payload);
                toast.success('Categoria atualizada');
            } else {
                await Api.createHoldingCategory(payload);
                toast.success('Categoria criada');
            }
            setIsOpen(false);
            resetForm();
            loadCategories();
        } catch (error: any) {
            toast.error(error.message);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza?')) return;
        try {
            await Api.deleteHoldingCategory(id);
            toast.success('Categoria excluída');
            loadCategories();
        } catch (error: any) {
            toast.error(error.message);
        }
    }

    function startEdit(cat: HoldingCategory) {
        setEditingId(cat.id);
        setName(cat.name);
        setColor(cat.color || '#94a3b8');
        setParentId(cat.parent_id || 'none');
        if (cat.type !== activeTab) setActiveTab(cat.type);
        setIsOpen(true);
    }

    const currentCategories = categories.filter(c => c.type === activeTab);
    const mainCategories = currentCategories.filter(c => !c.parent_id);
    const subCategories = currentCategories.filter(c => c.parent_id);
    const possibleParents = categories.filter(c => c.type === activeTab && !c.parent_id && c.id !== editingId);

    return (
        <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Tag className="text-purple-500" /> Categorias Financeiras
                </CardTitle>
                <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white">
                            <Plus size={16} className="mr-2" /> Nova Categoria
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Editar Categoria' : `Nova Categoria de ${activeTab === 'income' ? 'Receita' : 'Despesa'}`}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome</Label>
                                <Input
                                    value={name} onChange={e => setName(e.target.value)}
                                    className="bg-slate-950 border-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Cor (Etiqueta)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="color"
                                        value={color} onChange={e => setColor(e.target.value)}
                                        className="w-12 h-10 p-1 bg-slate-950 border-slate-700 cursor-pointer"
                                    />
                                    <Input
                                        value={color} onChange={e => setColor(e.target.value)}
                                        className="bg-slate-950 border-slate-700 flex-1 font-mono uppercase"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Subcategoria de...</Label>
                                <Select value={parentId || 'none'} onValueChange={setParentId}>
                                    <SelectTrigger className="bg-slate-950 border-slate-700">
                                        <SelectValue placeholder="Nenhuma (Raiz)" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800">
                                        <SelectItem value="none" className="font-bold text-slate-400">-- Nenhuma (Categoria Principal) --</SelectItem>
                                        {possibleParents.map(parent => (
                                            <SelectItem key={parent.id} value={parent.id}>
                                                {parent.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="w-full bg-purple-600 hover:bg-purple-500 mt-4" onClick={handleSubmit}>
                                Salvar
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
                    <TabsList className="bg-slate-950 mb-4 border border-slate-800">
                        <TabsTrigger value="expense" className="data-[state=active]:bg-red-500/10 data-[state=active]:text-red-500">
                            Saídas / Despesas
                        </TabsTrigger>
                        <TabsTrigger value="income" className="data-[state=active]:bg-green-500/10 data-[state=active]:text-green-500">
                            Entradas / Receitas
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="space-y-2 animate-in fade-in-50">
                        {loading ? <p>Carregando...</p> : (
                            <div className="flex flex-col gap-2">
                                {mainCategories.length === 0 && (
                                    <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                                        Nenhuma categoria cadastrada.
                                    </div>
                                )}
                                {mainCategories.map(cat => {
                                    const subs = subCategories.filter(s => s.parent_id === cat.id);
                                    return (
                                        <div key={cat.id} className="bg-slate-950/30 border border-slate-800/50 rounded-lg p-3">
                                            <div className="flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-3 h-3 rounded-full shadow-lg"
                                                        style={{ backgroundColor: cat.color }}
                                                    />
                                                    <span className="font-semibold text-slate-200">{cat.name}</span>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(cat)}><Edit2 size={12} /></Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-400" onClick={() => handleDelete(cat.id)}><Trash2 size={12} /></Button>
                                                </div>
                                            </div>

                                            {/* Subcategories */}
                                            {subs.length > 0 && (
                                                <div className="mt-2 ml-4 pl-4 border-l border-slate-800 space-y-1">
                                                    {subs.map(sub => (
                                                        <div key={sub.id} className="flex items-center justify-between py-1 px-2 hover:bg-slate-800/40 rounded group/sub">
                                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                                                                {sub.name}
                                                            </div>
                                                            <div className="opacity-0 group-hover/sub:opacity-100 flex gap-1">
                                                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => startEdit(sub)}><Edit2 size={10} /></Button>
                                                                <Button variant="ghost" size="icon" className="h-5 w-5 text-red-500" onClick={() => handleDelete(sub.id)}><Trash2 size={10} /></Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
