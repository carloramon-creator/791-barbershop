'use client';

import { useAuth } from '@/lib/auth-provider';
import { User, Sun, Moon, Menu, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import { Button } from '@/components/ui/button';

export function Topbar() {
    const { user, role, isImpersonating, tenant } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="flex flex-col border-b border-[var(--primary-muted)] bg-[var(--sidebar-bg)] transition-colors shadow-lg">
            {isImpersonating && (
                <div className="bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest py-1.5 px-4 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={12} />
                        Imporsonando Barbieria: <span className="underline">{tenant?.name}</span>
                    </div>
                    <a href="/api/system/impersonate?stop=true" className="bg-white text-amber-600 px-2 py-0.5 rounded font-bold hover:bg-slate-100 transition-colors">
                        Parar Acesso
                    </a>
                </div>
            )}
            <div className="h-16 px-4 md:px-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Menu Hamburguer aparecerá apenas no mobile se necessário futuramente */}
                    <div className="text-sm font-bold text-slate-400 hidden md:block uppercase tracking-widest">
                        Painel Administrativo
                    </div>
                    <div className="md:hidden text-lg font-black text-[var(--text-branding)]">791</div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className="w-10 h-10 rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-5 h-5 text-yellow-500" />
                        ) : (
                            <Moon className="w-5 h-5 text-slate-700 fill-slate-700" />
                        )}
                    </Button>

                    <div className="flex items-center gap-3 pl-2 md:pl-4 border-l border-slate-800">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-slate-100">{user?.email?.split('@')[0]}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">{role === 'owner' ? 'Dono' : 'Barbeiro'}</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                            <User className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
