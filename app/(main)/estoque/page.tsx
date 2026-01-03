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
import { Plus, ShoppingBag, History, TrendingUp, TrendingDown, DollarSign, Package, Loader2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function EstoquePage() {
    const [products, setProducts] = useState<any[]>([]);
    const [movements, setMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProductListLoading, setIsProductListLoading] = useState(true);
    const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Purchase Form
    const [purchase, setPurchase] = useState({
        product_id: '',
        quantity: '',
        cost_price: '',
        description: 'Compra de estoque'
    });

    const { role, tenant } = useAuth();
    const isPremium = tenant?.plan === 'premium';

    const fetchData = async () => {
        try {
            setLoading(true);
            const [prods, moves] = await Promise.all([
                Api.getProducts(),
                Api.getInventory()
            ]);
            setProducts(prods || []);
            setMovements(moves || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setIsProductListLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePurchase = async () => {
        try {
            if (!purchase.product_id || !purchase.quantity || !purchase.cost_price) {
                return alert('Por favor, preencha todos os campos obrigatórios.');
            }

            setSubmitting(true);
            await Api.createMovement({
                product_id: purchase.product_id,
                type: 'entry',
                quantity: parseInt(purchase.quantity),
                cost_price: parseFloat(purchase.cost_price),
                description: purchase.description
            });

            setIsEntryDialogOpen(false);
            setPurchase({ product_id: '', quantity: '', cost_price: '', description: 'Compra de estoque' });
            fetchData();
            alert('Entrada de estoque realizada com sucesso!');
        } catch (error: any) {
            alert('Erro ao realizar compra: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isPremium) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="p-4 bg-blue-500/10 rounded-full">
                    <Package size={48} className="text-blue-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-100">Módulo de Estoque</h1>
                <p className="text-slate-400 text-center max-w-md">
                    O gerenciamento de estoque está disponível exclusivamente para assinantes do plano <span className="text-blue-400 font-bold uppercase">Premium</span>.
                </p>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <a href="/configuracoes/plano">Ver Planos</a>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 italic flex items-center gap-2">
                        <Package size={24} className="text-blue-500" /> Gestão de Estoque
                    </h1>
                    <p className="text-slate-400 font-medium">Controle de entradas, saídas e custos de mercadoria.</p>
                </div>

                <div className="flex gap-2">
                    <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus size={16} className="mr-2" /> Registrar Compra (Entrada)
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                            <DialogHeader>
                                <DialogTitle>Entrada de Produtos</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Selecione o Produto</Label>
                                    <Select
                                        value={purchase.product_id}
                                        onValueChange={(v) => setPurchase({ ...purchase, product_id: v })}
                                    >
                                        <SelectTrigger className="bg-slate-800 border-slate-700">
                                            <SelectValue placeholder="Selecione um produto..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                            {products.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">Quantidade</Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            placeholder="Ex: 10"
                                            value={purchase.quantity}
                                            onChange={(e) => setPurchase({ ...purchase, quantity: e.target.value })}
                                            className="bg-slate-800 border-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cost">Preço de Custo Unitário (R$)</Label>
                                        <Input
                                            id="cost"
                                            type="number"
                                            placeholder="Ex: 15.00"
                                            value={purchase.cost_price}
                                            onChange={(e) => setPurchase({ ...purchase, cost_price: e.target.value })}
                                            className="bg-slate-800 border-slate-700"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="desc">Observação</Label>
                                    <Input
                                        id="desc"
                                        value={purchase.description}
                                        onChange={(e) => setPurchase({ ...purchase, description: e.target.value })}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    onClick={handlePurchase}
                                    disabled={submitting}
                                    className="bg-blue-600 hover:bg-blue-700 w-full"
                                >
                                    {submitting ? <Loader2 className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                                    Confirmar Entrada
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Total em Estoque (Itens)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-100">
                            {products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Valor Investido (Custo)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-500">
                            R$ {products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.cost_price || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Valor Potencial (Venda)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-500">
                            R$ {products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.price || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Lucro Estimado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-500">
                            R$ {(products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.price || 0)), 0) - products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.cost_price || 0)), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center gap-2">
                            <ShoppingBag size={18} className="text-blue-500" />
                            <h2 className="font-bold text-slate-100 uppercase tracking-tighter">Status Atual do Estoque</h2>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-800 hover:bg-transparent bg-slate-950/50">
                                    <TableHead className="text-slate-400">Produto</TableHead>
                                    <TableHead className="text-slate-400">Qtd.</TableHead>
                                    <TableHead className="text-slate-400">Custo Unit.</TableHead>
                                    <TableHead className="text-slate-400">Venda Unit.</TableHead>
                                    <TableHead className="text-slate-400 text-right">Patrimônio</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                                ) : products.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhum produto cadastrado.</TableCell></TableRow>
                                ) : products.map((p) => (
                                    <TableRow key={p.id} className="border-slate-800 group hover:bg-slate-800/30 transition-colors">
                                        <TableCell className="font-bold text-slate-200 uppercase tracking-tighter">{p.name}</TableCell>
                                        <TableCell>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-xs font-bold",
                                                (p.stock_quantity || 0) <= 5 ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                                            )}>
                                                {p.stock_quantity || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-400">R$ {Number(p.cost_price || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-blue-400">R$ {Number(p.price || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-emerald-500">
                                            R$ {((p.stock_quantity || 0) * (p.cost_price || 0)).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center gap-2">
                            <History size={18} className="text-blue-500" />
                            <h2 className="font-bold text-slate-100 uppercase tracking-tighter">Últimas Movimentações</h2>
                        </div>
                        <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-slate-500" /></div>
                            ) : movements.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm">Nenhuma movimentação registrada.</div>
                            ) : movements.map((m) => (
                                <div key={m.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-sm font-bold text-slate-200 uppercase tracking-tighter truncate max-w-[150px]">
                                            {m.products?.name}
                                        </span>
                                        <span className={cn(
                                            "flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                                            m.type === 'entry' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                                        )}>
                                            {m.type === 'entry' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                            {m.type === 'entry' ? 'Entrada' : 'Saída'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-[10px] text-slate-500">
                                            {new Date(m.created_at).toLocaleDateString('pt-BR')} às {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-sm font-bold text-slate-100">
                                            {m.type === 'entry' ? '+' : '-'}{m.quantity} un
                                        </div>
                                    </div>
                                    {m.type === 'entry' && m.cost_price && (
                                        <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                                            <DollarSign size={8} /> Custo: R$ {Number(m.cost_price).toFixed(2)} / un
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
