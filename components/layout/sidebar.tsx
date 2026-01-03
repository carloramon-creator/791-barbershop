'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';
import {
    Users,
    Scissors,
    ShoppingBag,
    LayoutDashboard,
    BarChart3,
    LogOut,
    UserCheck,
    Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PLAN_CONFIG } from '@/lib/constants';

export function Sidebar() {
    const pathname = usePathname();
    const { role, tenant, signOut } = useAuth();
    const planConfig = PLAN_CONFIG[(tenant?.plan as keyof typeof PLAN_CONFIG) || 'basic'];

    const menuItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'staff'], feature: 'queue' },
        { name: 'Fila (Barbeiro)', href: '/barbeiro', icon: UserCheck, roles: ['owner', 'barber', 'staff'], feature: 'queue' },
        { name: 'Barbeiros', href: '/barbeiros', icon: Users, roles: ['owner', 'staff'], feature: 'queue' },
        { name: 'Serviços', href: '/servicos', icon: Scissors, roles: ['owner', 'staff'], feature: 'queue' },
        { name: 'Produtos', href: '/produtos', icon: ShoppingBag, roles: ['owner', 'staff'], feature: 'queue' },
        { name: 'Financeiro', href: '/financeiro', icon: BarChart3, roles: ['owner'], feature: 'finance' },
        { name: 'Configurações', href: '/configuracoes/barbearia', icon: Settings, roles: ['owner'], feature: 'queue' },
    ];

    const filteredMenu = menuItems.filter(item => {
        // Filter by role
        const roleAllowed = !item.roles || (role && item.roles.includes(role));
        if (!roleAllowed) return false;

        // Filter by plan feature
        if (item.feature === 'finance') {
            return planConfig.features.includes('finance') || planConfig.features.includes('all');
        }

        return true;
    });

    return (
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
            <div className="p-6">
                <div className="flex items-center gap-3 text-blue-500 font-bold text-xl">
                    {useAuth().tenant?.logo_url ? (
                        <>
                            <img src={useAuth().tenant?.logo_url} alt={useAuth().tenant?.name} className="w-8 h-8 rounded-lg object-cover" />
                            {useAuth().tenant?.name || 'My Barber'}
                        </>
                    ) : (
                        <>
                            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                                <Scissors className="w-6 h-6" />
                            </div>
                            {useAuth().tenant?.name || '791 Barber'}
                        </>
                    )}
                </div>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1">
                {filteredMenu.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                            pathname === item.href
                                ? "bg-blue-600/10 text-blue-500"
                                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                        )}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.name}
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <Button
                    variant="ghost"
                    className="w-full flex justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                    onClick={signOut}
                >
                    <LogOut className="w-5 h-5" />
                    Sair
                </Button>
            </div>
        </div>
    );
}
