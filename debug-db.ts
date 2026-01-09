
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkRecentFinance() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('--- BUSCANDO ÚLTIMOS REGISTROS DE FINANÇAS GERAIS ---');
    const { data, error } = await supabase
        .from('finance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Erro:', error);
    } else {
        data.forEach(item => {
            console.log(`ID: ${item.id} | Desc: ${item.description} | Meta:`, JSON.stringify(item.metadata));
        });
    }
}

checkRecentFinance();
