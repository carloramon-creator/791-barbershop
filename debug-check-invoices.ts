
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Configuração Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("ERRO: Variáveis de ambiente do Supabase não encontradas.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkInvoices() {
    console.log("Consultando últimas faturas...");

    // Busca faturas recentes que tenham metadata (indicando tentativa de emissão)
    const { data, error } = await supabase
        .from('finance')
        .select('id, description, value, metadata, created_at')
        // Filtrar apenas onde metadata contem nfe_id (campo JSONB)
        .not('metadata->nfe_id', 'is', null) // ou .neq('metadata->>nfe_id', null) dependendo do driver
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Erro ao buscar faturas:", error);
        return;
    }

    console.log("---------------------------------------------------");
    data.forEach(inv => {
        console.log(`ID: ${inv.id}`);
        console.log(`Desc: ${inv.description}`);
        console.log(`Metadata:`, JSON.stringify(inv.metadata, null, 2));
        console.log("---------------------------------------------------");
    });
}

checkInvoices();
