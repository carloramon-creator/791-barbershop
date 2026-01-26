'use client';

import { useAuth } from '@/lib/auth-provider';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function PendingConfigAlert() {
    const { tenant } = useAuth();
    const [missingItems, setMissingItems] = useState<string[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!tenant) return;

        const missing = [];

        // 1. Logo
        if (!tenant.logo_url) missing.push('Logo da Barbearia');

        // 2. Endereço Completo (Basic Check)
        if (!tenant.cep || !tenant.street || !tenant.number || !tenant.neighborhood || !tenant.city || !tenant.state) {
            missing.push('Endereço Completo');
        }

        // 3. Dados Bancários / Pix
        if (!tenant.pix_key) {
            missing.push('Dados Bancários ou Pix');
        }

        // 4. Slug
        if (!tenant.slug) {
            missing.push('Link Personalizado (Slug)');
        }

        setMissingItems(missing);
        setIsVisible(missing.length > 0);

    }, [tenant]);

    if (!isVisible || missingItems.length === 0) return null;

    return (
        <div className="w-full py-3 px-4 bg-orange-950/30 border-b border-orange-500/20 backdrop-blur-sm flex flex-col md:flex-row items-center justify-center gap-4 transition-all animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3 text-sm text-orange-400">
                <div className="p-2 bg-orange-500/10 rounded-full">
                    <AlertTriangle size={18} />
                </div>
                <div className="flex flex-col">
                    <span className="font-bold uppercase tracking-wide text-xs">Configuração Incompleta</span>
                    <span className="text-xs text-orange-400/80">
                        Faltam {missingItems.length} itens: {missingItems.slice(0, 2).join(', ')} {missingItems.length > 2 && `+${missingItems.length - 2} outros...`}
                    </span>
                </div>
            </div>

            <Link href="/geral/configuracoes">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500 text-slate-950 text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-900/20 cursor-pointer hover:bg-orange-400">
                    Completar Perfil <ArrowRight size={12} />
                </div>
            </Link>
        </div>
    );
}
