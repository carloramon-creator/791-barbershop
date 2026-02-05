
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizePhone(value: string | undefined | null) {
    if (!value) return '';
    const clean = value.replace(/\D/g, '');
    if (clean.length === 10 || clean.length === 11) {
        return `55${clean}`;
    }
    return clean;
}

async function start() {
    console.log('--- Iniciando padronização de telefones ---');

    const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, phone');

    if (error) {
        console.error('Erro ao buscar clientes:', error);
        return;
    }

    console.log(`Encontrados ${clients.length} clientes.`);

    let updatedCount = 0;

    for (const client of clients) {
        const normalized = normalizePhone(client.phone);

        if (normalized !== client.phone) {
            console.log(`Atualizando ${client.name}: ${client.phone} -> ${normalized}`);
            const { error: updateError } = await supabase
                .from('clients')
                .update({ phone: normalized })
                .eq('id', client.id);

            if (updateError) {
                console.error(`Erro ao atualizar ${client.name}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`--- Sucesso! ${updatedCount} clientes atualizados. ---`);
}

start();
