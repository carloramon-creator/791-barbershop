import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfbiwvhxztejuzcasclv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYml3dmh4enRlanV6Y2FzY2x2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE4Mzg2NSwiZXhwIjoyMDgyNzU5ODY1fQ.gEz-BSdMq2ktSRRhUTJZGiSEV6LiWxkxelqy5cDr4YI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .in('id', ['04e6a8df-99c4-4546-9e52-787b8718faf7', '0a319a55-1703-40e6-a81d-2b002cbf9ab5']);
  
  if (error) console.error(error);
  else console.log('Tenants:', JSON.stringify(tenants, null, 2));

  const { data: user } = await supabase
    .from('users')
    .select('tenant_id, email')
    .eq('email', 'carloramon.creator@gmail.com')
    .single();
  console.log('Ramon User Tenant:', user?.tenant_id);
}

check();
