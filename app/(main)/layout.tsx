'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { ExpirationAlert } from '@/components/layout/config-alert-bar';
import { Topbar } from '@/components/layout/topbar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { session, loading, tenant } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // -- LÓGICA DE BLOQUEIO --
    let isBlocked = false;
    let isWhiteListed = false;

    if (!loading && session && tenant) {
        const status = tenant.subscription_status || '';

        // 1. ATIVO -> Livre
        if (status === 'active') {
            isBlocked = false;
        } else {
            // 2. WhiteList (sempre livre)
            isWhiteListed =
                pathname.startsWith('/checkout') ||
                pathname === '/configuracoes/plano';

            if (!isWhiteListed) {
                // 3. Status Irreversíveis no mês
                if (['canceled', 'incomplete_expired'].includes(status)) {
                    isBlocked = true;
                } else {
                    // 4. Carência (10 dias) para TRIAL e ATRASO
                    // Vencimento = current_period_end (assinaturas) ou created_at (novos cadastros/trial)
                    const referenceDateStr = (['past_due', 'unpaid', 'incomplete'].includes(status) && tenant.subscription_current_period_end)
                        ? tenant.subscription_current_period_end
                        : tenant.created_at;

                    const referenceDate = new Date(referenceDateStr || tenant.created_at);
                    const now = new Date();
                    const diffTime = now.getTime() - referenceDate.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays > 10) {
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
                <ExpirationAlert />
                <main className="flex-1 overflow-y-auto p-2 md:p-4 light:bg-white text-slate-50 light:text-slate-900 custom-scrollbar transition-colors">
                    <div className="w-full max-w-none">
                        {content}
                    </div>
                    <footer className="mt-8 py-4 text-center text-xs text-slate-600 light:text-slate-400">
                        Licensed by <span className="text-slate-500 font-semibold">791 Barber</span>
                    </footer>
                </main>
            </div>
        </div>
    );
}
