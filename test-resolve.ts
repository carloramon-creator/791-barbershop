import { supabaseAdmin } from './lib/supabase-server';

async function verify() {
  const slug = 'ingleses';
  console.log('--- TESTE DE RESOLUÇÃO INTERNA ---');
  
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug')
    .ilike('slug', slug)
    .maybeSingle();

  if (error) {
    console.log('ERRO:', error.message);
  } else if (!data) {
    console.log('NOT_FOUND: Slug não bateu no ILIKE.');
    const { data: all } = await supabaseAdmin.from('tenants').select('slug');
    console.log('Slugs existentes:', all?.map(t => t.slug));
  } else {
    console.log('OK! Encontrado:', data.name);
  }
}
verify();
