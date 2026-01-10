import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';
import { InterAPIV3 } from '@/lib/inter-api-v3';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: Request) {
    try {
        const { user } = await getCurrentUserAndTenant();

        // Verificar se é super admin no banco de dados
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('is_system_admin')
            .eq('id', user.id)
            .single();

        if (!userData || !userData.is_system_admin) {
            return NextResponse.json({ error: 'Acesso Negado: Requer privilégios de Super Admin' }, { status: 403 });
        }

        // Fetch config from DB first
        const { data: settingsData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'inter_config')
            .single();

        const dbConfig = settingsData?.value;

        // Determine which config to use (DB or ENV)
        const clientId = dbConfig?.client_id || process.env.INTER_CLIENT_ID;
        const clientSecret = dbConfig?.client_secret || process.env.INTER_CLIENT_SECRET || '';
        const certRaw = dbConfig?.crt || process.env.INTER_CERT_CONTENT || '';
        const keyRaw = dbConfig?.key || process.env.INTER_KEY_CONTENT || '';

        const cert = certRaw.replace(/\\n/g, '\n');
        const key = keyRaw.replace(/\\n/g, '\n');

        if (!clientId || !cert || !key) {
            return NextResponse.json({ error: 'Configuração do Inter incompleta. Cadastre em Configurações API.' }, { status: 400 });
        }

        const inter = new InterAPIV3({
            clientId,
            clientSecret,
            cert,
            key,
            accountNumber: dbConfig?.account_number || dbConfig?.accountNumber
        });

        // IMPORTANT: Use production URL to ensure Inter calls the right place
        // Temporariamente forçando o domínio do Railway até a migração DNS ser concluída
        const baseUrl = 'https://791-barbershop-production.up.railway.app';
        const webhookUrl = `${baseUrl}/api/webhooks/inter`;

        console.log('[SETUP] Registering Webhook:', webhookUrl);

        // Fetch Pix Key from settings
        const { data: settings } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'inter_config')
            .single();

        const interConfig = settings?.value || {};
        const pixKey = interConfig.pix_key;

        // Register both Boleto and Pix webhooks
        // We do it separately and gracefully handle errors (especially for Pix which might be restricted)
        const results = [];

        try {
            const res1 = await inter.registerWebhook(webhookUrl, 'boleto');
            results.push({ type: 'boleto', success: true, detail: res1 });
        } catch (e: any) {
            console.error('[SETUP] Boleto Webhook Error:', e.message);
            results.push({ type: 'boleto', success: false, error: e.message });
        }

        try {
            if (pixKey) {
                const res2 = await inter.registerWebhook(webhookUrl, 'pix', pixKey);
                results.push({ type: 'pix', success: true, detail: res2 });
            } else {
                results.push({ type: 'pix', success: false, error: 'Chave Pix não configurada' });
            }
        } catch (e: any) {
            console.warn('[SETUP] Pix Webhook Error (expected if account < 6 months):', e.message);
            results.push({ type: 'pix', success: false, error: 'Pix não disponível ou não autorizado (Pode requerer 6 meses de CNPJ)' });
        }

        const anySuccess = results.some(r => r.success);

        return NextResponse.json({
            success: anySuccess,
            registeredUrl: webhookUrl,
            details: results
        });

    } catch (error: any) {
        console.error('[SETUP ERROR]', error);
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
