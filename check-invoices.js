
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkInvoices() {
    const { data: invoices, error } = await supabase
        .from('finance')
        .select('id, description, metadata')
        .ilike('metadata->>nfe_id', '%')
        .limit(10);

    if (error) {
        console.error('Error fetching invoices:', error);
        return;
    }

    console.log('Invoices metadata:');
    invoices.forEach(inv => {
        console.log(`ID: ${inv.id} | Desc: ${inv.description} | PDF URL: ${inv.metadata?.nfe_pdf_url}`);
    });
}

checkInvoices();
