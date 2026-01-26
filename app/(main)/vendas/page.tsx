'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { Api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Search, Plus, Trash2, DollarSign, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VendasPage() {
    const { tenant } = useAuth();
    const router = useRouter();

    const [clientes, setClientes] = useState<any[]>([]);
    const [produtos, setProdutos] = useState<any[]>([]);
    const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
    const [carrinho, setCarrinho] = useState<any[]>([]);
    const [descontoPercentual, setDescontoPercentual] = useState(0);
    const [metodoPagamento, setMetodoPagamento] = useState('dinheiro');
    const [loading, setLoading] = useState(false);
    const [buscaCliente, setBuscaCliente] = useState('');
    const [buscaProduto, setBuscaProduto] = useState('');

    // Verificar plano Premium
    useEffect(() => {
        if (tenant && tenant.plan !== 'premium') {
            alert('Módulo de vendas disponível apenas no Plano Premium');
            router.push('/dashboard');
        }
    }, [tenant, router]);

    // Carregar clientes e produtos
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [clientesData, produtosData] = await Promise.all([
                Api.getClientes(),
                Api.getProdutos()
            ]);
            setClientes(clientesData || []);
            setProdutos(produtosData || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
    };

    const adicionarAoCarrinho = (produto: any) => {
        const itemExistente = carrinho.find(item => item.produto_id === produto.id);

        if (itemExistente) {
            setCarrinho(carrinho.map(item =>
                item.produto_id === produto.id
                    ? { ...item, quantidade: item.quantidade + 1 }
                    : item
            ));
        } else {
            setCarrinho([...carrinho, {
                produto_id: produto.id,
                nome: produto.name,
                quantidade: 1,
                preco_unitario: produto.price || 0,
                estoque_disponivel: produto.estoque_atual || 0
            }]);
        }
    };

    const removerDoCarrinho = (produto_id: string) => {
        setCarrinho(carrinho.filter(item => item.produto_id !== produto_id));
    };

    const atualizarQuantidade = (produto_id: string, quantidade: number) => {
        if (quantidade <= 0) {
            removerDoCarrinho(produto_id);
            return;
        }

        setCarrinho(carrinho.map(item =>
            item.produto_id === produto_id
                ? { ...item, quantidade }
                : item
        ));
    };

    const calcularTotais = () => {
        const subtotal = carrinho.reduce((acc, item) =>
            acc + (item.quantidade * item.preco_unitario), 0
        );
        const desconto = (subtotal * descontoPercentual) / 100;
        const total = subtotal - desconto;

        return { subtotal, desconto, total };
    };

    const finalizarVenda = async () => {
        if (carrinho.length === 0) {
            alert('Adicione produtos ao carrinho');
            return;
        }

        try {
            setLoading(true);

            const payload = {
                cliente_id: clienteSelecionado?.id || null,
                produtos: carrinho.map(item => ({
                    produto_id: item.produto_id,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco_unitario
                })),
                desconto_percentual: descontoPercentual,
                metodo_pagamento: metodoPagamento
            };

            const response = await fetch('/api/vendas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao processar venda');
            }

            alert(`Venda finalizada com sucesso! Total: R$ ${data.total.toFixed(2)}`);

            // Limpar formulário
            setCarrinho([]);
            setClienteSelecionado(null);
            setDescontoPercentual(0);
            setMetodoPagamento('dinheiro');

            // Recarregar produtos (estoque atualizado)
            loadData();

        } catch (error: any) {
            alert('Erro: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const { subtotal, desconto, total } = calcularTotais();

    const clientesFiltrados = clientes.filter(c =>
        c.name?.toLowerCase().includes(buscaCliente.toLowerCase()) ||
        c.phone?.includes(buscaCliente)
    );

    const produtosFiltrados = produtos.filter(p =>
        p.name?.toLowerCase().includes(buscaProduto.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tight">Vendas</h1>
                    <p className="text-slate-500 font-medium">Venda direta de produtos</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <ShoppingCart className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-bold text-emerald-500">{carrinho.length} itens</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna Esquerda: Seleção */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Cliente */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-slate-100 text-lg">Cliente (Opcional)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input
                                    placeholder="Buscar cliente por nome ou telefone..."
                                    value={buscaCliente}
                                    onChange={(e) => setBuscaCliente(e.target.value)}
                                    className="pl-10 bg-slate-950 border-slate-800 text-slate-100"
                                />
                            </div>

                            {clienteSelecionado ? (
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-slate-100">{clienteSelecionado.name}</p>
                                        <p className="text-xs text-slate-400">{clienteSelecionado.phone}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setClienteSelecionado(null)}
                                        className="text-red-500 hover:text-red-400"
                                    >
                                        Remover
                                    </Button>
                                </div>
                            ) : (
                                <div className="max-h-40 overflow-y-auto space-y-2">
                                    {clientesFiltrados.slice(0, 5).map(cliente => (
                                        <button
                                            key={cliente.id}
                                            onClick={() => setClienteSelecionado(cliente)}
                                            className="w-full p-2 text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
                                        >
                                            <p className="text-sm font-bold text-slate-200">{cliente.name}</p>
                                            <p className="text-xs text-slate-500">{cliente.phone}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Produtos */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-slate-100 text-lg">Produtos</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input
                                    placeholder="Buscar produto..."
                                    value={buscaProduto}
                                    onChange={(e) => setBuscaProduto(e.target.value)}
                                    className="pl-10 bg-slate-950 border-slate-800 text-slate-100"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                {produtosFiltrados.map(produto => (
                                    <button
                                        key={produto.id}
                                        onClick={() => adicionarAoCarrinho(produto)}
                                        disabled={(produto.estoque_atual || 0) <= 0}
                                        className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <p className="text-sm font-bold text-slate-200 truncate">{produto.name}</p>
                                        <p className="text-xs text-emerald-500 font-bold">R$ {(produto.price || 0).toFixed(2)}</p>
                                        <p className="text-xs text-slate-500">Estoque: {produto.estoque_atual || 0}</p>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna Direita: Carrinho e Finalização */}
                <div className="space-y-6">
                    {/* Carrinho */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-slate-100 text-lg">Carrinho</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {carrinho.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">Nenhum item adicionado</p>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {carrinho.map(item => (
                                        <div key={item.produto_id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                                            <div className="flex items-start justify-between mb-2">
                                                <p className="text-sm font-bold text-slate-200 flex-1">{item.nome}</p>
                                                <button
                                                    onClick={() => removerDoCarrinho(item.produto_id)}
                                                    className="text-red-500 hover:text-red-400"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max={item.estoque_disponivel}
                                                    value={item.quantidade}
                                                    onChange={(e) => atualizarQuantidade(item.produto_id, parseInt(e.target.value) || 0)}
                                                    className="w-20 bg-slate-900 border-slate-700 text-slate-100 text-center"
                                                />
                                                <span className="text-xs text-slate-500">x R$ {item.preco_unitario.toFixed(2)}</span>
                                                <span className="text-sm font-bold text-slate-100 ml-auto">
                                                    R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Desconto e Pagamento */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="pt-6 space-y-4">
                            <div>
                                <Label className="text-slate-400 text-xs">Desconto (%)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={descontoPercentual}
                                    onChange={(e) => setDescontoPercentual(parseFloat(e.target.value) || 0)}
                                    className="bg-slate-950 border-slate-800 text-slate-100"
                                />
                            </div>

                            <div>
                                <Label className="text-slate-400 text-xs">Método de Pagamento</Label>
                                <select
                                    value={metodoPagamento}
                                    onChange={(e) => setMetodoPagamento(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-slate-100 text-sm"
                                >
                                    <option value="dinheiro">Dinheiro</option>
                                    <option value="pix">PIX</option>
                                    <option value="cartao_debito">Cartão de Débito</option>
                                    <option value="cartao_credito">Cartão de Crédito</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t border-slate-800 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Subtotal:</span>
                                    <span className="text-slate-100 font-bold">R$ {subtotal.toFixed(2)}</span>
                                </div>
                                {desconto > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Desconto ({descontoPercentual}%):</span>
                                        <span className="text-emerald-500 font-bold">- R$ {desconto.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg pt-2 border-t border-slate-800">
                                    <span className="text-slate-100 font-black">TOTAL:</span>
                                    <span className="text-emerald-500 font-black">R$ {total.toFixed(2)}</span>
                                </div>
                            </div>

                            <Button
                                onClick={finalizarVenda}
                                disabled={loading || carrinho.length === 0}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6"
                            >
                                {loading ? (
                                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando...</>
                                ) : (
                                    <><DollarSign className="w-5 h-5 mr-2" /> Finalizar Venda</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
