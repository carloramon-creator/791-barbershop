'use client';

import { useAuth } from '@/lib/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
    LayoutDashboard,
    Store,
    Settings,
    Ticket,
    Users,
    LogOut,
    ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { isSystemAdmin, loading, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !isSystemAdmin) {
            router.push('/dashboard');
        }
    }, [isSystemAdmin, loading, router]);

    if (loading || !isSystemAdmin) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    const navItems = [
        { name: 'Dashboard', href: '/geral', icon: LayoutDashboard },
        { name: 'Barbearias', href: '/geral/barbearias', icon: Store },
        { name: 'Cupons', href: '/geral/cupons', icon: Ticket },
        { name: 'Configurações API', href: '/geral/configuracoes', icon: Settings },
        { name: 'Administradores', href: '/geral/usuarios', icon: ShieldCheck },
    ];

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
                <div className="p-6">
                    <div className="flex items-center gap-3 px-2 mb-8">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                            <span className="text-xl font-black text-white">791</span>
                        </div>
                        <div>
                            <h2 className="text-slate-100 font-black tracking-tighter uppercase text-lg leading-none">Admin</h2>
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">SaaS Control</p>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        {navItems.map((item) => {
                            const active = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                                        active
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                                    )}
                                >
                                    <item.icon size={18} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-auto p-6 border-t border-slate-800">
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-bold text-sm"
                    >
                        <LogOut size={18} />
                        Sair do Painel
                    </button>
                </div>
            </aside>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-8">
                {children}
            </main>
        </div>
    );
}
