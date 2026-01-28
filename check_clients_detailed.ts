import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfbiwvhxztejuzcasclv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYml3dmh4enRlanV6Y2FzY2x2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE4Mzg2NSwiZXhwIjoyMDgyNzU5ODY1fQ.gEz-BSdMq2ktSRRhUTJZGiSEV6LiWxkxelqy5cDr4YI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- BUSCANDO CLIENTES RECENTES (ÚLTIMAS 24H) ---');
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, phone, tenant_id, created_at')
    .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });
  
  if (error) console.error('Error fetching clients:', error);
  else console.log('Clients (24h):', JSON.stringify(clients, null, 2));

  console.log('\n--- BUSCANDO FILA RECENTE (ÚLTIMAS 24H) ---');
  const { data: queue, error: qErr } = await supabase
    .from('client_queue')
    .select('id, client_name, client_phone, client_id, tenant_id, status, created_at')
    .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (qErr) console.error('Error fetching queue:', qErr);
  else console.log('Queue (24h):', JSON.stringify(queue, null, 2));
}

check();
