import { getSupabaseAdmin } from './lib/supabase-server';

async function createTestCoupon() {
    console.log('--- Criando Cupom de Teste ---');
    const { data, error } = await getSupabaseAdmin()
        .from('system_coupons')
        .upsert({
            code: 'TESTE90',
            discount_percent: 90,
            is_active: true,
            max_uses: 10,
            name: 'Cupom de Teste 90%'
        }, { onConflict: 'code' })
        .select();

    if (error) {
        console.error('Erro ao criar cupom:', error);
    } else {
        console.log('✅ Cupom TESTE90 criado com sucesso!', data);
    }
}

createTestCoupon();
