
import { supabaseAdmin } from './lib/supabase-server';

async function diagnose() {
    console.log('--- DIAGNÓSTICO DE AGENDAMENTOS ---');

    // 1. Buscar todos os tenants para ver nomes e slugs
    const { data: tenants } = await supabaseAdmin.from('tenants').select('id, name, slug');
    console.log('\nTenants Encontrados:', tenants?.length);
    tenants?.forEach(t => console.log(`- [${t.id}] ${t.name} (slug: ${t.slug})`));

    // 2. Buscar agendamentos do cliente Carlo Ramon (48991305547)
    const phone = '48991305547';
    const { data: appts, error } = await supabaseAdmin
        .from('appointments')
        .select('*, tenants(name)')
        .or(`client_phone.eq.${phone},client_name.ilike.%Carlo%`)
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Erro ao buscar agendamentos:', error);
        return;
    }

    console.log('\nAgendamentos encontrados para Carlo Ramon:', appts?.length);
    appts?.forEach(a => {
        console.log(`- ID: ${a.id}`);
        console.log(`  Tenant: [${a.tenant_id}] ${a.tenants?.name}`);
        console.log(`  Barbaer ID: ${a.barber_id}`);
        console.log(`  Status: ${a.status}`);
        console.log(`  Data/Hora Start: ${a.start_time}`);
        console.log(`  Cliente: ${a.client_name} (${a.client_phone})`);
        console.log('-------------------');
    });

    // 3. Buscar agendamentos para o dia 16/01 em TODOS os tenants
    console.log('\nAgendamentos em 16/01/2026 (Qualquer tenant):');
    const { data: day16 } = await supabaseAdmin
        .from('appointments')
        .select('*, tenants(name)')
        .gte('start_time', '2026-01-16T00:00:00Z')
        .lte('start_time', '2026-01-16T23:59:59Z');

    day16?.forEach(a => {
        console.log(`- [${a.tenants?.name}] ${a.client_name} às ${a.start_time} (Status: ${a.status})`);
    });
}

diagnose();
