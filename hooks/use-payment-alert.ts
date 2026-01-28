'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { supabaseClient } from '@/lib/supabase-client';

export interface PendingPayment {
    id: string;
    value: number;
    description: string;
    date: string;
    metadata: {
        pix_payload?: string;
        expires_at?: string;
        txid?: string;
        seu_numero?: string;
    };
}

export function usePaymentAlert() {
    const { tenant, user, checkPermission } = useAuth();
    const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Verificar permissão
        const hasPermission = checkPermission('Visualizar Alertas de Pagamento');

        if (!hasPermission || !tenant?.id) {
            setLoading(false);
            return;
        }

        async function fetchPendingPayment() {
            try {
                // Buscar faturas SaaS não pagas para este tenant
                const { data, error } = await supabaseClient
                    .from('finance')
                    .select('*')
                    .eq('tenant_id', tenant!.id)
                    .eq('is_paid', false)
                    .eq('metadata->>is_saas_payment', 'true')
                    .order('date', { ascending: true })
                    .limit(1)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    setPendingPayment(data as PendingPayment);
                } else {
                    setPendingPayment(null);
                }
            } catch (error) {
                console.error('[usePaymentAlert] Erro ao buscar pagamentos:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchPendingPayment();

        // Listen para mudanças no financeiro (opcional, mas bom para fechar popup após pagar)
        const channel = supabaseClient
            .channel('finance_alerts')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'finance',
                filter: `tenant_id=eq.${tenant.id}`
            }, (payload) => {
                if (payload.new.is_paid && payload.new.metadata?.is_saas_payment === true) {
                    setPendingPayment(null);
                }
            })
            .subscribe();

        return () => {
            supabaseClient.removeChannel(channel);
        };
    }, [tenant?.id, user?.id]);

    return { pendingPayment, loading };
}
