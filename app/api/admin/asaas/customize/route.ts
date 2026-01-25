import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import AsaasClient from '@/lib/asaas-client';

export async function POST(req: Request) {
    try {
        const payload = await req.json();

        // 1. Validar Admin (apenas admin do sistema pode alterar isso)
        // Por simplificação assumimos que o middleware/chamada já verifica, 
        // mas aqui vamos pegar as configs do banco

        const { data: settingsData } = await getSupabaseAdmin()
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

        // 2. Chamar Asaas (Visual)
        if (payload.logoUrl || payload.primaryColor || payload.secondaryColor || payload.fontColor) {
            await asaas.customizeInvoice({
                logoUrl: payload.logoUrl,
                primaryColor: payload.primaryColor,
                secondaryColor: payload.secondaryColor,
                fontColor: payload.fontColor,
                observations: 'Obrigado pela preferência.'
            });
        }

        // 3. Chamar Asaas (Dados Comerciais - Email, Telefone, Site)
        if (payload.commercialInfo) {
            await asaas.updateCommercialInfo({
                email: payload.commercialInfo.email,
                phone: payload.commercialInfo.phone,
                mobilePhone: payload.commercialInfo.mobilePhone,
                site: payload.commercialInfo.site
            });
        }

        // 4. Salvar nas configurações locais
        await getSupabaseAdmin()
            .from('system_settings')
            .upsert({
                key: 'asaas_branding',
                value: payload
            });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[ASAAS BRANDING ERROR]', error?.response?.data || error);
        const errorMsg = error?.response?.data?.errors?.[0]?.description || error.message || 'Erro desconhecido';
        return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
}
