import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';
import {
    LayoutDashboard,
    Users,
    Scissors,
    ShoppingBag,
    BarChart3,
    Settings,
    ShieldCheck,
    Menu,
    X,
    Calendar,
    Sparkles,
    HelpCircle,
    ChevronDown,
    ChevronRight,
    LogOut,
    UserCheck,
    CreditCard,
    Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Image from 'next/image';
import { getBusinessTexts } from '@/lib/business-dictionary';
import { SupportDialog } from '@/components/support/SupportDialog';

interface MenuItem {
    name: string;
    href: string;
    icon: any;
    roles?: string[];
    permission?: string;
    module?: string;
    newTab?: boolean;
    isSystemOnly?: boolean;
}

interface MenuGroup {
    label: string;
    items: MenuItem[];
    roles?: string[];
    isSystemOnly?: boolean;
}

export function Sidebar() {
    const pathname = usePathname();
    const { role, tenant, signOut, isSystemAdmin, isImpersonating } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [showSupport, setShowSupport] = useState(false);

    // Collapsible states
    const [openGroups, setOpenGroups] = useState<string[]>(['Gestão', 'Financeiro']);

    const texts = getBusinessTexts(tenant?.business_type);

    // Close sidebar on navigation
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    const activeAddons = tenant?.active_addons || [];

    // Helper to check permissions
    const checkPermission = (item: MenuItem) => {
        if (isSystemAdmin) return true;
        if (item.isSystemOnly && !isSystemAdmin) return false;

        const roleAllowed = !item.roles || (role && item.roles.includes(role));
        if (!roleAllowed) return false;

        if (item.module === 'queue' && !tenant?.module_queue_enabled) return false;
        if (item.module === 'appointments' && !tenant?.module_appointments_enabled) return false;

        const planPermissions = (tenant as any)?.system_plan?.menu_permissions || ['dashboard', 'queue', 'appointments', 'clients', 'services'];

        if (item.permission) {
            const allowedByPlan = planPermissions.includes(item.permission);
            const allowedByAddon =
                (item.permission === 'finance' && activeAddons.includes('finance_module')) ||
                (item.permission === 'inventory' && activeAddons.includes('inventory'));

            if (!allowedByPlan && !allowedByAddon) return false;
        }

        return true;
    };

    const menuGroups: MenuGroup[] = [
        {
            label: 'Principal',
            items: [
                { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'staff'], permission: 'dashboard' },
            ]
        },
        {
            label: 'Gestão',
            items: [
                { name: `Fila (${texts.professional})`, href: '/barbeiro', icon: UserCheck, roles: ['owner', 'barber', 'staff'], permission: 'queue', module: 'queue' },
                { name: 'Agendamentos', href: '/agendamentos', icon: Calendar, roles: ['owner', 'barber', 'staff'], permission: 'appointments', module: 'appointments' },
                { name: texts.clients, href: '/clientes', icon: Users, roles: ['owner', 'barber', 'staff'], permission: 'clients' },
                { name: texts.professionals, href: '/barbeiros', icon: Users, roles: ['owner', 'staff'], permission: 'professionals' },
                { name: texts.services, href: '/servicos', icon: Scissors, roles: ['owner', 'staff'], permission: 'services' },
            ]
        },
        {
            label: 'Comercial',
            items: [
                { name: 'Produtos', href: '/produtos', icon: ShoppingBag, roles: ['owner', 'staff'], permission: 'products' },
                { name: 'Estoque', href: '/estoque', icon: Briefcase, roles: ['owner', 'staff'], permission: 'inventory', module: 'inventory' },
                { name: 'Financeiro', href: '/financeiro', icon: BarChart3, roles: ['owner'], permission: 'finance', module: 'finance' },
            ]
        },
        {
            label: 'Configurações',
            items: [
                { name: 'Configurações', href: '/configuracoes/barbearia', icon: Settings, roles: ['owner', 'staff'] },
                { name: 'Manual do Sistema', href: '/tutoriais', icon: HelpCircle, roles: ['owner', 'staff'], newTab: true },
            ]
        },
        {
            label: 'Super Admin',
            isSystemOnly: true,
            items: [
                { name: 'Visão Geral', href: '/geral', icon: ShieldCheck, roles: ['owner'] },
                { name: 'Financeiro Holding', href: '/geral/financeiro', icon: CreditCard, roles: ['owner'] },
            ]
        }
    ];

    const toggleGroup = (label: string) => {
        setOpenGroups(prev =>
            prev.includes(label)
                ? prev.filter(g => g !== label)
                : [...prev, label]
        );
    };

    return (
        <>
            {/* Mobile Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "fixed bottom-6 right-6 z-50 w-14 h-14 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 border-4 border-slate-950 light:border-white md:hidden",
                    "bg-blue-600"
                )}
            >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-40 w-72 border-r flex flex-col h-screen transition-all duration-300 md:relative md:translate-x-0 overflow-hidden shadow-2xl",
                "bg-slate-900 border-slate-800",
                !isOpen && "-translate-x-full md:translate-x-0"
            )}>
                {/* Header */}
                <div className="p-6 pb-2">
                    <div className="flex items-center gap-3 font-black text-xl tracking-tighter uppercase text-blue-600">
                        {tenant?.logo_url ? (
                            <>
                                <Image src={tenant.logo_url} alt={tenant.name || 'Logo'} width={32} height={32} className="w-8 h-8 rounded-lg object-cover" unoptimized />
                                {tenant.name}
                            </>
                        ) : (
                            <>
                                <div className={cn("p-1.5 rounded-lg text-white bg-blue-600")}>
                                    {tenant?.business_type === 'beauty_salon' ? <Sparkles className="w-5 h-5" /> : <Scissors className="w-5 h-5" />}
                                </div>
                                791 <span className="text-slate-100">{tenant?.business_type === 'beauty_salon' ? 'Beauty' : 'Barber'}</span>
                            </>
                        )}
                    </div>

                    {isImpersonating && (
                        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <ShieldCheck size={12} /> Suporte Ativo
                            </p>
                            <button
                                onClick={() => window.location.href = '/api/system/impersonate?stop=true'}
                                className="w-full py-1.5 bg-amber-500 text-slate-900 text-[9px] font-black uppercase tracking-widest rounded hover:bg-amber-400 transition-colors"
                            >
                                Sair do Acesso
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto custom-scrollbar">
                    {menuGroups.map((group) => {
                        // Check if group should be visible
                        if (group.isSystemOnly && !isSystemAdmin) return null;

                        const visibleItems = group.items.filter(checkPermission);
                        if (visibleItems.length === 0) return null;

                        return (
                            <Collapsible
                                key={group.label}
                                open={openGroups.includes(group.label)}
                                onOpenChange={() => toggleGroup(group.label)}
                                className="space-y-1"
                            >
                                <div className="flex items-center justify-between px-2 mb-1">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        {group.label}
                                    </h4>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-slate-800 text-slate-500">
                                            {openGroups.includes(group.label) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                        </Button>
                                    </CollapsibleTrigger>
                                </div>

                                <CollapsibleContent className="space-y-1 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 backdrop:blur-sm">
                                    {visibleItems.map(item => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            target={item.newTab ? "_blank" : undefined}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all relative group",
                                                pathname === item.href
                                                    ? "bg-blue-600/10 text-blue-500 border border-blue-600/20"
                                                    : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                                            )}
                                        >
                                            <item.icon className={cn(
                                                "w-4 h-4 transition-transform group-hover:scale-110",
                                                pathname === item.href ? "text-blue-500" : "text-slate-500 group-hover:text-slate-300"
                                            )} />
                                            {item.name}
                                        </Link>
                                    ))}
                                </CollapsibleContent>
                            </Collapsible>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 space-y-2">
                    <button
                        onClick={() => setShowSupport(true)}
                        className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider group w-full px-2"
                    >
                        <Sparkles size={12} className="text-amber-500 group-hover:text-amber-400" />
                        Reportar Problema
                    </button>

                    <Button
                        variant="ghost"
                        className="w-full flex justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl font-bold transition-colors"
                        onClick={signOut}
                    >
                        <LogOut className="w-5 h-5" />
                        Sair
                    </Button>
                </div>
            </div>

            <SupportDialog open={showSupport} onOpenChange={setShowSupport} />
        </>
    );
}
