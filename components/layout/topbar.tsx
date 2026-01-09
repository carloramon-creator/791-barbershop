'use client';

import { useAuth } from '@/lib/auth-provider';
import { User, Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import { Button } from '@/components/ui/button';

export function Topbar() {
    const { user, role } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="h-16 border-b border-slate-800 bg-slate-900 px-4 md:px-8 flex items-center justify-between transition-colors shadow-sm">
            <div className="flex items-center gap-4">
                {/* Menu Hamburguer aparecerá apenas no mobile se necessário futuramente */}
                <div className="text-sm font-bold text-slate-400 hidden md:block uppercase tracking-widest">
                    Painel Administrativo
                </div>
                <div className="md:hidden text-lg font-black text-blue-600">791</div>
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
        </header>
    );
}
