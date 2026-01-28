'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { ExpirationAlert, ConfigAlert } from '@/components/layout/config-alert-bar';
import { Topbar } from '@/components/layout/topbar';
import { PaymentAlertPopup } from '@/components/layout/payment-alert-popup';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { session, loading, tenant, isSystemAdmin, role } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // -- ISOLAMENTO SUPER ADMIN --
    // Se for Super Admin e tentar acessar área de tenants sem ter um tenant vinculado, 
    // força volta para /geral.
    useEffect(() => {
        if (!loading && session && isSystemAdmin) {
            // Se não for 'owner', 'staff' ou 'barber', assume Admin Puro que não deve estar aqui.
            // Ou se tenant for nulo.
            const hasTenantRole = ['owner', 'staff', 'barber'].includes(role || '');
            if (!hasTenantRole) {
                router.replace('/geral');
            }
        }
    }, [loading, session, isSystemAdmin, role, router]);

    // -- LÓGICA DE BLOQUEIO --
    let isBlocked = false;
    let isWhiteListed = false;

    if (!loading && session && tenant) {
        const status = tenant.subscription_status || '';
        const now = new Date();
        const endDate = tenant.subscription_current_period_end ? new Date(tenant.subscription_current_period_end) : null;
        const isFuture = endDate && endDate > now;

        // 1. ATIVO ou VENCIMENTO FUTURO -> Livre
        if (status === 'active' || isFuture) {
            isBlocked = false;
        } else {
            // 2. WhiteList (sempre livre)
            isWhiteListed =
                pathname.startsWith('/checkout') ||
                pathname.startsWith('/asaas/checkout') ||
                pathname === '/configuracoes/plano' ||
                pathname === '/configuracoes/barbearia';

            if (!isWhiteListed) {
                // 3. Status Irreversíveis no mês (apenas se vencido)
                if (['canceled', 'incomplete_expired'].includes(status) && !isFuture) {
                    isBlocked = true;
                } else {
                    // 4. Carência (10 dias) para TRIAL e ATRASO
                    // Usamos a maior data entre criação (trial) e fim do período anterior
                    const trialEndDate = new Date(tenant.created_at);
                    trialEndDate.setDate(trialEndDate.getDate() + 10);

                    const graceDate = endDate ? new Date(endDate) : trialEndDate;
                    // Se já tinha uma assinatura, damos +10 dias de carência após o 'vencimento'
                    if (endDate) {
                        graceDate.setDate(graceDate.getDate() + 10);
                    }

                    if (now > graceDate) {
                        isBlocked = true;
                    }
                }
            }
        }
    }

    useEffect(() => {
        if (!loading && !session) {
            router.push('/login');
            return;
        }

        if (isBlocked && !isWhiteListed) {
            router.push('/configuracoes/plano?expired=true');
        }
    }, [isBlocked, isWhiteListed, loading, session, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!session) return null;

    // Se estiver bloqueado e tentando ver conteúdo restrito, mostramos um fallback em vez do conteúdo original
    // para evitar "flicker" de dados confidenciais antes do redirect.
    const content = (isBlocked && !isWhiteListed) ? (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
            <p className="font-bold uppercase tracking-widest text-xs">Redirecionando para pagamentos...</p>
        </div>
    ) : children;

    return (
        <div className="flex h-screen bg-slate-950 light:bg-slate-50 overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Topbar />
                <ConfigAlert />
                <ExpirationAlert />
                <PaymentAlertPopup />
                <main className="flex-1 overflow-y-auto p-2 md:p-4 light:bg-white text-slate-50 light:text-slate-900 custom-scrollbar transition-colors">
                    <div className="w-full max-w-none">
                        {content}
                    </div>
                    <footer className="mt-8 py-4 text-center text-xs text-slate-600 light:text-slate-400">
                        Licensed by <span className="text-slate-500 font-semibold">791 Barber</span> • v2.1
                    </footer>
                </main>
            </div>
        </div>
    );
}
