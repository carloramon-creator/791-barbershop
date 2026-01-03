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
import { Plus, ShoppingBag, History, TrendingUp, TrendingDown, DollarSign, Package, Loader2, Sparkles, AlertCircle } from 'lucide-react';
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
    const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showNewProductForm, setShowNewProductForm] = useState(false);

    // Purchase Form
    const [purchase, setPurchase] = useState({
        product_id: '',
        quantity: '',
        cost_price: '',
        description: 'Compra de estoque'
    });

    // Quick New Product Form
    const [quickProduct, setQuickProduct] = useState({
        name: '',
        sell_price: ''
    });

    const { role, tenant } = useAuth();
    const isPremium = tenant?.plan === 'premium';

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch products
            try {
                const prods = await Api.getProducts();
                console.log('[DEBUG] Products fetched:', prods?.length);
                setProducts(prods || []);
            } catch (err: any) {
                console.error("Erro ao buscar produtos:", err);
            }

            // Fetch inventory
            try {
                const moves = await Api.getInventory();
                console.log('[DEBUG] Movements fetched:', moves?.length);
                setMovements(moves || []);
            } catch (err: any) {
                console.error("Erro ao buscar inventário:", err);
                // Se falhar o inventário (provavelmente SQL não rodado ou plano), 
                // mantemos movimentos como vazio mas não travamos a página.
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePurchase = async () => {
        try {
            if (showNewProductForm) {
                // First create product, then movement
                if (!quickProduct.name || !quickProduct.sell_price || !purchase.quantity || !purchase.cost_price) {
                    return alert('Por favor, preencha todos os campos do novo produto e os dados de compra.');
                }

                setSubmitting(true);
                const newProd = await Api.createProduct({
                    name: quickProduct.name,
                    price: parseFloat(quickProduct.sell_price)
                });

                await Api.createMovement({
                    product_id: newProd.id,
                    type: 'entry',
                    quantity: parseInt(purchase.quantity),
                    cost_price: parseFloat(purchase.cost_price),
                    description: purchase.description
                });
            } else {
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
            }

            setIsEntryDialogOpen(false);
            resetForms();
            fetchData();
            alert('Operação realizada com sucesso!');
        } catch (error: any) {
            alert('Erro ao realizar operação: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const resetForms = () => {
        setPurchase({ product_id: '', quantity: '', cost_price: '', description: 'Compra de estoque' });
        setQuickProduct({ name: '', sell_price: '' });
        setShowNewProductForm(false);
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
                    <Dialog open={isEntryDialogOpen} onOpenChange={(val) => {
                        setIsEntryDialogOpen(val);
                        if (!val) resetForms();
                    }}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                                <Plus size={16} className="mr-2" /> Registrar Compra (Entrada)
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-blue-400" />
                                    Registrar Entrada de Estoque
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                {!showNewProductForm ? (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label>Selecione o Produto</Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowNewProductForm(true)}
                                                    className="h-7 text-[11px] text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                                >
                                                    + Criar Novo Produto
                                                </Button>
                                            </div>
                                            <Select
                                                value={purchase.product_id}
                                                onValueChange={(v) => setPurchase({ ...purchase, product_id: v })}
                                            >
                                                <SelectTrigger className="bg-slate-800 border-slate-700 h-11">
                                                    <SelectValue placeholder="Busque um produto cadastrado..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                                    {products.length === 0 ? (
                                                        <SelectItem value="no-products" disabled>Nenhum produto encontrado</SelectItem>
                                                    ) : (
                                                        products.map(p => (
                                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 transition-all">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                                                <ShoppingBag size={14} /> Novo Cadastro Rápido
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowNewProductForm(false)}
                                                className="h-6 text-[10px] text-slate-400 hover:text-white"
                                            >
                                                Cancelar
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[11px] text-slate-400">Nome do Produto</Label>
                                            <Input
                                                placeholder="Ex: Cera Matte Premium"
                                                value={quickProduct.name}
                                                onChange={(e) => setQuickProduct({ ...quickProduct, name: e.target.value })}
                                                className="bg-slate-800 border-slate-700 h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[11px] text-slate-400">Preço Sugerido de Venda (R$)</Label>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={quickProduct.sell_price}
                                                onChange={(e) => setQuickProduct({ ...quickProduct, sell_price: e.target.value })}
                                                className="bg-slate-800 border-slate-700 h-10 font-bold text-blue-400"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">Quantidade Comprada</Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            placeholder="Ex: 50"
                                            value={purchase.quantity}
                                            onChange={(e) => setPurchase({ ...purchase, quantity: e.target.value })}
                                            className="bg-slate-800 border-slate-700 h-11"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cost">Custo Unitário Pago (R$)</Label>
                                        <Input
                                            id="cost"
                                            type="number"
                                            placeholder="0.00"
                                            value={purchase.cost_price}
                                            onChange={(e) => setPurchase({ ...purchase, cost_price: e.target.value })}
                                            className="bg-slate-800 border-slate-700 h-11 text-emerald-400 font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="desc">Nota/Observação (Opcional)</Label>
                                    <Input
                                        id="desc"
                                        value={purchase.description}
                                        onChange={(e) => setPurchase({ ...purchase, description: e.target.value })}
                                        className="bg-slate-800 border-slate-700 h-11 italic"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    onClick={handlePurchase}
                                    disabled={submitting}
                                    className="bg-blue-600 hover:bg-blue-700 w-full h-12 text-md font-bold"
                                >
                                    {submitting ? <Loader2 className="animate-spin mr-2" /> : <Plus size={18} className="mr-2" />}
                                    {showNewProductForm ? 'Cadastrar e Receber Estoque' : 'Confirmar Recebimento'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all border-l-4 border-l-slate-400">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <Package size={16} /> Total em Estoque
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-100">
                            {products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all border-l-4 border-l-emerald-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <DollarSign size={16} /> Valor em Custo
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-500">
                            R$ {products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.cost_price || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <TrendingUp size={16} /> Potencial de Venda
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-500">
                            R$ {products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.price || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <Sparkles size={16} /> Margem Bruta (Est.)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-500">
                            R$ {(products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.price || 0)), 0) - products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.cost_price || 0)), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                        <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingBag size={18} className="text-blue-500" />
                                <h2 className="font-bold text-slate-100 uppercase tracking-tighter">Inventário Detalhado</h2>
                            </div>
                            <Button onClick={fetchData} variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-white">
                                <Loader2 className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Atualizar Lista
                            </Button>
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
                                {loading && products.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-500"><Loader2 className="animate-spin mx-auto w-8 h-8 opacity-20" /></TableCell></TableRow>
                                ) : products.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-500">
                                        <AlertCircle size={32} className="mx-auto mb-2 opacity-20" />
                                        Nenhum produto cadastrado para gestão.
                                    </TableCell></TableRow>
                                ) : products.map((p) => (
                                    <TableRow key={p.id} className="border-slate-800 group hover:bg-slate-800/30 transition-colors">
                                        <TableCell className="font-bold text-slate-100 uppercase tracking-tighter py-4">
                                            {p.name}
                                            {p.stock_quantity <= 5 && (
                                                <div className="text-[10px] text-red-500 font-bold mt-1">ESTOQUE BAIXO</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-md text-xs font-bold",
                                                (p.stock_quantity || 0) <= 5 ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                            )}>
                                                {p.stock_quantity || 0} un
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-400">R$ {Number(p.cost_price || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-blue-400">R$ {Number(p.price || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-emerald-500 pr-6">
                                            R$ {((p.stock_quantity || 0) * (p.cost_price || 0)).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                        <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center gap-2">
                            <History size={18} className="text-blue-500" />
                            <h2 className="font-bold text-slate-100 uppercase tracking-tighter">Log de Movimentos</h2>
                        </div>
                        <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {loading && movements.length === 0 ? (
                                <div className="p-8 text-center text-slate-500"><Loader2 className="animate-spin mx-auto opacity-20" /></div>
                            ) : movements.length === 0 ? (
                                <div className="p-12 text-center text-slate-500 text-sm">Nenhuma movimentação para exibir.</div>
                            ) : movements.map((m) => (
                                <div key={m.id} className="p-4 hover:bg-slate-800/30 transition-all border-l-2 border-transparent hover:border-blue-500">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-sm font-bold text-slate-100 uppercase tracking-tighter truncate max-w-[150px]">
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
                                            {new Date(m.created_at).toLocaleDateString('pt-BR')} • {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className={cn("text-sm font-bold", m.type === 'entry' ? "text-emerald-500" : "text-red-500")}>
                                            {m.type === 'entry' ? '+' : '-'}{m.quantity} un
                                        </div>
                                    </div>
                                    {m.type === 'entry' ? (
                                        <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1 bg-slate-800/50 p-1.5 rounded border border-slate-700/50">
                                            <div className="flex-1 flex items-center gap-1"><DollarSign size={8} /> Custo Unit: R$ {Number(m.cost_price).toFixed(2)}</div>
                                            <div className="text-slate-500">|</div>
                                            <div className="flex-1 text-right">Total: R$ {Number(m.cost_price * m.quantity).toFixed(2)}</div>
                                        </div>
                                    ) : (
                                        <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1 bg-slate-800/50 p-1.5 rounded border border-slate-700/50">
                                            <div className="flex-1 flex items-center gap-1"><DollarSign size={8} /> Preço Venda: R$ {Number(m.price).toFixed(2)}</div>
                                            <div className="text-slate-500">|</div>
                                            <div className="flex-1 text-right text-emerald-400">Total: R$ {Number(m.price * m.quantity).toFixed(2)}</div>
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
