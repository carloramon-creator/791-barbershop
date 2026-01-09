
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function findSaaS() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('--- BUSCANDO REGISTROS SAAS NO BANCO INTEIRO ---');
    const { data, error } = await supabase
        .from('finance')
        .select('*')
        .ilike('description', '%SaaS%')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro:', error);
    } else {
        console.log(`Encontrados ${data.length} registros.`);
        data.forEach(item => {
            console.log(`ID: ${item.id} | Desc: ${item.description} | Date: ${item.date} | Meta:`, JSON.stringify(item.metadata));
        });
    }
}

findSaaS();
