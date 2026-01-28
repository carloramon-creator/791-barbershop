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
        method?: string;
        linha_digitavel?: string;
        codigo_barras?: string;
        codigoSolicitacao?: string;
        boleto?: {
            linhaDigitavel?: string;
            codigoBarras?: string;
        };
    };
}

export function usePaymentAlert() {
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const { tenant, user, checkPermission, refresh } = useAuth();
    const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const hasPermission = checkPermission('Visualizar Alertas de Pagamento');

        if (!hasPermission || !tenant?.id) {
            setLoading(false);
            return;
        }

        async function fetchPendingPayment() {
            try {
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

        const channel = supabaseClient
            .channel('finance_alerts')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'finance',
                filter: `tenant_id=eq.${tenant.id}`
            }, async (payload) => {
                if (payload.new.is_paid && payload.new.metadata?.is_saas_payment === true) {
                    setPendingPayment(null);
                    setPaymentSuccess(true);

                    // Atualiza os dados do tenant ( plano, status, etc )
                    await refresh();

                    // Oculta msg de sucesso após 8 segundos
                    setTimeout(() => setPaymentSuccess(false), 8000);
                }
            })
            .subscribe();

        return () => {
            supabaseClient.removeChannel(channel);
        };
    }, [tenant?.id, user?.id]);

    return { pendingPayment, loading, paymentSuccess };
}
