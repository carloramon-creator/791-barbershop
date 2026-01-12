'use client';

import { useAuth } from '@/lib/auth-provider';
import {
    Shield,
    Check,
    X,
    Briefcase,
    User,
    Crown,
    Info
} from 'lucide-react';

// ... imports
import { Api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Tenant } from '@/lib/types';

const DEFAULT_PERMISSIONS_LIST = [
    {
        action: 'Ver Dashboard',
        owner: true,
        staff: true,
        barber: true,
        desc: 'Visualizar estatísticas básicas do dia.'
    },
    {
        action: 'Gerenciar Fila de Todos',
        owner: true,
        staff: true,
        barber: false,
        desc: 'Chamar clientes de qualquer barbeiro.'
    },
    {
        action: 'Gerenciar Própria Fila',
        owner: true,
        staff: true,
        barber: true,
        desc: 'Chamar clientes vinculados ao seu nome.'
    },
    {
        action: 'Ver Financeiro',
        owner: true,
        staff: false,
        barber: false,
        desc: 'Acesso a faturamento, lucros e despesas.'
    },
    {
        action: 'Gerenciar Colaboradores',
        owner: true,
        staff: false,
        barber: false,
        desc: 'Adicionar ou remover barbeiros e staff.'
    },
    {
        action: 'Alterar Plano / Pagamentos',
        owner: true,
        staff: false,
        barber: false,
        desc: 'Upgrade, downgrade ou cancelamento.'
    },
    {
        action: 'Configurações da Barbearia',
        owner: true,
        staff: false,
        barber: false,
        desc: 'Nome, logo, endereço e horários.'
    },
];

export default function PermissoesPage() {
    const { role } = useAuth();
    const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS_LIST);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const tenant = await Api.getBarbershop();
            if (tenant?.settings?.permissions) {
                // Merge saved permissions with default structure to handle new permissions added in code
                const merged = DEFAULT_PERMISSIONS_LIST.map(def => {
                    const saved = tenant.settings?.permissions?.find((p: any) => p.action === def.action);
                    return saved ? { ...def, ...saved } : def;
                });
                setPermissions(merged);
            }
        } catch (error) {
            console.error("Erro ao carregar configurações", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (index: number, role: 'staff' | 'barber') => {
        const newPermissions = [...permissions];
        newPermissions[index] = {
            ...newPermissions[index],
            [role]: !newPermissions[index][role]
        };
        setPermissions(newPermissions);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Get current tenant to preserve other settings
            const currentTenant = await Api.getBarbershop();
            const currentSettings = currentTenant.settings || {};

            await Api.updateBarbershop({
                settings: {
                    ...currentSettings,
                    permissions: permissions
                }
            });
            toast.success('Permissões salvas com sucesso!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar permissões.');
        } finally {
            setSaving(false);
        }
    };

    if (role !== 'owner') return <div className="p-8 text-red-500">Acesso restrito.</div>;

    if (loading) {
        return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
                        <Shield className="text-blue-500" /> Níveis de Acesso
                    </h1>
                    <p className="text-slate-400 font-medium">Personalize o que cada função pode realizar no sistema.</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Alterações
                </Button>
            </div>

            <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-lg flex gap-3 text-blue-100">
                <Info className="shrink-0" />
                <p className="text-sm">
                    <strong>Como funciona:</strong> Marque as caixas para conceder acesso. O proprietário sempre tem acesso total.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cards de Resumo */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 opacity-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600/20 p-2 rounded-lg"><Crown className="text-blue-500 w-5 h-5" /></div>
                        <h2 className="text-lg font-bold">Proprietário</h2>
                    </div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Acesso Total</p>
                    <p className="text-sm text-slate-400">Controle total (não editável).</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-800 p-2 rounded-lg"><Briefcase className="text-slate-400 w-5 h-5" /></div>
                        <h2 className="text-lg font-bold">Funcionário</h2>
                    </div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Configurável</p>
                    <p className="text-sm text-slate-400">Defina o que a equipe de balcão/gerência pode fazer.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-800 p-2 rounded-lg"><User className="text-slate-400 w-5 h-5" /></div>
                        <h2 className="text-lg font-bold">Barbeiro</h2>
                    </div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Configurável</p>
                    <p className="text-sm text-slate-400">Defina os acessos operacionais dos barbeiros.</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-8">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-slate-800">
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Funcionalidade</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center opacity-50">Proprietário</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Staff</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Barbeiro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {permissions.map((p, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-slate-200">{p.action}</div>
                                        <div className="text-[10px] text-slate-500">{p.desc}</div>
                                    </td>
                                    <td className="p-4 text-center opacity-50">
                                        <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                                    </td>
                                    <td className="p-4 text-center">
                                        <input
                                            type="checkbox"
                                            checked={p.staff}
                                            onChange={() => handleToggle(idx, 'staff')}
                                            className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500/20 focus:ring-offset-0 cursor-pointer accent-blue-600"
                                        />
                                    </td>
                                    <td className="p-4 text-center">
                                        <input
                                            type="checkbox"
                                            checked={p.barber}
                                            onChange={() => handleToggle(idx, 'barber')}
                                            className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500/20 focus:ring-offset-0 cursor-pointer accent-blue-600"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
