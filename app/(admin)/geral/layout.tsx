'use client';

import { useAuth } from '@/lib/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Sidebar } from '@/components/layout/sidebar';
import { ConfigAlert, ExpirationAlert } from '@/components/layout/config-alert-bar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { isSystemAdmin, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isSystemAdmin) {
            router.push('/dashboard');
        }
    }, [isSystemAdmin, loading, router]);

    if (loading || !isSystemAdmin) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-950 light:bg-slate-50 overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Topbar />
                <ConfigAlert />
                <ExpirationAlert />
                <main className="flex-1 overflow-y-auto p-8 light:bg-white custom-scrollbar transition-colors">
                    {children}
                </main>
            </div>
        </div>
    );
}
