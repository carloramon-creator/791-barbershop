import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await sb.from('tenants').select('id, name');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
