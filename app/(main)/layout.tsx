'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';
import { Sidebar } from '@/components/layout/sidebar';
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
            const isTrial = tenant.subscription_status === 'trial';
            const isExpired = tenant.subscription_current_period_end && new Date() > new Date(tenant.subscription_current_period_end);
            const isCanceled = tenant.subscription_status === 'canceled';
            const isPastDue = tenant.subscription_status === 'past_due';

            // Páginas que NÃO devem ser bloqueadas
            const isWhiteListed =
                window.location.pathname.startsWith('/checkout') ||
                window.location.pathname === '/configuracoes/plano';

            if (!isWhiteListed) {
                if ((isTrial && isExpired) || (isCanceled && isExpired) || isPastDue) {
                    router.push('/checkout/trial-expired');
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
        <div className="flex h-screen bg-slate-950 overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {children}
                    <footer className="mt-8 py-4 text-center text-xs text-slate-600">
                        Powered by <span className="text-slate-500 font-semibold">791 Barber</span>
                    </footer>
                </main>
            </div>
        </div>
    );
}
