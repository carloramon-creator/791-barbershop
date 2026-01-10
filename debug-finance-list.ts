
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listFinance() {
    const tenantId = '04e6a8df-99c4-4546-9e52-787b8718faf7'; // Barbearia teste

    console.log(`💰 Listando faturas da Barbearia: ${tenantId}\n`);

    const { data: finances } = await supabase
        .from('finance')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5);

    finances?.forEach(f => {
        const meta = f.metadata || {};
        console.log(`ID: ${f.id}`);
        console.log(`Valor: R$ ${f.value}`);
        console.log(`Status Banco: ${f.is_paid ? '✅ PAGO' : '⏳ PENDENTE'}`);
        console.log(`Método: ${meta.method}`);
        console.log(`TXID (Inter): ${meta.txid || 'N/A'}`);
        console.log(`Seu Número: ${meta.seu_numero || 'N/A'}`);
        console.log('---');
    });
}

listFinance();
