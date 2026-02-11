
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("ERRO: Variáveis de ambiente do Supabase não encontradas.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updatePassword() {
    console.log("Buscando configurações atuais...");

    // Busca as configurações atuais
    const { data: settings, error: fetchError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'nfse_config')
        .single();

    if (fetchError) {
        console.error("Erro ao buscar configurações:", fetchError);
        return;
    }

    const config = settings?.value || {};
    // Atualiza a senha
    config.ipm_password = "R@myas2025!!";

    console.log("Atualizando senha no banco...");

    const { error: updateError } = await supabase
        .from('system_settings')
        .update({ value: config })
        .eq('key', 'nfse_config');

    if (updateError) {
        console.error("Erro ao atualizar senha:", updateError);
        return;
    }

    console.log("✅ Senha atualizada com sucesso!");
}

updatePassword();
