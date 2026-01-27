import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { InterAPIV3 } from '@/lib/inter-api-v3';

export async function GET(req: NextRequest) {
    try {
        // 1. Verificar se é superadmin (Segurança)
        const { data: { session } } = await getSupabaseAdmin().auth.getSession();
        // Nota: Em produção, o middleware ou uma checagem de role deve validar o is_system_admin

        const searchParams = req.nextUrl.searchParams;
        const days = searchParams.get('days') || '30';

        // 2. Buscar Configuração do Inter
        const { data: settingsData } = await getSupabaseAdmin()
            .from('system_settings')
            .select('value')
            .eq('key', 'inter_config')
            .single();

        const dbConfig = settingsData?.value;
        const cert = (dbConfig?.crt || process.env.INTER_CERT_CONTENT || '').replace(/\\n/g, '\n');
        const key = (dbConfig?.key || process.env.INTER_KEY_CONTENT || '').replace(/\\n/g, '\n');

        if (!dbConfig?.pix_key || !cert || !key) {
            return NextResponse.json({ error: 'Configuração do Inter incompleta.' }, { status: 400 });
        }

        const inter = new InterAPIV3({
            clientId: dbConfig?.client_id || process.env.INTER_CLIENT_ID || '',
            clientSecret: dbConfig?.client_secret || process.env.INTER_CLIENT_SECRET || '',
            cert,
            key,
            accountNumber: dbConfig?.account_number || dbConfig?.accountNumber
        });

        // 3. Calcular período (Padrão 30 dias)
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - Number(days));

        const startDate = start.toISOString().split('T')[0];
        const endDate = end.toISOString().split('T')[0];

        console.log(`[ADMIN API] Listando acordos de ${startDate} até ${endDate}`);
        const data = await inter.listRecurrenceAgreements(startDate, endDate);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[ADMIN INTER API ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
