'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { Api } from '@/lib/api';
import { AlertTriangle, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ConfigAlertBar() {
    const { tenant, loading: authLoading } = useAuth();
    const [missingItems, setMissingItems] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const checkConfig = async () => {
            if (!tenant || authLoading) return;

            const items: string[] = [];

            // 1. Check basic tenant fields
            if (!tenant.logo_url) items.push('Logo da barbearia');
            if (!tenant.street || !tenant.city) items.push('Endereço completo');
            if (!tenant.phone) items.push('Telefone / WhatsApp');

            // 2. Check Financial Data (Pix or Bank)
            const hasPix = !!tenant.pix_key;
            const hasBank = !!(tenant.bank_agency && tenant.bank_account);
            if (!hasPix && !hasBank) items.push('Dados Bancários ou Pix');

            // 3. Fetch services and products to check counts
            try {
                const [services, products] = await Promise.all([
                    Api.getServices(),
                    Api.getProducts()
                ]);

                if (services.length === 0) items.push('Cadastrar serviços');
                if (products.length === 0) items.push('Cadastrar produtos');

            } catch (error) {
                console.error("Failed to check configuration counts", error);
            }

            setMissingItems(items);
            setLoading(false);
        };

        checkConfig();
    }, [tenant, authLoading]);

    if (!visible || loading || missingItems.length === 0) return null;

    return (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-[300px]">
                <div className="bg-amber-500/20 p-2 rounded-full">
                    <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                    <p className="text-sm font-semibold">Configuração Incompleta</p>
                    <p className="text-xs opacity-80">
                        {missingItems.length === 1
                            ? `Falta preencher: ${missingItems[0]}`
                            : `Faltam ${missingItems.length} itens: ${missingItems.slice(0, 3).join(', ')}${missingItems.length > 3 ? '...' : ''}`
                        }
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Link href="/configuracoes/barbearia">
                    <Button variant="ghost" size="sm" className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 text-xs font-bold gap-1">
                        Completar Perfil
                        <ChevronRight className="h-3 w-3" />
                    </Button>
                </Link>
                <button
                    onClick={() => setVisible(false)}
                    className="p-1 hover:bg-amber-500/10 rounded-md transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
