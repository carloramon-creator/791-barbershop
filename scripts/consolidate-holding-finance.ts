
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfbiwvhxztejuzcasclv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function consolidateSaaSPayments() {
    console.log('--- INICIANDO CONSOLIDAÇÃO FINANCEIRA HOLDING ---');

    // 1. Buscar pagamentos de SaaS confirmados na tabela finance global
    const { data: payments, error } = await supabase
        .from('finance')
        .select('*, tenants(name, business_type)')
        .eq('is_paid', true)
        .eq('metadata->>is_saas_payment', 'true');

    if (error) {
        console.error('Erro ao buscar pagamentos:', error.message);
        return;
    }

    console.log(`Encontrados ${payments?.length || 0} pagamentos de SaaS pagos.`);

    let importedCount = 0;

    for (const payment of (payments || [])) {
        // Verificar se já existe na holding (evitar duplicidade usando o ID original no bank_id)
        const { data: existing } = await supabase
            .from('system_finance_records')
            .select('id')
            .eq('bank_id', payment.id)
            .maybeSingle();

        if (existing) continue;

        const businessUnit = payment.tenants?.business_type === 'beauty_salon' ? 'beauty' : 'barber';

        const { error: insertError } = await supabase
            .from('system_finance_records')
            .insert({
                business_unit: businessUnit,
                type: 'revenue',
                value: payment.value,
                description: `SaaS - ${payment.tenants?.name || 'Tenant'}`,
                date: payment.date || payment.created_at.split('T')[0],
                status: 'paid',
                category: 'SaaS Revenue',
                bank_id: payment.id, // Para evitar duplicidade
                metadata: {
                    original_finance_id: payment.id,
                    tenant_id: payment.tenant_id
                }
            });

        if (!insertError) importedCount++;
    }

    console.log(`--- CONSOLIDAÇÃO CONCLUÍDA: ${importedCount} novos registros na Holding ---`);
}

consolidateSaaSPayments();
