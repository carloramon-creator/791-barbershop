import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function testLogic() {
    // Get a real service ID first
    const { data: service } = await supabase.from('services').select('id, name').limit(1).single();

    if (!service) {
        console.log('No services found to test.');
        return;
    }

    console.log(`Testing with service: ${service.name} (${service.id})`);

    const service_ids = [service.id];
    let serviceNames = '';

    const { data: services } = await supabase
        .from('services')
        .select('name')
        .in('id', service_ids);

    if (services && services.length > 0) {
        serviceNames = services.map(s => s.name).join(', ');
    }

    console.log(`Resulting serviceNames: "${serviceNames}"`);

    if (serviceNames === service.name) {
        console.log('LOGIC VERIFIED: Successfully fetched service names.');
    } else {
        console.log('LOGIC FAILED: Could not fetch service names.');
    }
}

testLogic();
