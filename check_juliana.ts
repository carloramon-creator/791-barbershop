import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
    console.log('Buscando tenant "barbearia teste"...');
    const { data: tenants, error: tError } = await sb.from('tenants').select('id, name').ilike('name', '%teste%');

    if (tError) {
        console.error('Erro ao buscar tenant:', tError);
        return;
    }

    if (!tenants || tenants.length === 0) {
        console.log('Nenhum tenant encontrado com "teste" no nome.');
        return;
    }

    console.log('Tenants encontrados:', tenants);

    for (const tenant of tenants) {
        console.log(`\nBarbeiros para o tenant: ${tenant.name} (${tenant.id}):`);
        const { data: barbers, error: bError } = await sb.from('barbers').select('*').eq('tenant_id', tenant.id);

        if (bError) {
            console.error('Erro ao buscar barbeiros:', bError);
            continue;
        }

        if (!barbers || barbers.length === 0) {
            console.log('Nenhum barbeiro encontrado.');
            continue;
        }

        barbers.forEach(b => {
            console.log(`- ${b.name} (ID: ${b.id}): Status = ${b.status}, Ativo = ${b.is_active}`);
        });
    }
}

run();
