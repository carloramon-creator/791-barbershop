
import { getSupabaseAdmin } from './lib/supabase-server';

async function fixLegacyData() {
    const admin = getSupabaseAdmin();
    console.log('--- FIXING LEGACY SAAS DATA ---');

    // Buscar registros que parecem ser do SaaS mas não têm o flag
    const { data: records, error } = await admin
        .from('finance')
        .select('id, description, metadata, type')
        .or('description.ilike.%SaaS%,description.ilike.%Assinatura%,description.ilike.%Renovação%');

    if (error) {
        console.error('Erro ao buscar:', error);
        return;
    }

    console.log(`Encontrados ${records?.length} registros potenciais.`);

    for (const r of records || []) {
        const metadata = r.metadata || {};
        if (metadata.is_saas_payment) continue;

        console.log(`Fixing: ${r.description} (${r.id})`);

        await admin.from('finance').update({
            type: 'expense', // Garantir que seja despesa se é pagamento do tenant para o SaaS
            metadata: {
                ...metadata,
                is_saas_payment: true
            }
        }).eq('id', r.id);
    }

    console.log('Concluído.');
}

fixLegacyData();
