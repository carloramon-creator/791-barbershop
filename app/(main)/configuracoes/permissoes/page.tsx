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
import { cn } from '@/lib/utils';

const PERMISSIONS_LIST = [
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

    if (role !== 'owner') return <div className="p-8 text-red-500">Acesso restrito.</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-100 italic flex items-center gap-2">
                    <Shield className="text-blue-500" /> Níveis de Acesso
                </h1>
                <p className="text-slate-400 font-medium">Veja o que cada função pode realizar no sistema.</p>
            </div>

            <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-lg flex gap-3 text-blue-100 italic">
                <Info className="shrink-0" />
                <p className="text-sm">
                    <strong>Nota:</strong> Atualmente as permissões são predefinidas para garantir a segurança da sua barbearia.
                    Em breve, você poderá personalizar cada regra individualmente.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cards de Resumo */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600/20 p-2 rounded-lg"><Crown className="text-blue-500 w-5 h-5" /></div>
                        <h2 className="text-lg font-bold">Proprietário</h2>
                    </div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Acesso Total</p>
                    <p className="text-sm text-slate-400 italic">Controla todas as engrenagens da barbearia, desde o financeiro até a equipe.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-800 p-2 rounded-lg"><Briefcase className="text-slate-400 w-5 h-5" /></div>
                        <h2 className="text-lg font-bold">Funcionário</h2>
                    </div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Gerencial Interno</p>
                    <p className="text-sm text-slate-400 italic">Responsável por organizar a fila e atender os clientes, sem ver dados sensíveis.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-800 p-2 rounded-lg"><User className="text-slate-400 w-5 h-5" /></div>
                        <h2 className="text-lg font-bold">Barbeiro</h2>
                    </div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Operacional</p>
                    <p className="text-sm text-slate-400 italic">Focado em atender seus próprios clientes e gerenciar o tempo do serviço.</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-8">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-slate-800">
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Funcionalidade</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Proprietário</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Staff</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Barbeiro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {PERMISSIONS_LIST.map((p, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-slate-200">{p.action}</div>
                                        <div className="text-[10px] text-slate-500">{p.desc}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        {p.owner ? <Check className="w-5 h-5 text-emerald-500 mx-auto" /> : <X className="w-5 h-5 text-slate-700 mx-auto" />}
                                    </td>
                                    <td className="p-4 text-center">
                                        {p.staff ? <Check className="w-5 h-5 text-emerald-500 mx-auto" /> : <X className="w-5 h-5 text-slate-700 mx-auto" />}
                                    </td>
                                    <td className="p-4 text-center">
                                        {p.barber ? <Check className="w-5 h-5 text-emerald-500 mx-auto" /> : <X className="w-5 h-5 text-slate-700 mx-auto" />}
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
