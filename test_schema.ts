import { supabaseAdmin } from './lib/supabase-server';

async function test() {
  const { data, error } = await supabaseAdmin.from('appointments').select('*').limit(1);
  if (error) console.error(error);
  else console.log(Object.keys(data[0] || {}));
}
test();
