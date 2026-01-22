
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function activateByPrefix(prefix: string) {
    console.log(`[FORCE ACTIVATE PREFIX] Target: ${prefix}`);

    const { data: finance, error: fError } = await supabase
        .from('finance')
        .select('*, tenants(*)')
        .ilike('id', `${prefix}%`)
        .maybeSingle();

    if (fError || !finance) {
        console.error('Invoice not found', fError);
        return;
    }

    const tenant = finance.tenants;
    console.log(`[FORCE ACTIVATE] Found Tenant: ${tenant.name} (${tenant.id})`);

    const metadata = finance.metadata || {};
    const planSlug = metadata.plan || 'complete';
    const isAddon = !!metadata.addon;
    const interval = metadata.interval || 1;

    const updateData: any = {
        subscription_status: 'active',
        subscription_current_period_end: new Date(Date.now() + interval * 31 * 24 * 60 * 60 * 1000).toISOString()
    };

    if (!isAddon) {
        updateData.plan = planSlug;
    }

    console.log('[FORCE ACTIVATE] 🚀 Updating tenant and finance...');

    const results = await Promise.all([
        supabase.from('tenants').update(updateData).eq('id', tenant.id),
        supabase.from('finance').update({
            is_paid: true,
            date: new Date().toISOString().split('T')[0],
            metadata: { ...metadata, forced_prefix_activation: true, forced_at: new Date().toISOString() }
        }).eq('id', finance.id)
    ]);

    if (results.some(r => r.error)) {
        console.error('Error during update:', results.map(r => r.error));
    } else {
        console.log(`[FORCE ACTIVATE] ✅ SUCCESS! Tenant ${tenant.name} is now ACTIVE.`);
    }
}

const args = process.argv.slice(2);
activateByPrefix(args[0] || '7c79892b');
