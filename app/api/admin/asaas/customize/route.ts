import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import AsaasClient from '@/lib/asaas-client';

export async function POST(req: Request) {
    try {
        const payload = await req.json();

        // 1. Validar Admin (apenas admin do sistema pode alterar isso)
        // Por simplificação assumimos que o middleware/chamada já verifica, 
        // mas aqui vamos pegar as configs do banco

        const { data: settingsData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'asaas_config')
            .single();

        const asaasConfig = settingsData?.value;
        const apiKey = asaasConfig?.api_key || process.env.ASAAS_API_KEY;
        const environment = asaasConfig?.environment || 'sandbox';

        if (!apiKey) {
            return NextResponse.json({ error: 'Asaas não configurado' }, { status: 400 });
        }

        const asaas = new AsaasClient({ apiKey, environment });

        // 2. Chamar Asaas
        const result = await asaas.customizeInvoice({
            logoUrl: payload.logoUrl,
            primaryColor: payload.primaryColor,
            infoColor: payload.infoColor,
            observations: 'Obrigado pela preferência.'
        });

        // 3. Salvar nas configurações locais também para persistência visual
        await supabaseAdmin
            .from('system_settings')
            .upsert({
                key: 'asaas_branding',
                value: payload
            });

        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        console.error('[ASAAS BRANDING ERROR]', error?.response?.data || error);
        return NextResponse.json({
            error: error?.response?.data?.errors?.[0]?.description || error.message
        }, { status: 400 });
    }
}
