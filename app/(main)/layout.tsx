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
            // Páginas que NÃO devem ser bloqueadas
            const isWhiteListed =
                window.location.pathname.startsWith('/checkout') ||
                window.location.pathname === '/configuracoes/plano';

            if (isWhiteListed) return;

            // 1. Status explícitos de bloqueio
            const isBlockedStatus = ['canceled', 'unpaid', 'past_due', 'incomplete_expired'].includes(tenant.subscription_status || '');

            if (isBlockedStatus) {
                router.push('/configuracoes/plano?expired=true');
                return;
            }

            // 2. Verificar Validade do Trial (Se não estiver ativo)
            if (tenant.subscription_status !== 'active' && tenant.subscription_status !== 'trialing') {
                // Se não tem status do Stripe (null ou 'trial' manual), verificamos os 7 dias
                const created = new Date(tenant.created_at || new Date());
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - created.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Se passou de 7 dias e não tem assinatura ativa -> Bloqueia
                // Nota: usamos 8 dias para dar uma folga no último dia
                if (diffDays > 8) {
                    router.push('/configuracoes/plano?expired=true');
                }
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
