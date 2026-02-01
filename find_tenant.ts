import { getSupabaseAdmin } from './lib/supabase-server';

async function findTenant() {
  const { data, error } = await getSupabaseAdmin()
    .from('tenants')
    .select('id, name')
    .limit(1);

  if (error) {
    console.error('Erro ao buscar tenant:', error);
    return;
  }

  console.log('Tenant encontrado:', data);
}

findTenant();
