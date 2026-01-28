import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfbiwvhxztejuzcasclv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYml3dmh4enRlanV6Y2FzY2x2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE4Mzg2NSwiZXhwIjoyMDgyNzU5ODY1fQ.gEz-BSdMq2ktSRRhUTJZGiSEV6LiWxkxelqy5cDr4YI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, phone, tenant_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error fetching clients:', error);
  } else {
    console.log('Last 10 clients registered:', JSON.stringify(clients, null, 2));
  }

  const { data: queue, error: qErr } = await supabase
    .from('client_queue')
    .select('id, client_name, client_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (qErr) {
    console.error('Error fetching queue:', qErr);
  } else {
    console.log('Last 10 queue entries:', JSON.stringify(queue, null, 2));
  }
}

check();
