'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import Image from 'next/image';

export function ReportHeader() {
    const [tenant, setTenant] = useState<{ name: string; logo_url?: string } | null>(null);

    useEffect(() => {
        const fetchTenant = async () => {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user?.user_metadata?.tenant_id) {
                const { data } = await supabaseClient
                    .from('tenants')
                    .select('name, logo_url')
                    .eq('id', user.user_metadata.tenant_id)
                    .single();
                if (data) setTenant(data);
            }
        };
        fetchTenant();
    }, []);

    // Se não carregar via auth, tenta pegar do localStorage (fallback)
    useEffect(() => {
        if (!tenant) {
            const stored = localStorage.getItem('sb-tenant-branding');
            if (stored) {
                try { setTenant(JSON.parse(stored)); } catch { }
            }
        }
    }, [tenant]);

    if (!tenant) return null;

    return (
        <div className="flex flex-col items-center justify-center border-b-2 border-slate-900 pb-4 mb-6 report-header">
            {tenant.logo_url && (
                <div className="mb-2 relative w-24 h-24">
                    <Image
                        src={tenant.logo_url}
                        alt={tenant.name}
                        fill
                        className="object-contain grayscale"
                        unoptimized
                    />
                </div>
            )}
            <h1 className="text-2xl font-black uppercase tracking-widest text-slate-900 text-center">{tenant.name}</h1>
        </div>
    );
}

export function ReportFooter() {
    return (
        <div className="mt-12 text-center text-[10px] text-gray-400 py-4 border-t border-gray-100">
            Licensed by <span className="font-bold text-gray-600">791 Barber</span>
        </div>
    );
}
