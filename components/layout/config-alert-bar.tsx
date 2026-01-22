'use client';

import { useAuth } from '@/lib/auth-provider';
import { AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function ExpirationAlert() {
    const { tenant } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

    useEffect(() => {
        if (tenant?.subscription_current_period_end && tenant?.subscription_status !== 'active') {
            const end = new Date(tenant.subscription_current_period_end);
            const now = new Date();
            const diffTime = end.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            setDaysRemaining(diffDays);

            // Mostrar alert se faltar 7 dias ou menos
            if (diffDays <= 7) {
                setIsVisible(true);
            }
        }
    }, [tenant]);

    if (!isVisible || daysRemaining === null) return null;

    const isExpired = daysRemaining <= 0;

    return (
        <div className={cn(
            "w-full py-2 px-4 flex items-center justify-center gap-4 transition-all animate-in slide-in-from-top duration-500",
            isExpired ? "bg-red-600 text-white" : "bg-amber-500 text-slate-950"
        )}>
            <div className="flex items-center gap-2 text-xs md:text-sm font-black uppercase tracking-tight">
                <AlertCircle size={16} className={cn(isExpired ? "text-white" : "text-slate-900")} />
                {isExpired ? (
                    <span>Sua assinatura expirou! Regularize agora para evitar o bloqueio total do sistema.</span>
                ) : (
                    <span>Atenção: Seu plano vence em {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}. Garanta a continuidade do seu acesso!</span>
                )}
            </div>
            <Link href="/configuracoes/plano">
                <div className={cn(
                    "flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg",
                    isExpired ? "bg-white text-red-600 shadow-red-900/20" : "bg-slate-950 text-amber-500 shadow-amber-900/20"
                )}>
                    Renovar Agora <ArrowRight size={12} />
                </div>
            </Link>
        </div>
    );
}
