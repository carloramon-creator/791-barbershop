
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('🔍 Investigando desaparecimento de dados...');

    // 1. Últimos Tenants criados ou modificados
    const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name, created_at, subscription_status, stripe_customer_id')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('\n🏢 Últimos 5 Tenants:');
    console.table(tenants);

    // 2. Últimos Registros Financeiros (para ver se o pagamento do cartão entrou)
    const { data: finances } = await supabase
        .from('finance')
        .select('id, description, value, is_paid, created_at, metadata')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('\n💰 Últimos 5 Pagamentos:');
    finances?.forEach(f => {
        console.log(`- ${f.description} (R$ ${f.value}) - Pago: ${f.is_paid}`);
        console.log('  Metadata:', JSON.stringify(f.metadata).substring(0, 100) + '...');
    });

    // 3. Checar vínculos de usuário recentes (se existir tabela tenants_users ou similar)
    // Assumindo estrutura comum. Se for pelo campo owner_id no tenant:
    // Não temos como adivinhar seu ID de usuário aqui sem input, mas vamos listar usuarios recentes
    const { data: users } = await supabase
        .from('users')
        .select('id, email, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('\n👥 Últimos 5 Usuários:');
    console.table(users);
}

check();
