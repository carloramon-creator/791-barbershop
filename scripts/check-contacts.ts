import { getSupabaseAdmin } from '../lib/supabase-server';

async function checkContacts() {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('landing_contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Erro ao buscar contatos:', error);
        return;
    }

    console.log('--- Últimos Contatos Recebidos ---');
    console.table(data);
}

checkContacts();
