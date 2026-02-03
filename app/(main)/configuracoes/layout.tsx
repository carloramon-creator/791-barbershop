'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Building2, Users, Shield, CreditCard, FileText, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';
import { getBusinessTheme } from '@/lib/business-theme';

export default function ConfiguracoesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { tenant } = useAuth();
    const theme = getBusinessTheme(tenant?.business_type);


    const tabs = [
        { name: 'Geral', href: '/configuracoes/barbearia', icon: Building2 },
        { name: 'Usuários', href: '/configuracoes/usuarios', icon: Users },
        { name: 'Permissões', href: '/configuracoes/permissoes', icon: Shield },
        { name: 'Plano', href: '/configuracoes/plano', icon: CreditCard },
        { name: 'Faturas', href: '/configuracoes/faturas', icon: FileText },
        { name: 'WhatsApp', href: '/configuracoes/whatsapp', icon: MessageCircle },
    ];

    const isCurrentTab = (href: string) => pathname === href;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold text-slate-100 tracking-tighter">Configurações</h1>
                <div className="flex space-x-1 border-b border-slate-800 bg-slate-900/50 p-1 rounded-t-lg overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            style={{
                                backgroundColor: isCurrentTab(tab.href) ? theme.primaryHex : 'transparent',
                            }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                                isCurrentTab(tab.href)
                                    ? "text-white shadow-lg shadow-black/20"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.name}
                        </Link>
                    ))}
                </div>
            </div>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {children}
            </div>
        </div>
    );
}
