'use client';

import { useAuth } from '@/lib/auth-provider';
import { User } from 'lucide-react';

export function Topbar() {
    const { user, role } = useAuth();

    return (
        <header className="h-16 border-b border-slate-800 bg-slate-900 px-8 flex items-center justify-between">
            <div className="text-sm text-slate-400">
                Painel Administrativo
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right">
                    <div className="text-sm font-medium text-slate-100">{user?.email}</div>
                    <div className="text-xs text-slate-500 capitalize">{role === 'owner' ? 'Proprietário' : 'Barbeiro'}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                    <User className="w-6 h-6" />
                </div>
            </div>
        </header>
    );
}
