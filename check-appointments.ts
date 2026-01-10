
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRows() {
    const tenantId = '04e6a8df-99c4-4546-9e52-787b8718faf7';
    console.log(`🔍 Check Rows Barbearia: ${tenantId}`);

    // Barbers
    const { data: barbers, error: errB } = await supabase
        .from('barbers')
        .select('id, name')
        .eq('tenant_id', tenantId);

    console.log(`✂️ Barbeiros (${barbers?.length}):`, barbers ? barbers.map(b => b.name).join(', ') : errB);

    // Appointments (Tentando listar para ver se existe algum)
    const { data: appts, error: errA } = await supabase
        .from('appointments')
        .select('id, date, created_at')
        .eq('tenant_id', tenantId)
        .limit(5);

    console.log(`📅 Atendimentos Encontrados:`, appts?.length);
    if (errA) console.error('Erro appts:', errA);
    if (appts && appts.length > 0) console.log('Exemplos:', appts);
}

checkRows();
