const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBirthdays() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    console.log(`Buscando aniversariantes para: ${day}/${month}`);

    const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, birth_date, fcm_token')
        .filter('birth_date', 'not.is', null);

    if (error) {
        console.error('Erro ao buscar clientes:', error);
        return;
    }

    const bdayToday = clients.filter(c => {
        const d = new Date(c.birth_date);
        return d.getMonth() + 1 === month && d.getDate() === day;
    });

    if (bdayToday.length === 0) {
        console.log('Nenhum aniversariante encontrado para hoje.');
    } else {
        console.log(`Encontrado(s) ${bdayToday.length} aniversariante(s):`);
        bdayToday.forEach(c => {
            console.log(`- ${c.name} (ID: ${c.id}) - Token: ${c.fcm_token ? 'Presente' : 'Ausente'}`);
        });
    }
}

checkBirthdays();
