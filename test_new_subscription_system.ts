import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSubscriptionSystem() {
    console.log('🚀 Iniciando simulação do sistema de assinaturas...');

    // 1. Buscar o primeiro tenant disponível
    const { data: tenants, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name')
        .limit(1);

    if (tenantError || !tenants || tenants.length === 0) {
        console.error('❌ Erro ao buscar tenant:', tenantError);
        return;
    }

    const tenant = tenants[0];
    console.log(`✅ Tenant selecionado: ${tenant.name} (${tenant.id})`);

    // 2. Criar uma assinatura ativa (Simulação)
    console.log('Cleaning old test subscriptions and creating new one...');

    // Remove qualquer assinatura de teste anterior para esse tenant
    await supabase.from('subscriptions').delete().eq('tenant_id', tenant.id);

    const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .insert({
            tenant_id: tenant.id,
            plan_slug: 'premium',
            status: 'active',
            billing_cycle: 1,
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            last_billing_date: new Date().toISOString().split('T')[0],
            metadata: { is_test: true }
        })
        .select();

    if (subError) {
        console.error('❌ Erro ao criar assinatura:', subError);
        return;
    }
    console.log('✅ Assinatura de teste criada com sucesso!');

    // 3. Criar uma fatura pendente (para disparar o alerta visual)
    console.log('Creating pending SaaS payment for alert testing...');
    const seuNumero = 'TEST-' + Math.random().toString(36).substring(7).toUpperCase();

    // Deleta faturas de teste antigas para não poluir
    await supabase.from('finance').delete().eq('tenant_id', tenant.id).eq('description', 'TESTE: Assinatura 791 Barber');

    const { error: financeError } = await supabase
        .from('finance')
        .insert({
            tenant_id: tenant.id,
            type: 'expense',
            value: 129.90,
            description: 'TESTE: Assinatura 791 Barber',
            date: new Date().toISOString(),
            is_paid: false,
            metadata: {
                is_saas_payment: true,
                method: 'pix_inter',
                seu_numero: seuNumero,
                pix_payload: '00020101021226870014br.gov.bcb.pix... (EXEMPLO DE TESTE)',
                expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                plan: 'premium',
                is_renewal: true
            }
        });

    if (financeError) {
        console.error('❌ Erro ao criar fatura:', financeError);
        return;
    }

    console.log('\n--- RESULTADO ---');
    console.log('1. Assinatura ativa configurada para daqui a 30 dias.');
    console.log('2. Fatura pendente gerada (Vence em 3 dias).');
    console.log(`3. TXID de teste: ${seuNumero}`);
    console.log('\n💡 AGORA: Abra o sistema no navegador para ver o POPUP DE ALERTA aparecer!');
    console.log('💡 DICA: Você pode marcar como pago no banco de dados para ver o popup sumir em tempo real.');
}

testSubscriptionSystem();
