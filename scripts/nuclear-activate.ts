
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const TENANT_ID = 'b7de3a53-450e-4686-9872-3176c04fa9a2';

async function nuclearActivate() {
    console.log(`[NUCLEAR ACTIVATE] Starting for tenant: ${TENANT_ID}`);

    const { data: invoices, error: fError } = await supabase
        .from('finance')
        .select('id, description, value, is_paid')
        .eq('tenant_id', TENANT_ID)
        .eq('metadata->>is_saas_payment', 'true')
        .eq('is_paid', false);

    if (fError) {
        console.error('Error fetching invoices:', fError);
        return;
    }

    if (!invoices || invoices.length === 0) {
        console.log('No pending SaaS invoices found for this tenant.');
    } else {
        console.log(`Found ${invoices.length} pending invoices. Activating all...`);

        for (const inv of invoices) {
            const { error: upError } = await supabase
                .from('finance')
                .update({
                    is_paid: true,
                    date: new Date().toISOString().split('T')[0],
                    metadata: { force_nuclear: true, activated_at: new Date().toISOString() }
                })
                .eq('id', inv.id);

            if (upError) console.error(`Failed to update ${inv.id}:`, upError);
            else console.log(`✅ Activated: ${inv.id} (${inv.description})`);
        }
    }

    // Garantir que o tenant está ativo no plano correto (vamos assumir Premium se houver faturas de Premium)
    const hasPremium = invoices.some(i => i.description.toLowerCase().includes('premium'));
    const targetPlan = hasPremium ? 'premium' : 'complete';

    console.log(`[NUCLEAR ACTIVATE] Setting tenant to ACTIVE with plan: ${targetPlan}`);
    const { error: tError } = await supabase
        .from('tenants')
        .update({
            subscription_status: 'active',
            plan: targetPlan,
            subscription_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', TENANT_ID);

    if (tError) console.error('Error updating tenant:', tError);
    else console.log('✅ Tenant status updated successfully!');
}

nuclearActivate();
