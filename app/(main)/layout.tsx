'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { ConfigAlertBar } from '@/components/layout/config-alert-bar';
import { Topbar } from '@/components/layout/topbar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { session, loading, tenant } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !session) {
            router.push('/login');
            return;
        }


        if (!loading && session && tenant) {
            const status = tenant.subscription_status || '';

            // 1. Se estiver ATIVO, libera tudo
            if (status === 'active') return;

            // 2. Páginas Brancas (Checkout e Plano) - Sempre acessíveis
            const isWhiteListed =
                window.location.pathname.startsWith('/checkout') ||
                window.location.pathname === '/configuracoes/plano';

            if (isWhiteListed) return;

            // 3. Bloqueio Imediato para Status Irreversíveis no mês
            if (['canceled', 'incomplete_expired'].includes(status)) {
                router.push('/configuracoes/plano?expired=true');
                return;
            }

            // 4. Lógica de Carência (10 dias) para TRIAL e ATRASO
            // Vencimento = current_period_end (assinaturas) ou created_at (novos cadastros/trial)
            const referenceDateStr = (['past_due', 'unpaid', 'incomplete'].includes(status) && tenant.subscription_current_period_end)
                ? tenant.subscription_current_period_end
                : tenant.created_at;

            const referenceDate = new Date(referenceDateStr || tenant.created_at);
            const now = new Date();

            // Diferença em dias (agora - referência)
            // Se diffDays > 10, significa que passaram mais de 10 dias do vencimento/cadastro
            const diffTime = now.getTime() - referenceDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 10) {
                router.push('/configuracoes/plano?expired=true');
            }
        }
    }, [session, loading, tenant, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!session) return null;

    return (
        <div className="flex h-screen bg-slate-950 light:bg-slate-50 overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Topbar />
                <ConfigAlertBar />
                <main className="flex-1 overflow-y-auto p-2 md:p-4 light:bg-white text-slate-50 light:text-slate-900 custom-scrollbar transition-colors">
                    <div className="w-full max-w-none">
                        {children}
                    </div>
                    <footer className="mt-8 py-4 text-center text-xs text-slate-600 light:text-slate-400">
                        Licensed by <span className="text-slate-500 font-semibold">791 Barber</span>
                    </footer>
                </main>
            </div>
        </div>
    );
}
