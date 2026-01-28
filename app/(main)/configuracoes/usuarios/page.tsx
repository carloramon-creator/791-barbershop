'use client';

import { useState, useEffect } from 'react';
import { Users, Building2, CreditCard, Plus, MoreHorizontal, Trash2, Shield, User as UserIcon, MapPin, Copy, Loader2, Key, Pencil, Save, MessageCircle, Clock, Percent, DollarSign, Eye, Camera, Scissors, FolderOpen, FileText } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn, isValidCNPJ } from '@/lib/utils';
import { Api } from '@/lib/api';
import { User, UserRole } from '@/lib/types';
import { useAuth } from '@/lib/auth-provider';
import { MaskedInput } from '@/components/ui/masked-input';
import { supabaseClient } from '@/lib/supabase-client';
import { GenerateContractDialog } from '@/components/users/GenerateContractDialog';
import { UserFilesDialog } from '@/components/users/UserFilesDialog';

export default function UsersPage() {
  const pathname = usePathname();
  const { tenant } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showAuditMode, setShowAuditMode] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Contract & Files Dialog State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isContractOpen, setIsContractOpen] = useState(false);
  const [isFilesOpen, setIsFilesOpen] = useState(false);

  // Form State
  const [inviteName, setInviteName] = useState('');
  const [inviteNickname, setInviteNickname] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoles, setInviteRoles] = useState<string[]>(['staff']);
  const [invitePhotoUrl, setInvitePhotoUrl] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteCpf, setInviteCpf] = useState('');
  const [inviteCep, setInviteCep] = useState('');
  const [inviteStreet, setInviteStreet] = useState('');
  const [inviteNumber, setInviteNumber] = useState('');
  const [inviteComplement, setInviteComplement] = useState('');
  const [inviteNeighborhood, setInviteNeighborhood] = useState('');
  const [inviteCity, setInviteCity] = useState('');
  const [inviteState, setInviteState] = useState('');
  const [inviteAvgTime, setInviteAvgTime] = useState('30');
  const [inviteCommType, setInviteCommType] = useState<'fixed' | 'percentage'>('percentage');
  const [inviteCommValue, setInviteCommValue] = useState('50');
  const [inviteCnpjMei, setInviteCnpjMei] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Services Management State (for Barbers)
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [currentBarberId, setCurrentBarberId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Fetch users (active only by default, or all/archived if we had a dedicated endpoint, 
      // but here we use include_archived param)
      const data = await Api.getUsers(showArchived);
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [showArchived]);

  const resetForm = () => {
    setInviteName('');
    setInviteNickname('');
    setInviteEmail('');
    setInviteRoles(['staff']);
    setInvitePhotoUrl('');
    setInvitePhone('');
    setInviteCpf('');
    setInviteCep('');
    setInviteStreet('');
    setInviteNumber('');
    setInviteComplement('');
    setInviteNeighborhood('');
    setInviteCity('');
    setInviteState('');
    setInviteAvgTime('30');
    setInviteCommType('percentage');
    setInviteCommValue('50');
    setInviteCnpjMei('');
    setGeneratedLink('');
    setCepLoading(false);
    setEditingUserId(null);
    setIsViewOnly(false);

    // Reset Services
    setServices([]);
    setSelectedServiceIds([]);
    setCurrentBarberId(null);
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `user-photos/${fileName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('barber-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('barber-photos')
        .getPublicUrl(filePath);

      setInvitePhotoUrl(publicUrl);
    } catch (err: unknown) {
      const error = err as Error;
      alert('Erro no upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar limite de usuários do plano (apenas para novos convites)
    if (!editingUserId) {
      const staffLimit = tenant?.system_plan?.staff_limit || 0;
      if (staffLimit > 0 && users.length >= staffLimit) {
        alert(`Você atingiu o limite de ${staffLimit} usuários do seu plano. Faça um upgrade para adicionar mais.`);
        return;
      }
    }

    setInviteLoading(true);
    setGeneratedLink('');
    try {
      const payload = {
        id: editingUserId,
        name: inviteName,
        nickname: inviteNickname,
        email: inviteEmail,
        roles: inviteRoles,
        role: inviteRoles[0] || 'staff',
        photo_url: invitePhotoUrl,
        phone: invitePhone,
        cpf: inviteCpf,
        cep: inviteCep,
        street: inviteStreet,
        number: inviteNumber,
        complement: inviteComplement || '',
        neighborhood: inviteNeighborhood,
        city: inviteCity,
        state: inviteState,
        avg_service_time: parseInt(inviteAvgTime) || 30,
        commission_type: inviteCommType,
        commission_value: parseFloat(inviteCommValue) || 0,
        cnpj_mei: inviteCnpjMei,
        generateInvite: !editingUserId
      };

      if (editingUserId) {
        const result = await Api.updateUser(payload);
        console.log('[CLIENT_UPDATE_USER_RESULT]', result);

        if (inviteRoles.includes('barber')) {
          let bId = result.barber?.id || currentBarberId;
          console.log('[CLIENT_BARBER_ID_FOUND]', bId, 'currentBarberId:', currentBarberId);

          // Fallback seguro: buscar ID do barbeiro se não estiver disponível
          if (!bId) {
            console.log('[CLIENT_FETCHING_BARBER_FALLBACK] User ID:', result.id);
            const { data: bData, error: bErr } = await supabaseClient
              .from('barbers')
              .select('id')
              .eq('user_id', result.id)
              .single();

            if (bErr) console.error('[CLIENT_FALLBACK_ERROR]', bErr);
            bId = bData?.id;
            console.log('[CLIENT_FALLBACK_RESULT]', bId);
          }

          if (bId) {
            console.log('[CLIENT_LINKING_SERVICES] Barber:', bId, 'Services:', selectedServiceIds);
            await Api.updateBarberServices(bId, selectedServiceIds);
          } else {
            console.error('Barber profile not found for user', result.id);
            alert('Atenção: Perfil de barbeiro não encontrado. Os serviços não foram vinculados.');
          }
        }

        // IMPORTANTE: Ao editar, nunca mostrar a tela de link de convite
        setIsInviteOpen(false);
        resetForm();
        alert('Usuário atualizado com sucesso!');
        fetchUsers();
      } else {
        const result = await Api.inviteUser(payload);

        // Link services if barber was created
        if (inviteRoles.includes('barber') && selectedServiceIds.length > 0) {
          let bId = result.barber?.id;

          // Tenta buscar o barbeiro caso não venha no retorno (garantia)
          if (!bId) {
            const { data: bData } = await supabaseClient
              .from('barbers')
              .select('id')
              .eq('user_id', result.id)
              .single();
            bId = bData?.id;
          }

          if (bId) {
            await Api.updateBarberServices(bId, selectedServiceIds);
          } else {
            console.warn('Barber ID not found after creation, services not linked automatically.');
          }
        }

        // Apenas mostrar link de convite ao CRIAR novo usuário
        if (result.inviteLink) {
          setGeneratedLink(result.inviteLink);
        } else {
          setIsInviteOpen(false);
          resetForm();
          alert('Usuário adicionado com sucesso!');
        }
        fetchUsers();
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert('Erro: ' + error.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleEditClick = (u: User, viewOnly: boolean = false) => {
    setIsViewOnly(viewOnly);
    setGeneratedLink(''); // IMPORTANTE: Limpar link anterior para não travar o modal
    setEditingUserId(u.id);
    setInviteName(u.name || '');
    setInviteNickname(u.nickname || '');
    setInviteEmail(u.email || '');
    setInviteRoles(u.roles || (u.role ? [u.role] : ['staff']));
    setInvitePhotoUrl(u.photo_url || '');
    setInvitePhone(u.phone || '');
    setInviteCpf(u.cpf || '');
    setInviteCep(u.cep || '');
    setInviteStreet(u.street || '');
    setInviteNumber(u.number || '');
    setInviteComplement(u.complement || '');
    setInviteNeighborhood(u.neighborhood || '');
    setInviteCity(u.city || '');
    setInviteState(u.state || '');
    setInviteAvgTime(u.avg_service_time?.toString() || '30');
    setInviteCommType(u.commission_type || 'percentage');
    setInviteCommValue(u.commission_value?.toString() || '50');
    setInviteCnpjMei(u.cnpj_mei || '');
    setIsInviteOpen(true);

    // Load Services if Barber
    if (u.roles?.includes('barber') || u.role === 'barber') {
      loadBarberData(u.id);
    }
  };

  const loadBarberData = async (userId: string) => {
    setLoadingServices(true);
    try {
      // 1. Get All Services (Always load this if we don't have it)
      if (services.length === 0) {
        const allServices = await Api.getServices();
        setServices(allServices);
      }

      // 2. Get Barber ID and Linked Services
      const { data: barber } = await supabaseClient.from('barbers').select('id').eq('user_id', userId).single();
      if (barber) {
        setCurrentBarberId(barber.id);
        const linkedIds = await Api.getBarberServices(barber.id);
        setSelectedServiceIds(linkedIds || []);
      }
    } catch (err) {
      console.error("Error loading barber services", err);
    } finally {
      setLoadingServices(false);
    }
  };

  const loadAllServicesOnly = async () => {
    if (services.length === 0) {
      setLoadingServices(true);
      try {
        const allServices = await Api.getServices();
        setServices(allServices);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingServices(false);
      }
    }
  };

  useEffect(() => {
    if (inviteRoles.includes('barber') && isInviteOpen) {
      loadAllServicesOnly();
    }
  }, [inviteRoles, isInviteOpen]);


  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInviteCep(val);

    const cleanCep = val.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (data.erro) {
          setCepLoading(false);
          return;
        }

        setInviteStreet(data.logradouro || '');
        setInviteNeighborhood(data.bairro || '');
        setInviteCity(data.localidade || '');
        setInviteState(data.uf || '');
      } catch (error) {
        console.error('Erro ao buscar CEP', error);
      } finally {
        setCepLoading(false);
      }
    }
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
      await Api.updateUser({ id: userId, role: newRole as UserRole, roles: [newRole as UserRole] });
      fetchUsers();
    } catch (err: unknown) {
      const error = err as Error;
      alert('Erro ao atualizar função: ' + error.message);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário da barbearia? Esta ação não pode ser desfeita.')) return;

    try {
      await Api.removeUser(userId);
      fetchUsers();
    } catch (err: unknown) {
      const error = err as Error;
      alert('Erro ao remover usuário: ' + error.message);
    }
  };

  const handleGenerateLink = async (userId: string) => {
    setInviteLoading(true);
    setGeneratedLink('');
    try {
      const result = await Api.generateInviteLink(userId);
      if (result && result.inviteLink) {
        setGeneratedLink(result.inviteLink);
        const targetUser = users.find(u => u.id === userId);
        if (targetUser) {
          setInviteName(targetUser.name || '');
          setInviteEmail(targetUser.email || '');
          setInvitePhone(targetUser.phone || '');
        }
        setIsInviteOpen(true);
      } else {
        throw new Error('O servidor não retornou um link de convite.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert('Erro ao gerar link: ' + error.message);
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
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-slate-100">Usuários e Permissões</CardTitle>
          <CardDescription className="text-slate-500">
            Gerencie quem tem acesso ao sistema.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className={cn("border-slate-800", showAuditMode ? "bg-orange-500/20 text-orange-400 border-orange-500/50" : "text-slate-400")}
            onClick={() => setShowAuditMode(!showAuditMode)}
          >
            <Shield className="w-4 h-4 mr-2" /> {showAuditMode ? 'Modo Auditoria Ativo' : 'Modo Auditoria'}
          </Button>
          <Dialog open={isInviteOpen} onOpenChange={(val) => {
            if (val && !editingUserId) {
              const staffLimit = tenant?.system_plan?.staff_limit || 0;
              if (staffLimit > 0 && users.length >= staffLimit) {
                alert(`Limite atingido (${staffLimit} usuários). Faça um upgrade para adicionar mais.`);
                return;
              }
            }
            setIsInviteOpen(val);
            if (!val) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                disabled={loading || ((tenant?.system_plan?.staff_limit || 0) > 0 && users.length >= (tenant?.system_plan?.staff_limit || 0))}
              >
                <Plus className="w-4 h-4" />
                Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-5xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <DialogHeader>
                <DialogTitle>
                  {isViewOnly ? 'Detalhes do Usuário' : (editingUserId ? 'Editar Usuário' : 'Adicionar novo usuário')}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  {isViewOnly ? 'Visualizando informações completas do cadastro.' : (editingUserId ? 'Atualize as informações do colaborador.' : 'Preencha os dados e gere um link de convite para o colaborador.')}
                </DialogDescription>
              </DialogHeader>

              {generatedLink ? (
                <div className="py-6 space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                    Usuário criado com sucesso! Escolha como deseja enviar o convite abaixo:
                  </div>
                  <div className="space-y-3">
                    <Label className="text-slate-400 text-xs uppercase font-bold tracking-wider">Link de Acesso</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={generatedLink} className="bg-slate-950 border-slate-800 text-xs" />
                      <Button
                        onClick={() => { navigator.clipboard.writeText(generatedLink); alert('Copiado!'); }}
                        className="bg-slate-800 hover:bg-slate-700"
                        title="Copiar Link"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                      onClick={() => {
                        const message = encodeURIComponent(`Olá ${inviteName}! Seja bem-vindo à nossa barbearia. Clique no link abaixo para definir sua senha e acessar o sistema: ${generatedLink}`);
                        const phone = invitePhone.replace(/\D/g, '');
                        window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </Button>
                    <Button
                      onClick={() => {
                        const subject = encodeURIComponent(`Convite (${tenant?.name || '791 Barber'}): Acesso ao Sistema`);
                        const body = encodeURIComponent(`Olá ${inviteName}!\n\nSeja bem-vindo. Sua conta foi criada pela ${tenant?.name || 'nossa barbearia'}.\nClique no link abaixo para configurar sua senha:\n\n${generatedLink}`);
                        window.location.href = `mailto:${inviteEmail}?subject=${subject}&body=${body}`;
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                      <Loader2 className="w-4 h-4" />
                      E-mail
                    </Button>
                  </div>
                  <Button onClick={() => setIsInviteOpen(false)} variant="ghost" className="w-full text-slate-500 hover:text-slate-300">Fechar</Button>
                </div>
              ) : (
                <form onSubmit={handleInvite} className="space-y-6 py-4">
                  <div className="flex justify-center">
                    <div className="relative group cursor-pointer" onClick={() => !isViewOnly && document.getElementById('user-photo-input')?.click()}>
                      <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden">
                        {invitePhotoUrl ? (
                          <Image src={invitePhotoUrl} alt="Preview" width={96} height={96} className="w-full h-full object-cover" unoptimized />
                        ) : (
                          <Camera size={24} className="text-slate-600 group-hover:text-blue-500 transition-colors" />
                        )}
                      </div>
                      {!isViewOnly && (
                        <input
                          id="user-photo-input"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                        />
                      )}
                      {uploading && <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center rounded-full"><Loader2 className="animate-spin" /></div>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input id="name" disabled={isViewOnly} value={inviteName} onChange={e => setInviteName(e.target.value)} className="bg-slate-950 border-slate-800" placeholder="Ex: João da Silva" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nickname">Apelido (Identificação rápida)</Label>
                      <Input id="nickname" disabled={isViewOnly} value={inviteNickname} onChange={e => setInviteNickname(e.target.value)} className="bg-slate-950 border-slate-800" placeholder="Ex: João" />
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
                        disabled={!!editingUserId || isViewOnly}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone / WhatsApp</Label>
                      <MaskedInput disabled={isViewOnly} mask="(99) 99999-9999" value={invitePhone} onChange={e => setInvitePhone(e.target.value)} className="bg-slate-950 border-slate-800" placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <MaskedInput disabled={isViewOnly} mask="999.999.999-99" value={inviteCpf} onChange={e => setInviteCpf(e.target.value)} className="bg-slate-950 border-slate-800" placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Funções / Cargos (Multi-seleção)</Label>
                      <div className="grid grid-cols-3 gap-4 pt-2">
                        {[
                          { id: 'owner', label: 'Proprietário' },
                          { id: 'barber', label: 'Barbeiro' },
                          { id: 'staff', label: 'Funcionário' }
                        ].map(role => (
                          <div key={role.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`role-${role.id}`}
                              disabled={isViewOnly}
                              checked={inviteRoles.includes(role.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const newRoles = [...inviteRoles, role.id];
                                  setInviteRoles(newRoles);
                                  if (role.id === 'barber') loadAllServicesOnly();
                                } else {
                                  setInviteRoles(inviteRoles.filter(r => r !== role.id));
                                }
                              }}
                            />
                            <Label htmlFor={`role-${role.id}`} className="cursor-pointer">{role.label}</Label>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 p-3 bg-slate-950/50 rounded-lg border border-slate-800/50 space-y-1">
                        <p className="text-[10px] text-slate-500 flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <strong>Proprietário:</strong> Dono da barbearia com acesso total.
                        </p>
                        <p className="text-[10px] text-slate-500 flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <strong>Profissional:</strong> Barbeiros, cabeleireiros(as), manicures, pedicures, etc.
                        </p>
                        <p className="text-[10px] text-slate-500 flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <strong>Funcionário:</strong> Administrativo, recepção e suporte.
                        </p>
                      </div>
                    </div>

                    {inviteRoles.includes('barber') && (
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-blue-400">
                            <Clock className="w-3 h-3" /> Tempo Médio (min)
                          </Label>
                          <Input disabled={isViewOnly} type="number" value={inviteAvgTime} onChange={e => setInviteAvgTime(e.target.value)} className="bg-slate-950 border-slate-800" />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-blue-400">
                            <Percent className="w-3 h-3" /> Tipo de Comissão
                          </Label>
                          <Select disabled={isViewOnly} value={inviteCommType} onValueChange={(v: 'fixed' | 'percentage') => setInviteCommType(v)}>
                            <SelectTrigger className="bg-slate-950 border-slate-800">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                              <SelectItem value="percentage">Percentual (%)</SelectItem>
                              <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-blue-400">
                            <DollarSign className="w-3 h-3" /> Valor da Comissão
                          </Label>
                          <Input disabled={isViewOnly} type="number" value={inviteCommValue} onChange={e => setInviteCommValue(e.target.value)} className="bg-slate-950 border-slate-800" />
                        </div>
                        <div className="md:col-span-3 space-y-2">
                          <Label htmlFor="cnpj_mei" className="text-blue-400">CNPJ MEI (Obrigatório para emissão de NFS-e)</Label>
                          <MaskedInput
                            id="cnpj_mei"
                            disabled={isViewOnly}
                            mask="99.999.999/9999-99"
                            value={inviteCnpjMei}
                            onChange={e => setInviteCnpjMei(e.target.value)}
                            className="bg-slate-950 border-slate-800"
                            placeholder="00.000.000/0000-00"
                          />
                          {inviteCnpjMei && inviteCnpjMei.replace(/\D/g, '').length === 14 && !isValidCNPJ(inviteCnpjMei) && (
                            <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-1">CNPJ inválido</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* SERVICES SECTION FOR BARBERS */}
                    {inviteRoles.includes('barber') && (
                      <div className="md:col-span-2 space-y-2 pt-4 border-t border-slate-800 animate-in fade-in">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="flex items-center gap-2 text-slate-200">
                            <Scissors size={16} className="text-blue-500" />
                            Serviços Realizados (Vínculo Profissional)
                          </Label>

                          {!isViewOnly && services.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (selectedServiceIds.length === services.length) {
                                  setSelectedServiceIds([]);
                                } else {
                                  setSelectedServiceIds(services.map(s => s.id));
                                }
                              }}
                              className="text-xs h-6 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                            >
                              {selectedServiceIds.length === services.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                            </Button>
                          )}
                        </div>

                        <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 max-h-[200px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3">
                          {loadingServices ? (
                            <p className="text-xs text-slate-500 col-span-2">Carregando serviços...</p>
                          ) : services.length === 0 ? (
                            <p className="text-xs text-slate-500 col-span-2">Para configurar serviços, certifique-se que existem serviços cadastrados.</p>
                          ) : (
                            services.map(service => (
                              <div key={service.id} className="flex items-center space-x-2 hover:bg-slate-800/50 p-2 rounded transition-colors border border-transparent hover:border-slate-800">
                                <Checkbox
                                  id={`usr-srv-${service.id}`}
                                  checked={selectedServiceIds.includes(service.id)}
                                  disabled={isViewOnly}
                                  onCheckedChange={(checked) => {
                                    if (checked) setSelectedServiceIds([...selectedServiceIds, service.id]);
                                    else setSelectedServiceIds(selectedServiceIds.filter(id => id !== service.id));
                                  }}
                                  className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                                <Label htmlFor={`usr-srv-${service.id}`} className={cn("text-xs md:text-sm flex-1 user-select-none", isViewOnly ? "" : "cursor-pointer")}>
                                  {service.name}
                                </Label>
                              </div>
                            ))
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock size={10} />
                          Selecione os serviços que este usuário pode realizar como barbeiro.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-800">
                    <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                      <MapPin className="w-4 h-4" /> Endereço Residencial
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cep" className="flex items-center justify-between">
                          CEP
                          {cepLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                        </Label>
                        <MaskedInput
                          disabled={isViewOnly || cepLoading}
                          mask="99999-999"
                          value={inviteCep}
                          onChange={handleCepChange}
                          onBlur={handleCepBlur}
                          className={cn("bg-slate-950 border-slate-800", cepLoading && "opacity-50")}
                          placeholder="00000-000"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="street">Rua</Label>
                        <Input disabled={isViewOnly} value={inviteStreet} onChange={e => setInviteStreet(e.target.value)} className="bg-slate-950 border-slate-800" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="number">Número</Label>
                        <Input disabled={isViewOnly} value={inviteNumber} onChange={e => setInviteNumber(e.target.value)} className="bg-slate-950 border-slate-800" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="complement">Complemento</Label>
                        <Input disabled={isViewOnly} value={inviteComplement} onChange={e => setInviteComplement(e.target.value)} className="bg-slate-950 border-slate-800" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Input disabled={isViewOnly} value={inviteNeighborhood} onChange={e => setInviteNeighborhood(e.target.value)} className="bg-slate-950 border-slate-800" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input disabled={isViewOnly} value={inviteCity} onChange={e => setInviteCity(e.target.value)} className="bg-slate-950 border-slate-800" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">UF</Label>
                        <Input disabled={isViewOnly} value={inviteState} onChange={e => setInviteState(e.target.value)} maxLength={2} className="bg-slate-950 border-slate-800 uppercase" />
                      </div>
                    </div>
                  </div>

                  {!isViewOnly && (
                    <DialogFooter className="pt-4 border-t border-slate-800">
                      <Button type="submit" disabled={inviteLoading} className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto min-w-[200px]">
                        {inviteLoading ? <Loader2 className="animate-spin mr-2" /> : editingUserId ? <Save className="mr-2 w-4 h-4" /> : <Shield className="mr-2 w-4 h-4" />}
                        {editingUserId ? 'Salvar Alterações' : 'Salvar e Gerar Link de Convite'}
                      </Button>
                    </DialogFooter>
                  )}
                  {isViewOnly && (
                    <DialogFooter className="pt-4 border-t border-slate-800">
                      <Button type="button" onClick={() => setIsInviteOpen(false)} className="bg-slate-800 hover:bg-slate-700 w-full md:w-auto min-w-[200px]">
                        Fechar Visualização
                      </Button>
                    </DialogFooter>
                  )}
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
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
                {users.filter(u => showAuditMode || (u.name && u.role)).map((u) => (
                  <TableRow key={u.id} className="border-slate-800 hover:bg-slate-900/50">
                    <TableCell className="font-medium text-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 overflow-hidden">
                          {u.photo_url ? (
                            <Image src={u.photo_url} alt={u.name} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                          ) : (
                            <UserIcon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-slate-200">{u.nickname || u.name || 'Sem nome'}</span>
                          {u.nickname && <span className="text-[10px] text-slate-500">{u.name}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(u.roles || (u.role ? [u.role] : [])).map((r) => (
                          <span key={r} className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase",
                            r === 'owner' ? "bg-purple-500/10 text-purple-500" :
                              r === 'barber' ? "bg-blue-500/10 text-blue-500" :
                                "bg-slate-500/10 text-slate-500"
                          )}>
                            {getRoleLabel(r)}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center gap-1 group relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10"
                            onClick={() => handleEditClick(u, true)}
                            title="Visualizar Detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Presence Dot */}
                          {(() => {
                            const lastSeen = u.last_seen_at ? new Date(u.last_seen_at) : null;
                            const now = new Date();
                            const diffMinutes = lastSeen ? (now.getTime() - lastSeen.getTime()) / 60000 : Infinity;

                            let color = "bg-red-500"; // Offline
                            let label = "Deslogado";

                            if (diffMinutes < 5) {
                              color = "bg-emerald-500 animate-pulse";
                              label = "Ativo agora";
                            } else if (diffMinutes < 15) {
                              color = "bg-yellow-500";
                              label = "Inativo (+10 min)";
                            }

                            return (
                              <div className="relative flex items-center h-8" title={label}>
                                <div className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-slate-900", color)} />
                              </div>
                            );
                          })()}
                        </div>
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
                            <DropdownMenuLabel className="text-xs text-slate-500 font-normal">Contratos & Arquivos</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(u);
                                setIsContractOpen(true);
                              }}
                              className="text-slate-300 focus:bg-slate-800 cursor-pointer"
                            >
                              <FileText className="mr-2 h-4 w-4 text-blue-400" />
                              Gerar Contrato
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(u);
                                setIsFilesOpen(true);
                              }}
                              className="text-slate-300 focus:bg-slate-800 cursor-pointer"
                            >
                              <FolderOpen className="mr-2 h-4 w-4 text-amber-400" />
                              Arquivos / Upload
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-800" />
                            <DropdownMenuItem onClick={() => handleGenerateLink(u.id)} className="text-blue-400 focus:text-blue-400">
                              <Key className="mr-2 h-4 w-4" />
                              Gerar Link de Convite
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-800" />
                            <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={() => handleRemoveUser(u.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Arquivar / Inativar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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

      <GenerateContractDialog
        open={isContractOpen}
        onOpenChange={setIsContractOpen}
        user={selectedUser}
      />

      <UserFilesDialog
        open={isFilesOpen}
        onOpenChange={setIsFilesOpen}
        user={selectedUser}
      />
    </Card>
  );
}
