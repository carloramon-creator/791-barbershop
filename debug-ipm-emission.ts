
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import ipmProvider from './lib/nfse/providers/ipm';

// Configuração Supabase (Hardcoded para teste rápido ou ler de env)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("ERRO: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getCredentials() {
    console.log("Buscando credenciais no banco...");
    const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'nfse_config')
        .single();

    if (error || !data) {
        throw new Error("Erro ao buscar configurações: " + (error?.message || "Não encontrado"));
    }
    return data.value;
}

async function testEmission() {
    try {
        console.log("Iniciando teste de emissão IPM...");
        const config = await getCredentials();

        // Dados de teste
        const dpsData: any = {
            numero: "DEBUG-" + Date.now(),
            serie: "1",
            dataEmissao: new Date().toISOString(),
            prestador: {
                cnpj: "61887941000183",
                inscricaoMunicipal: "ISENTO"
            },
            tomador: {
                cpf: "00000000191", // CPF Genérico
                razaoSocial: "TOMADOR TESTE DEBUG",
                email: "teste@exemplo.com"
            },
            servico: {
                codigoItemListaServico: "0101",
                valorServicos: 1.05, // Valor diferente para identificar
                discriminacao: "Teste de Emissão Debug Script - Verificando Ambiente"
            }
        };

        const credentials = {
            username: config.ipm_username,
            password: config.ipm_password,
            cidade: "ws-saojose",
            isTest: true // Modo de teste para não gerar nota válida
        };

        if (!credentials.username || !credentials.password) {
            console.error("ERRO: Credenciais IPM não encontradas no banco.");
            return;
        }

        console.log("Tentando emitir com:", {
            // @ts-ignore
            url: ipmProvider.baseUrl.replace('{cidade}', credentials.cidade),
            username: credentials.username,
            dps: dpsData.numero
        });

        // @ts-ignore
        const result = await ipmProvider.emit(dpsData, null, null, credentials);
        console.log("---------------------------------------------------");
        console.log("RESULTADO COMPLETO:");
        console.log(JSON.stringify(result, null, 2));
        console.log("---------------------------------------------------");

    } catch (error) {
        console.error("Erro no teste:", error);
    }
}

testEmission();
