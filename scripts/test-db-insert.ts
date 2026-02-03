import { getSupabaseAdmin } from '../lib/supabase-server';

async function testInsert() {
    const supabase = getSupabaseAdmin();
    console.log('Tentando inserir contato de teste...');

    const { data, error } = await supabase
        .from('landing_contacts')
        .insert([{
            name: 'Teste Local',
            email: 'teste@local.com',
            message: 'Esta é uma mensagem de teste rodada via script local.'
        }])
        .select();

    if (error) {
        console.error('❌ Erro na inserção:', error);
        if (error.code === '42P01') {
            console.error('DICA: A tabela landing_contacts não parece existir. Verifique se rodou o comando SQL no Supabase.');
        }
    } else {
        console.log('✅ Inserção bem-sucedida:', data);
    }
}

testInsert();
