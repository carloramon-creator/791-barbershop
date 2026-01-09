
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkFinanceTable() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('--- BUSCANDO REGISTROS DE SaaS (boleto_inter ou pix_inter) ---');
    const { data, error } = await supabase
        .from('finance')
        .select('*')
        .or('metadata->>method.eq.boleto_inter,metadata->>method.eq.pix_inter')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Erro ao buscar finanças:', error);
    } else {
        console.log('REGISTROS ENCONTRADOS:', JSON.stringify(data, null, 2));
    }
}

checkFinanceTable();
