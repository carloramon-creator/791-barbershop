import { getSupabaseAdmin } from './lib/supabase-server';

async function update() {
    const { data: current, error: getError } = await getSupabaseAdmin()
        .from('system_settings')
        .select('value')
        .eq('key', 'inter_config')
        .single();

    if (getError) {
        console.error('Erro ao buscar inter_config:', getError);
        return;
    }

    const newValue = {
        ...current.value,
        client_id: "425e6dd3-0c4f-4ee7-b24f-2198685c2ba6",
        client_secret: "feb4f152-ed28-48ba-9c05-892567f01b45"
    };

    const { error: updateError } = await getSupabaseAdmin()
        .from('system_settings')
        .update({ value: newValue })
        .eq('key', 'inter_config');

    if (updateError) {
        console.error('Erro ao atualizar inter_config:', updateError);
        return;
    }

    console.log('✅ Configuração Inter atualizada com sucesso!');
    console.log('Novo Client ID:', newValue.client_id);
}

update();
