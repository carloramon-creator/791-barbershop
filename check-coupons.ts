
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkCoupons() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('--- BUSCANDO CUPONS NO BANCO ---');
    const { data, error } = await supabase.from('system_coupons').select('*');

    if (error) {
        console.error('Erro ao buscar cupons:', error);
    } else {
        console.log('CUPONS ENCONTRADOS:', JSON.stringify(data, null, 2));
    }
}

checkCoupons();
