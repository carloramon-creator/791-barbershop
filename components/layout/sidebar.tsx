import { useState } from 'react';
import Link from 'next/link';
import { useEffect } from 'react';
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
    Settings,
    ShieldCheck,
    Menu,
    X,
    Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PLAN_CONFIG } from '@/lib/constants';
import Image from 'next/image';
import { getBusinessTexts } from '@/lib/business-dictionary';
import { getBusinessTheme } from '@/lib/business-theme';

export function Sidebar() {
    const pathname = usePathname();
    const { role, tenant, signOut, isSystemAdmin } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const planConfig = PLAN_CONFIG[(tenant?.plan as keyof typeof PLAN_CONFIG) || 'basic'];

    const texts = getBusinessTexts(tenant?.business_type);
    const theme = getBusinessTheme(tenant?.business_type);

    // Close sidebar on navigation
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Salvar tenant no localStorage para relatórios em novas abas
    useEffect(() => {
        if (tenant) {
            localStorage.setItem('sb-tenant-branding', JSON.stringify({ name: tenant.name, logo_url: tenant.logo_url }));
        }
    }, [tenant]);


    const menuItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'staff'], feature: 'queue' },
        { name: `Fila (${texts.professional})`, href: '/barbeiro', icon: UserCheck, roles: ['owner', 'barber', 'staff'], feature: 'queue', module: 'queue' },
        { name: 'Agendamentos', href: '/agendamentos', icon: Calendar, roles: ['owner', 'barber', 'staff'], feature: 'queue', module: 'appointments' },
        { name: texts.clients, href: '/clientes', icon: Users, roles: ['owner', 'barber', 'staff'], feature: 'queue' },
        { name: texts.professionals, href: '/barbeiros', icon: Users, roles: ['owner', 'staff'], feature: 'queue' },
        { name: texts.services, href: '/servicos', icon: Scissors, roles: ['owner', 'staff'], feature: 'queue' },
        { name: 'Produtos', href: '/produtos', icon: ShoppingBag, roles: ['owner', 'staff'], feature: 'queue' },
        { name: 'Estoque', href: '/estoque', icon: ShoppingBag, roles: ['owner', 'staff'], feature: 'inventory' },
        { name: 'Financeiro', href: '/financeiro', icon: BarChart3, roles: ['owner'], feature: 'finance' },
        { name: 'Configurações', href: '/configuracoes/barbearia', icon: Settings, roles: ['owner'], feature: 'queue' },
        { name: 'Super Admin', href: '/geral', icon: ShieldCheck, roles: ['owner'], isSystemOnly: true },
    ];

    const filteredMenu = menuItems.filter(item => {
        // Admins do sistema vêem tudo
        if (isSystemAdmin) return true;

        if ((item as any).isSystemOnly && !isSystemAdmin) return false;
        const roleAllowed = !item.roles || (role && item.roles.includes(role));
        if (!roleAllowed) return false;

        // Filtrar por módulo ativo (se definido no item)
        if ((item as any).module === 'queue' && !tenant?.module_queue_enabled) return false;
        if ((item as any).module === 'appointments' && !tenant?.module_appointments_enabled) return false;

        const plan = (tenant?.plan || 'basic').toLowerCase();

        if (item.feature === 'finance') {
            return plan === 'premium' || plan === 'complete' || planConfig.features.includes('finance') || planConfig.features.includes('all');
        }

        if (item.feature === 'inventory') {
            return plan === 'premium' || planConfig.features.includes('all');
        }

        return true;
    });


    return (
        <>
            {/* Mobile Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "fixed bottom-6 right-6 z-50 w-14 h-14 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 border-4 border-slate-950 light:border-white",
                    tenant?.business_type === 'beauty_salon' ? "bg-pink-600" : "bg-blue-600"
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
                "fixed inset-y-0 left-0 z-40 w-72 bg-[#0a1628] border-r border-blue-500/20 flex flex-col h-screen transition-all duration-300 md:relative md:translate-x-0 overflow-hidden shadow-[10px_0_30px_-15px_rgba(37,99,235,0.2)]",
                !isOpen && "-translate-x-full md:translate-x-0"
            )}>
                <div className="p-6">
                    <div className="flex items-center gap-3 text-blue-600 font-black text-xl tracking-tighter uppercase">
                        {tenant?.logo_url ? (
                            <>
                                <Image src={tenant.logo_url} alt={tenant.name || 'Logo'} width={32} height={32} className="w-8 h-8 rounded-lg object-cover" unoptimized />
                                {tenant.name}
                            </>
                        ) : (
                            <>
                                <div className={cn("p-1.5 rounded-lg text-white", tenant?.business_type === 'beauty_salon' ? "bg-pink-600" : "bg-blue-600")}>
                                    {tenant?.business_type === 'beauty_salon' ? <Sparkles className="w-5 h-5" /> : <Scissors className="w-5 h-5" />}
                                </div>
                                791 <span className="text-slate-100">{tenant?.business_type === 'beauty_salon' ? 'Beauty' : 'Barber'}</span>
                            </>
                        )}
                    </div>
                </div>

                <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto no-scrollbar">
                    {filteredMenu.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all relative group",
                                pathname === item.href
                                    ? tenant?.business_type === 'beauty_salon'
                                        ? "bg-pink-600 text-white shadow-lg shadow-pink-600/30"
                                        : "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                            )}
                        >
                            <item.icon className={cn(
                                "w-4 h-4 transition-transform group-hover:scale-110",
                                pathname === item.href ? "text-white" : "text-inherit"
                            )} />
                            {item.name}
                            {pathname === item.href && (
                                <div className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full" />
                            )}
                        </Link>
                    ))}
                </nav>

                <div className="p-6 mt-auto border-t border-slate-800">
                    <Button
                        variant="ghost"
                        className="w-full flex justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl font-bold transition-colors"
                        onClick={signOut}
                    >
                        <LogOut className="w-5 h-5" />
                        Sair do Painel
                    </Button>
                </div>
            </div >
        </>
    );
}
