'use client';

import { useState, useEffect } from 'react';
import { Users, Building2, CreditCard, Plus, MoreHorizontal, Trash2, Shield, User as UserIcon, MapPin, Phone, CreditCard as CardIcon, Copy, Loader2, Link as LinkIcon, Key, Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Api } from '@/lib/api';
import { User } from '@/lib/types';
import { useAuth } from '@/lib/auth-provider';
import { MaskedInput } from '@/components/ui/masked-input';

export default function UsersPage() {
  const pathname = usePathname();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Invite Form
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteCpf, setInviteCpf] = useState('');
  const [inviteCep, setInviteCep] = useState('');
  const [inviteStreet, setInviteStreet] = useState('');
  const [inviteNumber, setInviteNumber] = useState('');
  const [inviteComplement, setInviteComplement] = useState('');
  const [inviteNeighborhood, setInviteNeighborhood] = useState('');
  const [inviteCity, setInviteCity] = useState('');
  const [inviteState, setInviteState] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await Api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setGeneratedLink('');
    try {
      const payload = {
        id: editingUserId,
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        phone: invitePhone,
        cpf: inviteCpf,
        cep: inviteCep,
        street: inviteStreet,
        number: inviteNumber,
        complement: inviteComplement,
        neighborhood: inviteNeighborhood,
        city: inviteCity,
        state: inviteState,
        generateInvite: !editingUserId
      };

      if (editingUserId) {
        await Api.updateUser(payload);
        setIsInviteOpen(false);
        alert('Usuário atualizado com sucesso!');
      } else {
        const result = await Api.inviteUser(payload);
        if (result.inviteLink) {
          setGeneratedLink(result.inviteLink);
        } else {
          setIsInviteOpen(false);
          resetForm();
          alert('Usuário adicionado com sucesso!');
        }
      }

      fetchUsers();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const resetForm = () => {
    setInviteName('');
    setInviteEmail('');
    setInviteRole('staff');
    setInvitePhone('');
    setInviteCpf('');
    setInviteCep('');
    setInviteStreet('');
    setInviteNumber('');
    setInviteComplement('');
    setInviteNeighborhood('');
    setInviteCity('');
    setInviteState('');
    setGeneratedLink('');
    setEditingUserId(null);
  };

  const handleEditClick = (u: any) => {
    setEditingUserId(u.id);
    setInviteName(u.name || '');
    setInviteEmail(u.email || '');
    setInviteRole(u.role || 'staff');
    setInvitePhone(u.phone || '');
    setInviteCpf(u.cpf || '');
    setInviteCep(u.cep || '');
    setInviteStreet(u.street || '');
    setInviteNumber(u.number || '');
    setInviteComplement(u.complement || '');
    setInviteNeighborhood(u.neighborhood || '');
    setInviteCity(u.city || '');
    setInviteState(u.state || '');
    setIsInviteOpen(true);
  };

  const handleCepBlur = async () => {
    const cleanCep = inviteCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (data.erro) return;

      setInviteStreet(data.logradouro);
      setInviteNeighborhood(data.bairro);
      setInviteCity(data.localidade);
      setInviteState(data.uf);
    } catch (error) {
      console.error('Erro ao buscar CEP', error);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      await Api.updateUser(userId, { role: newRole });
      fetchUsers();
    } catch (error: any) {
      alert('Erro ao atualizar função: ' + error.message);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário da barbearia? Esta ação não pode ser desfeita.')) return;

    try {
      await Api.removeUser(userId);
      fetchUsers();
    } catch (error: any) {
      alert('Erro ao remover usuário: ' + error.message);
    }
  };

  const handleGenerateLink = async (userId: string) => {
    try {
      setInviteLoading(true);
      const result = await Api.generateInviteLink(userId);
      if (result.inviteLink) {
        setGeneratedLink(result.inviteLink);
        setIsInviteOpen(true); // Re-use the dialog to show the link
      } else {
        alert('Falha ao gerar o link. Tente novamente.');
      }
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const tabs = [
    { name: 'Geral', href: '/configuracoes/barbearia', icon: Building2 },
    { name: 'Usuários', href: '/configuracoes/usuarios', icon: Users },
    { name: 'Permissões', href: '/configuracoes/permissoes', icon: Shield },
    { name: 'Plano', href: '/configuracoes/plano', icon: CreditCard },
  ];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Proprietário';
      case 'barber': return 'Barbeiro';
      case 'staff': return 'Funcionário';
      default: return role;
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-slate-100">Configurações</h1>
        <div className="flex space-x-1 border-b border-slate-800">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                pathname === tab.href
                  ? "border-blue-500 text-blue-500"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </Link>
          ))}
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-slate-100">Usuários e Permissões</CardTitle>
            <CardDescription className="text-slate-500">
              Gerencie quem tem acesso ao sistema.
            </CardDescription>
          </div>

          <Dialog open={isInviteOpen} onOpenChange={(val) => { setIsInviteOpen(val); if (!val) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <DialogHeader>
                <DialogTitle>{editingUserId ? 'Editar Usuário' : 'Adicionar novo usuário'}</DialogTitle>
                <DialogDescription className="text-slate-400">
                  {editingUserId ? 'Atualize as informações do colaborador.' : 'Preencha os dados e gere um link de convite para o colaborador.'}
                </DialogDescription>
              </DialogHeader>

              {generatedLink ? (
                <div className="py-6 space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm italic">
                    Usuário criado com sucesso! Copie o link abaixo e envie para que ele defina a senha e acesse o sistema.
                  </div>
                  <div className="flex gap-2">
                    <Input readOnly value={generatedLink} className="bg-slate-950 border-slate-800 text-xs" />
                    <Button
                      onClick={() => { navigator.clipboard.writeText(generatedLink); alert('Copiado!'); }}
                      className="bg-slate-800 hover:bg-slate-700"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button onClick={() => setIsInviteOpen(false)} className="w-full bg-blue-600 hover:bg-blue-700">Concluir</Button>
                </div>
              ) : (
                <form onSubmit={handleInvite} className="space-y-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input id="name" value={inviteName} onChange={e => setInviteName(e.target.value)} className="bg-slate-950 border-slate-800" placeholder="Ex: João da Silva" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        className="bg-slate-950 border-slate-800"
                        placeholder="nome@email.com"
                        disabled={!!editingUserId}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone / WhatsApp</Label>
                      <MaskedInput mask="(99) 99999-9999" value={invitePhone} onChange={e => setInvitePhone(e.target.value)} className="bg-slate-950 border-slate-800" placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <MaskedInput mask="999.999.999-99" value={inviteCpf} onChange={e => setInviteCpf(e.target.value)} className="bg-slate-950 border-slate-800" placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="role">Função / Cargo</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger className="bg-slate-950 border-slate-800">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                          <SelectItem value="owner">Proprietário (Acesso Total)</SelectItem>
                          <SelectItem value="barber">Barbeiro (Ver própria fila)</SelectItem>
                          <SelectItem value="staff">Funcionário (Ver todas as filas)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-800">
                    <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                      <MapPin className="w-4 h-4" /> Endereço Residencial
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cep">CEP</Label>
                        <MaskedInput mask="99999-999" value={inviteCep} onChange={e => setInviteCep(e.target.value)} onBlur={handleCepBlur} className="bg-slate-950 border-slate-800" placeholder="00000-000" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="street">Rua</Label>
                        <Input value={inviteStreet} onChange={e => setInviteStreet(e.target.value)} className="bg-slate-950 border-slate-800" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="number">Número</Label>
                        <Input value={inviteNumber} onChange={e => setInviteNumber(e.target.value)} className="bg-slate-950 border-slate-800" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="complement">Complemento</Label>
                        <Input value={inviteComplement} onChange={e => setInviteComplement(e.target.value)} className="bg-slate-950 border-slate-800" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Input value={inviteNeighborhood} onChange={e => setInviteNeighborhood(e.target.value)} className="bg-slate-950 border-slate-800" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input value={inviteCity} onChange={e => setInviteCity(e.target.value)} className="bg-slate-950 border-slate-800" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">UF</Label>
                        <Input value={inviteState} onChange={e => setInviteState(e.target.value)} maxLength={2} className="bg-slate-950 border-slate-800 uppercase" />
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="pt-4 border-t border-slate-800">
                    <Button type="submit" disabled={inviteLoading} className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto min-w-[200px]">
                      {inviteLoading ? <Loader2 className="animate-spin mr-2" /> : editingUserId ? <Save className="mr-2 w-4 h-4" /> : <Shield className="mr-2 w-4 h-4" />}
                      {editingUserId ? 'Salvar Alterações' : 'Salvar e Gerar Link de Convite'}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-slate-500">Carregando usuários...</div>
          ) : (
            <div className="rounded-md border border-slate-800">
              <Table>
                <TableHeader className="bg-slate-950">
                  <TableRow className="border-slate-800 hover:bg-slate-900">
                    <TableHead className="text-slate-400">Nome</TableHead>
                    <TableHead className="text-slate-400">E-mail</TableHead>
                    <TableHead className="text-slate-400">Função</TableHead>
                    <TableHead className="text-right text-slate-400">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-slate-800 hover:bg-slate-900/50">
                      <TableCell className="font-medium text-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                            <UserIcon className="w-4 h-4" />
                          </div>
                          {u.name || 'Sem nome'}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">{u.email}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          u.role === 'owner' ? "bg-purple-500/10 text-purple-500" :
                            u.role === 'barber' ? "bg-blue-500/10 text-blue-500" :
                              "bg-slate-500/10 text-slate-500"
                        )}>
                          {getRoleLabel(u.role)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-200">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditClick(u)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar Usuário
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-800" />
                            <DropdownMenuLabel>Alterar Função</DropdownMenuLabel>
                            {u.role !== 'owner' && (
                              <DropdownMenuItem onClick={() => handleRoleUpdate(u.id, 'owner')}>
                                <Shield className="mr-2 h-4 w-4" />
                                Tornar Proprietário
                              </DropdownMenuItem>
                            )}
                            {u.role !== 'barber' && (
                              <DropdownMenuItem onClick={() => handleRoleUpdate(u.id, 'barber')}>
                                <UserIcon className="mr-2 h-4 w-4" />
                                Tornar Barbeiro
                              </DropdownMenuItem>
                            )}
                            {u.role !== 'staff' && (
                              <DropdownMenuItem onClick={() => handleRoleUpdate(u.id, 'staff')}>
                                <UserIcon className="mr-2 h-4 w-4" />
                                Tornar Funcionário
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-slate-800" />
                            <DropdownMenuItem onClick={() => handleGenerateLink(u.id)} className="text-blue-400 focus:text-blue-400">
                              <Key className="mr-2 h-4 w-4" />
                              Gerar Link de Convite
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-800" />
                            <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={() => handleRemoveUser(u.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover da Barbearia
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                        Nenhum usuário encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
