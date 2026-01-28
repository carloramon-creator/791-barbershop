import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfbiwvhxztejuzcasclv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYml3dmh4enRlanV6Y2FzY2x2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE4Mzg2NSwiZXhwIjoyMDgyNzU5ODY1fQ.gEz-BSdMq2ktSRRhUTJZGiSEV6LiWxkxelqy5cDr4YI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  const maysaId = '0a319a55-1703-40e6-a81d-2b002cbf9ab5';
  const inglesesId = '04e6a8df-99c4-4546-9e52-787b8718faf7';
  const clientPhone = '48999922222';

  console.log('--- Corrigindo Registro de Cliente ---');

  // 1. Verificar se ja existe Carlos na Maysa
  const { data: existingMaysa } = await supabase
    .from('clients')
    .select('id')
    .eq('tenant_id', maysaId)
    .eq('phone', clientPhone)
    .maybeSingle();

  if (existingMaysa) {
    console.log('Cliente ja existe na Maysa (ID: ' + existingMaysa.id + ')');
    // Atualizar a fila para apontar para o ID correto se necessario
    const { error: updateQueueErr } = await supabase
      .from('client_queue')
      .update({ client_id: existingMaysa.id })
      .eq('tenant_id', maysaId)
      .eq('client_phone', clientPhone);
    
    if (updateQueueErr) console.error('Error updating queue:', updateQueueErr);
    else console.log('Fila atualizada para apontar para o ID correto na Maysa.');
  } else {
    // 2. Mover o registro "vazado" para a Maysa
    const { data: leakedClient } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', inglesesId)
        .eq('phone', clientPhone)
        .maybeSingle();
    
    if (leakedClient) {
        console.log('Encontrado cliente vazado no Ingleses. Movendo para Maysa...');
        const { error: moveErr } = await supabase
            .from('clients')
            .update({ tenant_id: maysaId })
            .eq('id', leakedClient.id);
        
        if (moveErr) console.error('Error moving client:', moveErr);
        else console.log('Cliente movido com sucesso para Maysa.');
    }
  }

  console.log('--- Fim da Correção ---');
}

fix();
