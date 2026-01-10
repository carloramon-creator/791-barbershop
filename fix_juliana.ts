import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
    console.log('Ativando Juliana Sens...');

    const { data, error } = await sb
        .from('barbers')
        .update({
            is_active: true,
            status: 'available'
        })
        .eq('id', 'b6503c1d-0633-417d-bcbe-35394bc8624b')
        .select();

    if (error) {
        console.error('Erro ao atualizar:', error);
        return;
    }

    console.log('✅ Juliana Sens ativada com sucesso!');
    console.log('Novo status:', data);
}

run();
