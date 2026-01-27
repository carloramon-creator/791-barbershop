import { getSupabaseAdmin } from './lib/supabase-server';

async function check() {
    const { data, error } = await getSupabaseAdmin()
        .from('system_settings')
        .select('*')
        .eq('key', 'inter_config')
        .single();

    if (error) {
        console.error('Erro ao buscar inter_config:', error);
        return;
    }

    console.log('Configuração Inter atual:');
    console.log(JSON.stringify(data.value, null, 2));
}

check();
