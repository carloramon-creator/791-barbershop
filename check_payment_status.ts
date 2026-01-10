
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLastPayment() {
    console.log('🔍 Buscando última fatura...');
    const { data: charges, error } = await supabase
        .from('finance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Erro:', error);
        return;
    }

    if (!charges || charges.length === 0) {
        console.log('Nenhuma fatura encontrada.');
        return;
    }

    const charge = charges[0];
    console.log('--------------------------------------------------');
    console.log(`🧾 Fatura ID: ${charge.id}`);
    console.log(`💰 Valor: R$ ${charge.value}`);
    console.log(`📅 Criada em: ${new Date(charge.created_at).toLocaleString('pt-BR')}`);
    console.log(`🏷️  Descrição: ${charge.description}`);
    console.log(`🔒 Status Pago (is_paid): ${charge.is_paid ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`🔗 Metadata:`, JSON.stringify(charge.metadata, null, 2));
    console.log('--------------------------------------------------');
}

checkLastPayment();
