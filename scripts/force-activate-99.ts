
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function activate99() {
    console.log('[FORCE ACTIVATE 99.90] Looking for pending invoice...');

    const { data: finance, error: fError } = await supabase
        .from('finance')
        .select('*, tenants(*)')
        .eq('value', 99.9)
        .eq('is_paid', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (fError || !finance) {
        console.error('Invoice 99.90 not found as pending', fError);
        return;
    }

    const tenant = finance.tenants;
    console.log(`[FORCE ACTIVATE] Found Tenant: ${tenant.name} (${tenant.id})`);

    const metadata = finance.metadata || {};
    const planSlug = metadata.plan || 'complete';
    const isAddon = !!metadata.addon;

    const updateData: any = {
        subscription_status: 'active',
        plan: planSlug,
        subscription_current_period_end: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString()
    };

    console.log('[FORCE ACTIVATE] 🚀 Updating tenant and finance...');

    const results = await Promise.all([
        supabase.from('tenants').update(updateData).eq('id', tenant.id),
        supabase.from('finance').update({
            is_paid: true,
            date: new Date().toISOString().split('T')[0],
            metadata: { ...metadata, forced_payment_activation: true, forced_at: new Date().toISOString() }
        }).eq('id', finance.id)
    ]);

    if (results.some(r => r.error)) {
        console.error('Error during update:', results.map(r => r.error));
    } else {
        console.log(`[FORCE ACTIVATE] ✅ SUCCESS! Invoice ${finance.id} is now PAID and Tenant ${tenant.name} is ACTIVE.`);
    }
}

activate99();
