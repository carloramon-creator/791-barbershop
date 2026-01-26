'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { Api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Search, Plus, Trash2, DollarSign, Loader2, UserPlus, X, Box, QrCode } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { QRCodeCanvas } from 'qrcode.react';

// Formatador de moeda brasileira
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

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
    const [loadingData, setLoadingData] = useState(true);
    const [buscaCliente, setBuscaCliente] = useState('');
    const [buscaProduto, setBuscaProduto] = useState('');

    // Estado do Modal de Cliente
    const [showClientModal, setShowClientModal] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const [newClientCpf, setNewClientCpf] = useState('');
    const [creatingClient, setCreatingClient] = useState(false);

    // Estado do Modal PIX
    const [showPixModal, setShowPixModal] = useState(false);
    const [pixData, setPixData] = useState({ qrCode: '', payload: '', total: 0 });

    // Verificar plano/permissão (já verificado no sidebar, mas bom ter aqui)
    useEffect(() => {
        // Redirecionamento removido para evitar flash, assumindo sidebar control
    }, [tenant, router]);

    // Carregar clientes e produtos
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoadingData(true);
            const [clientesData, produtosData] = await Promise.all([
                Api.getClients(),
                Api.getProducts()
            ]);
            setClientes(clientesData || []);
            setProdutos(produtosData || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados. Tente recarregar a página.');
        } finally {
            setLoadingData(false);
        }
    };

    const handleCreateClient = async () => {
        if (!newClientName || !newClientPhone) {
            alert('Nome e telefone são obrigatórios');
            return;
        }

        try {
            setCreatingClient(true);
            const newClient = await Api.createClient({
                name: newClientName,
                phone: newClientPhone,
                cpf: newClientCpf
            });

            // Atualizar lista e selecionar o novo cliente
            const updatedClients = await Api.getClients();
            setClientes(updatedClients || []);
            setClienteSelecionado(newClient); // Assumindo que retorna o cliente criado

            setShowClientModal(false);
            setNewClientName('');
            setNewClientPhone('');
            setNewClientCpf('');

        } catch (error: any) {
            alert('Erro ao criar cliente: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setCreatingClient(false);
        }
    };

    const adicionarAoCarrinho = (produto: any) => {
        const itemExistente = carrinho.find(item => item.produto_id === produto.id);

        if (itemExistente) {
            if (itemExistente.quantidade >= (produto.stock_quantity || 0)) {
                alert('Limite de estoque atingido para este item');
                return;
            }
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
                estoque_disponivel: produto.stock_quantity || 0
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

        const item = carrinho.find(i => i.produto_id === produto_id);
        if (item && quantidade > item.estoque_disponivel) {
            alert(`Quantidade máxima disponível: ${item.estoque_disponivel}`);
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

            // Se for PIX, gerar QR Code
            if (metodoPagamento === 'pix') {
                try {
                    const pixResponse = await fetch('/api/pix/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            value: data.total,
                            description: `Venda #${data.venda_id.substring(0, 8)}`,
                            name: tenant?.name || 'Barbearia',
                            key: tenant?.pix_key || '791barber@pix.com'
                        })
                    });

                    const pixResult = await pixResponse.json();
                    if (pixResult.success) {
                        setPixData({
                            qrCode: pixResult.qrCode,
                            payload: pixResult.payload,
                            total: data.total
                        });
                        setShowPixModal(true);
                    } else {
                        alert(`✅ Venda finalizada!\nTotal: ${formatCurrency(data.total)}\n\n⚠️ Não foi possível gerar o QR Code PIX. Configure a chave PIX em Configurações.`);
                    }
                } catch (pixError) {
                    console.error('Erro ao gerar PIX:', pixError);
                    alert(`✅ Venda finalizada!\nTotal: ${formatCurrency(data.total)}\n\n⚠️ Erro ao gerar QR Code PIX.`);
                }
            } else {
                alert(`✅ Venda finalizada com sucesso!\nTotal: ${formatCurrency(data.total)}`);
            }

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
                    <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tight">Vendas Diretas</h1>
                    <p className="text-slate-500 font-medium">PDV para produtos e itens de estoque</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <ShoppingCart className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-bold text-emerald-500">{carrinho.length} itens</span>
                    <span className="text-slate-500 mx-2">|</span>
                    <span className="text-sm font-black text-emerald-400">{formatCurrency(total)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna Esquerda: Seleção */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Cliente */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-slate-100 text-lg">Cliente</CardTitle>
                            <Button variant="outline" size="sm" onClick={() => setShowClientModal(true)} className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                                <UserPlus className="w-4 h-4 mr-2" /> Novo Cliente
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {!clienteSelecionado && (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input
                                        placeholder="Buscar cliente por nome ou telefone..."
                                        value={buscaCliente}
                                        onChange={(e) => setBuscaCliente(e.target.value)}
                                        className="pl-10 bg-slate-950 border-slate-800 text-slate-100"
                                    />
                                </div>
                            )}

                            {clienteSelecionado ? (
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between animate-in fade-in transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                                            {clienteSelecionado.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-100">{clienteSelecionado.name}</p>
                                            <p className="text-xs text-slate-400">{clienteSelecionado.phone}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setClienteSelecionado(null)}
                                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                    >
                                        <X className="w-4 h-4 mr-1" /> Remover
                                    </Button>
                                </div>
                            ) : (
                                <div className="max-h-40 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                    {clientesFiltrados.slice(0, 5).map(cliente => (
                                        <button
                                            key={cliente.id}
                                            onClick={() => setClienteSelecionado(cliente)}
                                            className="w-full p-2 text-left bg-slate-950 hover:bg-slate-800 border border-slate-800/50 hover:border-slate-700 rounded-lg transition-all flex justify-between items-center group"
                                        >
                                            <div>
                                                <p className="text-sm font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{cliente.name}</p>
                                                <p className="text-xs text-slate-500">{cliente.phone}</p>
                                            </div>
                                            <Plus className="w-4 h-4 text-slate-600 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                                        </button>
                                    ))}
                                    {clientesFiltrados.length === 0 && (
                                        <p className="text-center text-slate-500 py-2 text-sm italic">Nenhum cliente encontrado</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Produtos */}
                    <Card className="bg-slate-900 border-slate-800 flex-1">
                        <CardHeader>
                            <CardTitle className="text-slate-100 text-lg">Catálogo de Produtos</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input
                                    placeholder="Buscar produto por nome..."
                                    value={buscaProduto}
                                    onChange={(e) => setBuscaProduto(e.target.value)}
                                    className="pl-10 bg-slate-950 border-slate-800 text-slate-100"
                                />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {produtosFiltrados.map(produto => {
                                    const semEstoque = (produto.stock_quantity || 0) <= 0;
                                    return (
                                        <button
                                            key={produto.id}
                                            onClick={() => adicionarAoCarrinho(produto)}
                                            disabled={semEstoque}
                                            className={`
                                                relative p-4 rounded-xl border transition-all text-left flex flex-col gap-2 group
                                                ${semEstoque
                                                    ? 'bg-slate-950/50 border-slate-900 opacity-50 cursor-not-allowed'
                                                    : 'bg-slate-950 border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 hover:shadow-lg hover:shadow-blue-500/10 active:scale-95'
                                                }
                                            `}
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mb-1 group-hover:border-blue-500/30 transition-colors">
                                                <Box className={`w-5 h-5 ${semEstoque ? 'text-slate-700' : 'text-slate-400 group-hover:text-blue-400'}`} />
                                            </div>

                                            <div>
                                                <p className="text-sm font-bold text-slate-200 line-clamp-1 group-hover:text-blue-200 transition-colors">{produto.name}</p>
                                                <p className="text-xs text-slate-500">Estoque: {produto.stock_quantity || 0}</p>
                                            </div>

                                            <div className="mt-auto pt-2 flex items-center justify-between border-t border-white/5">
                                                <span className="text-sm font-black text-emerald-400">{formatCurrency(produto.price || 0)}</span>
                                                {!semEstoque && <Plus className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna Direita: Carrinho e Finalização */}
                <div className="space-y-6">
                    {/* Carrinho */}
                    <Card className="bg-slate-900 border-slate-800 shadow-xl">
                        <CardHeader className="bg-slate-950/50 border-b border-slate-800">
                            <CardTitle className="text-slate-100 text-lg flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-blue-500" /> Carrinho
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-0 p-0">
                            {carrinho.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
                                    <ShoppingCart className="w-10 h-10 opacity-20" />
                                    <p className="text-sm">Seu carrinho está vazio</p>
                                </div>
                            ) : (
                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {carrinho.map((item, idx) => (
                                        <div key={item.produto_id} className={`p-4 flex flex-col gap-2 ${idx !== carrinho.length - 1 ? 'border-b border-slate-800' : ''}`}>
                                            <div className="flex items-start justify-between">
                                                <p className="text-sm font-bold text-slate-200">{item.nome}</p>
                                                <button
                                                    onClick={() => removerDoCarrinho(item.produto_id)}
                                                    className="text-slate-600 hover:text-red-500 transition-colors p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-0 bg-slate-950 rounded-lg border border-slate-800">
                                                    <button
                                                        onClick={() => atualizarQuantidade(item.produto_id, item.quantidade - 1)}
                                                        className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-l-lg transition-colors"
                                                    >-</button>
                                                    <span className="w-8 text-center text-xs font-bold text-slate-200">{item.quantidade}</span>
                                                    <button
                                                        onClick={() => atualizarQuantidade(item.produto_id, item.quantidade + 1)}
                                                        className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-r-lg transition-colors"
                                                    >+</button>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-500">{formatCurrency(item.preco_unitario)} un</p>
                                                    <p className="text-sm font-bold text-emerald-400">{formatCurrency(item.quantidade * item.preco_unitario)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>

                        {/* Resumo e Ações */}
                        <div className="border-t border-slate-800 p-6 bg-slate-950/30 space-y-4">
                            <div>
                                <Label className="text-slate-500 text-xs uppercase font-bold mb-1 block">Desconto (%)</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={descontoPercentual}
                                        onChange={(e) => setDescontoPercentual(parseFloat(e.target.value) || 0)}
                                        className="bg-slate-950 border-slate-800 text-slate-100 pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">%</span>
                                </div>
                            </div>

                            <div>
                                <Label className="text-slate-500 text-xs uppercase font-bold mb-1 block">Pagamento</Label>
                                <select
                                    value={metodoPagamento}
                                    onChange={(e) => setMetodoPagamento(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-slate-100 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                >
                                    <option value="dinheiro">💵 Dinheiro</option>
                                    <option value="pix">💠 PIX</option>
                                    <option value="cartao_debito">💳 Cartão de Débito</option>
                                    <option value="cartao_credito">💳 Cartão de Crédito</option>
                                </select>
                            </div>

                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Subtotal</span>
                                    <span className="text-slate-200">{formatCurrency(subtotal)}</span>
                                </div>
                                {desconto > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Desconto</span>
                                        <span className="text-emerald-500">- {formatCurrency(desconto)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xl pt-3 border-t border-slate-800">
                                    <span className="text-slate-100 font-black tracking-tight">TOTAL</span>
                                    <span className="text-emerald-500 font-black tracking-tight">{formatCurrency(total)}</span>
                                </div>
                            </div>

                            <Button
                                onClick={finalizarVenda}
                                disabled={loading || carrinho.length === 0}
                                className={`w-full font-bold py-6 text-base transition-all ${carrinho.length === 0
                                    ? 'bg-slate-800 text-slate-500'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 hover:scale-[1.02] active:scale-95'
                                    }`}
                            >
                                {loading ? (
                                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando...</>
                                ) : (
                                    <><DollarSign className="w-5 h-5 mr-2" /> Confirmar Venda</>
                                )}
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Modal Novo Cliente */}
            <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Novo Cliente</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-slate-400">Nome</Label>
                            <Input
                                id="name"
                                value={newClientName}
                                onChange={(e) => setNewClientName(e.target.value)}
                                className="bg-slate-950 border-slate-800 text-slate-100"
                                placeholder="Nome completo"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone" className="text-slate-400">Telefone</Label>
                            <Input
                                id="phone"
                                value={newClientPhone}
                                onChange={(e) => setNewClientPhone(e.target.value)}
                                className="bg-slate-950 border-slate-800 text-slate-100"
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cpf" className="text-slate-400">CPF (Opcional)</Label>
                            <Input
                                id="cpf"
                                value={newClientCpf}
                                onChange={(e) => setNewClientCpf(e.target.value)}
                                className="bg-slate-950 border-slate-800 text-slate-100"
                                placeholder="000.000.000-00"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowClientModal(false)} className="border-slate-800 hover:bg-slate-800">
                            Cancelar
                        </Button>
                        <Button onClick={handleCreateClient} disabled={creatingClient} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {creatingClient ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cadastrar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal PIX */}
            <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-blue-500" />
                            Pagamento via PIX
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center gap-4">
                            <div className="bg-white p-4 rounded-xl">
                                <QRCodeCanvas
                                    value={pixData.payload}
                                    size={256}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Valor do Pagamento</p>
                                <p className="text-3xl font-black text-emerald-400">
                                    {formatCurrency((pixData as any).total || 0)}
                                </p>
                            </div>
                            <p className="text-sm text-slate-400 text-center">
                                Escaneie o QR Code com o app do seu banco
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-400 text-xs uppercase font-bold">Código PIX Copia e Cola</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={pixData.payload}
                                    readOnly
                                    className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-xs"
                                />
                                <Button
                                    onClick={() => {
                                        navigator.clipboard.writeText(pixData.payload);
                                        alert('Código PIX copiado!');
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    Copiar
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => {
                                setShowPixModal(false);
                                // Limpar formulário
                                setCarrinho([]);
                                setClienteSelecionado(null);
                                setDescontoPercentual(0);
                                setMetodoPagamento('dinheiro');
                                loadData();
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                        >
                            Concluir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
