import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function POST(req: Request) {
    try {
        const { user, tenant } = await getCurrentUserAndTenant();

        if (!user || !tenant) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // TODO: Adicionar verificação se user é admin/dono se necessário

        const body = await req.json();
        const { access_token, phone_number_id, business_account_id } = body;

        if (!access_token || !phone_number_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Opcional: Validar token com API do Facebook aqui se quiser ser muito robusto
        // Por enquanto, vamos confiar e salvar.

        const { data, error } = await getSupabaseAdmin()
            .from('whatsapp_configs')
            .upsert({
                tenant_id: tenant.id,
                access_token,
                phone_number_id,
                business_account_id,
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id' })
            .select()
            .single();

        if (error) {
            console.error('[WhatsApp Config Error]', error);
            return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
        }

        return NextResponse.json({ success: true, config: data });

    } catch (error: any) {
        console.error('[WhatsApp Config API Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { user, tenant } = await getCurrentUserAndTenant();

        if (!user || !tenant) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await getSupabaseAdmin()
            .from('whatsapp_configs')
            .select('access_token, phone_number_id, business_account_id')
            .eq('tenant_id', tenant.id)
            .maybeSingle();

        if (error) {
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        // Mascarar o token para a UI
        const maskedData = data ? {
            ...data,
            access_token: data.access_token ? `${data.access_token.substring(0, 10)}...` : '',
            is_configured: true
        } : { is_configured: false };

        return NextResponse.json(maskedData);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
