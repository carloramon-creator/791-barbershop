"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Activity, UserPlus, FileText, Settings, DollarSign, Store } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityItem {
    id: string;
    type: 'user' | 'finance' | 'system' | 'store';
    title: string;
    description: string;
    timestamp: Date;
    user?: {
        name: string;
        image?: string;
        initials: string;
    };
}

const mockActivities: ActivityItem[] = [
    {
        id: '1',
        type: 'user',
        title: 'Novo Usuário Registrado',
        description: 'Carlos Silva se cadastrou na 791 Barber.',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
        user: { name: 'Carlos Silva', initials: 'CS' }
    },
    {
        id: '2',
        type: 'finance',
        title: 'Pagamento Recebido',
        description: 'Pagamento de R$ 150,00 confirmado via Pix.',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
        user: { name: 'Sistema', initials: 'SYS' }
    },
    {
        id: '3',
        type: 'store',
        title: 'Nova Barbearia Ativa',
        description: 'Barbearia "Cortes Modernos" finalizou a configuração.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        user: { name: 'Admin', initials: 'AD' }
    },
    {
        id: '4',
        type: 'system',
        title: 'Atualização de Sistema',
        description: 'Deploy v2.1.0 realizado com sucesso.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        user: { name: 'Ramon', initials: 'RM' }
    },
    {
        id: '5',
        type: 'user',
        title: 'Login de Super Admin',
        description: 'Acesso detectado via IP 192.168.1.1',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        user: { name: 'Ramon', initials: 'RM' }
    }
];

const iconMap = {
    user: { icon: UserPlus, color: "text-blue-500", bg: "bg-blue-500/10" },
    finance: { icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    system: { icon: Settings, color: "text-slate-500", bg: "bg-slate-500/10" },
    store: { icon: Store, color: "text-purple-500", bg: "bg-purple-500/10" }
};

export function RecentActivityFeed() {
    return (
        <Card className="bg-slate-900/40 border-slate-800 shadow-2xl backdrop-blur-sm">
            <CardHeader className="border-b border-white/5 pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500" />
                        Atividade Recente
                    </CardTitle>
                    <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-bold animate-pulse">
                        LIVE
                    </span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                    {mockActivities.map((item, index) => {
                        const Icon = iconMap[item.type].icon;
                        return (
                            <div
                                key={item.id}
                                className="flex items-start gap-4 p-4 hover:bg-white/5 transition-colors group animate-in slide-in-from-left-4 fade-in duration-500"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className={cn("p-2 rounded-xl mt-1", iconMap[item.type].bg)}>
                                    <Icon className={cn("w-4 h-4", iconMap[item.type].color)} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-bold text-slate-200">{item.title}</p>
                                        <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                                            {formatDistanceToNow(item.timestamp, { addSuffix: true, locale: ptBR })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        {item.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Avatar className="w-5 h-5 border border-slate-700">
                                            <AvatarImage src={item.user?.image} />
                                            <AvatarFallback className="text-[9px] bg-slate-800 text-slate-300 font-bold">
                                                {item.user?.initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                            {item.user?.name}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
