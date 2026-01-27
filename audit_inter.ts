import { getSupabaseAdmin } from './lib/supabase-server';

async function audit() {
    console.log('--- 🔍 Auditoria de Configurações Inter ---');

    // 1. Check system_settings (SaaS Master)
    const { data: system } = await getSupabaseAdmin()
        .from('system_settings')
        .select('*')
        .eq('key', 'inter_config')
        .single();

    console.log('\n[system_settings] inter_config:');
    if (system) {
        const v = system.value;
        console.log({
            client_id: v.client_id,
            account_number: v.account_number,
            pix_key: v.pix_key,
            cert_length: v.crt?.length || 0,
            key_length: v.key?.length || 0
        });
    } else {
        console.log('Não encontrado!');
    }

    // 2. Check payment_gateways (Tenant-specific)
    // Buscando o tenant 791 SOLUCOES (provavelmente o primeiro)
    const { data: tenant } = await getSupabaseAdmin()
        .from('tenants')
        .select('id, name')
        .ilike('name', '%791%')
        .single();

    if (tenant) {
        console.log(`\n[payment_gateways] para tenant: ${tenant.name} (${tenant.id}):`);
        const { data: gateway } = await getSupabaseAdmin()
            .from('payment_gateways')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('gateway_name', 'inter')
            .single();

        if (gateway) {
            console.log({
                client_id: gateway.client_id,
                account_number: gateway.account_number,
                pix_key: gateway.pix_key,
                cert_length: gateway.cert_content?.length || 0,
                key_length: gateway.key_content?.length || 0
            });
        } else {
            console.log('Sem configuração específica em payment_gateways.');
        }
    }
}

audit();
