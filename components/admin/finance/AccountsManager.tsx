'use client';

import { useEffect, useState } from 'react';
import { Api } from '@/lib/api';
import { HoldingAccount } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, Landmark, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function AccountsManager() {
    const [accounts, setAccounts] = useState<HoldingAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    // Form States
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [bankName, setBankName] = useState('');
    const [type, setType] = useState('checking');
    const [isDefault, setIsDefault] = useState(false);

    useEffect(() => {
        loadAccounts();
    }, []);

    async function loadAccounts() {
        try {
            const data = await Api.getHoldingAccounts();
            setAccounts(data);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar contas');
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setEditingId(null);
        setName('');
        setBankName('');
        setType('checking');
        setIsDefault(false);
    }

    async function handleSubmit() {
        if (!name) return toast.error('Nome é obrigatório');

        try {
            const payload = { name, bank_name: bankName, type, is_default: isDefault };

            if (editingId) {
                await Api.updateHoldingAccount(editingId, payload);
                toast.success('Conta atualizada!');
            } else {
                await Api.createHoldingAccount(payload);
                toast.success('Conta criada!');
            }

            setIsOpen(false);
            resetForm();
            loadAccounts();
        } catch (error: any) {
            toast.error(error.message);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Deseja excluir esta conta?')) return;
        try {
            await Api.deleteHoldingAccount(id);
            toast.success('Conta removida');
            loadAccounts();
        } catch (error: any) {
            toast.error(error.message);
        }
    }

    function startEdit(acc: HoldingAccount) {
        setEditingId(acc.id);
        setName(acc.name);
        setBankName(acc.bank_name || '');
        setType(acc.type);
        setIsDefault(acc.is_default);
        setIsOpen(true);
    }

    return (
        <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Landmark className="text-blue-500" /> Contas Bancárias
                </CardTitle>
                <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">
                            <Plus size={16} className="mr-2" /> Nova Conta
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Editar Conta' : 'Nova Conta Bancária'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome da Conta</Label>
                                <Input
                                    placeholder="Ex: Conta Principal Inter"
                                    value={name} onChange={e => setName(e.target.value)}
                                    className="bg-slate-950 border-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Instituição Financeira</Label>
                                <Input
                                    placeholder="Ex: Inter, Nubank..."
                                    value={bankName} onChange={e => setBankName(e.target.value)}
                                    className="bg-slate-950 border-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger className="bg-slate-950 border-slate-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800">
                                        <SelectItem value="checking">Conta Corrente</SelectItem>
                                        <SelectItem value="savings">Poupança</SelectItem>
                                        <SelectItem value="investment">Investimento</SelectItem>
                                        <SelectItem value="cash">Caixa Físico</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    checked={isDefault}
                                    onChange={e => setIsDefault(e.target.checked)}
                                    id="isDefault"
                                    className="rounded bg-slate-800 border-slate-600"
                                />
                                <Label htmlFor="isDefault" className="cursor-pointer">Definir como conta padrão</Label>
                            </div>
                            <Button className="w-full bg-blue-600 hover:bg-blue-500 mt-4" onClick={handleSubmit}>
                                Salvar
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {loading ? <p>Carregando...</p> : (
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-slate-900/50">
                                <TableHead className="text-slate-400">Nome</TableHead>
                                <TableHead className="text-slate-400">Banco</TableHead>
                                <TableHead className="text-slate-400">Tipo</TableHead>
                                <TableHead className="text-slate-400 text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts.map(acc => (
                                <TableRow key={acc.id} className="border-slate-800 hover:bg-slate-900/50">
                                    <TableCell className="font-medium text-slate-200">
                                        <div className="flex items-center gap-2">
                                            {acc.name}
                                            {acc.is_default && <span className="text-[10px] bg-green-900 text-green-300 px-1.5 py-0.5 rounded border border-green-800">PADRÃO</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-400">{acc.bank_name}</TableCell>
                                    <TableCell className="text-slate-500 capitalize">{acc.type}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-800 hover:text-blue-400" onClick={() => startEdit(acc)}>
                                                <Edit2 size={14} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-800 hover:text-red-400" onClick={() => handleDelete(acc.id)}>
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {accounts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                                        Nenhuma conta cadastrada.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
