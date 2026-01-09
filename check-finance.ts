
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkFinanceTable() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('--- BUSCANDO ÚLTIMOS REGISTROS DE FINANÇAS SaaS ---');
    const { data, error } = await supabase
        .from('finance')
        .select('*')
        .contains('metadata', { method: 'boleto_inter' })
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Erro ao buscar finanças:', error);
    } else {
        console.log('REGISTROS ENCONTRADOS:', JSON.stringify(data, null, 2));
    }
}

checkFinanceTable();
