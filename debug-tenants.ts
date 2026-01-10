import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://mfbiwvhxztejuzcasclv.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYml3dmh4enRlanV6Y2FzY2x2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4Mzg2NSwiZXhwIjoyMDgyNzU5ODY1fQ.4_P_B9_B_B_B_B_B_B_B_B_B_B_B_B_B_B_B_B_B_B_Y'
);

async function listTenants() {
    console.log('--- LISTANDO TENANTS ---');
    const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug, logo_url')
        .limit(20);

    if (error) {
        console.error('Erro:', error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

listTenants();
