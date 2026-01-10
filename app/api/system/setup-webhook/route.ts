
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { InterAPIV3 } from '@/lib/inter-api-v3';

export async function GET(req: Request) {
    try {
        console.log('🔗 Buscando credenciais do Inter...');
        const { data: settingsData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'inter_config')
            .single();

        if (!settingsData) {
            return NextResponse.json({ error: 'Configurações do Inter não encontradas.' }, { status: 404 });
        }

        const config = settingsData.value;
        const cert = config.crt?.replace(/\\n/g, '\n');
        const key = config.key?.replace(/\\n/g, '\n');
        const clientId = config.client_id;
        const clientSecret = config.client_secret;
        const pixKey = config.pix_key;

        if (!clientId || !cert || !key) {
            return NextResponse.json({ error: 'Credenciais incompletas.' }, { status: 400 });
        }

        const inter = new InterAPIV3({
            clientId, clientSecret, cert, key
        });

        // URL DE PRODUÇÃO DO RAILWAY
        const WEBHOOK_URL = 'https://791-barbershop-production.up.railway.app/api/webhooks/inter';

        const results: any = {};

        // 1. Registrar Boleto
        try {
            console.log('📡 Registrando Webhook de COBRANÇA (Boleto V3)...');
            await inter.registerWebhook(WEBHOOK_URL, 'boleto');
            results.boleto = 'Sucesso';
        } catch (e: any) {
            console.error('❌ Erro Boleto:', e);
            results.boleto = `Erro: ${e.message || JSON.stringify(e)}`;
        }

        // 2. Registrar Pix
        if (pixKey) {
            try {
                console.log(`📡 Registrando Webhook de PIX (Chave: ${pixKey})...`);
                await inter.registerWebhook(WEBHOOK_URL, 'pix', pixKey);
                results.pix = 'Sucesso';
            } catch (e: any) {
                console.error('❌ Erro Pix:', e);
                results.pix = `Erro: ${e.message || JSON.stringify(e)}`;
            }
        } else {
            results.pix = 'Ignorado (Sem chave Pix)';
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
