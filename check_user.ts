import { createClient } from '@supabase/supabase-client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, tenant_id')
    .eq('email', 'carloramon.creator@gmail.com') // E-mail do Ramon provável
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    // Tentar listar alguns usuários para ver quem está logado
    const { data: users } = await supabase.from('users').select('email, role, tenant_id').limit(5);
    console.log("Sample users:", users);
  } else {
    console.log('User found:', data);
  }
}

checkUser();
