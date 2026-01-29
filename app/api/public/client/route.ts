import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { resolveTenantId, addCorsHeaders } from '@/lib/server-utils';

export async function OPTIONS(req: Request) {
    return addCorsHeaders(req, new NextResponse(null, { status: 200 }));
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('id');
        const slug = searchParams.get('slug');

        if (!clientId || !slug) {
            return addCorsHeaders(req, NextResponse.json({ error: 'ID e Slug são obrigatórios' }, { status: 400 }));
        }

        // 1. Resolver Tenant ID pelo Slug
        const tenantId = await resolveTenantId(slug);
        if (!tenantId) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Barbearia não localizada' }, { status: 404 }));
        }

        // 2. Buscar dados básicos do cliente
        const { data: client, error } = await getSupabaseAdmin()
            .from('clients')
            .select('id, name, phone, photo_url, cpf, tenant_id, birth_date')
            .eq('id', clientId)
            .eq('tenant_id', tenantId)
            .single();

        if (error || !client) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Cliente não localizado' }, { status: 404 }));
        }

        // 3. Verificar se é aniversário hoje para o In-App Notification
        let birthdayVoucher = null;
        const today = new Date();
        const bday = client.birth_date ? new Date(client.birth_date) : null;
        const isBirthday = bday && bday.getMonth() === today.getMonth() && bday.getDate() === today.getDate();

        if (isBirthday) {
            // Buscar voucher de aniversário ativo
            const { data: voucher } = await getSupabaseAdmin()
                .from('client_vouchers')
                .select('*')
                .eq('client_id', client.id)
                .eq('is_birthday', true)
                .is('used_at', null)
                .gte('expires_at', today.toISOString())
                .limit(1)
                .maybeSingle();

            birthdayVoucher = voucher;
        }

        return addCorsHeaders(req, NextResponse.json({
            id: client.id,
            name: client.name,
            phone: client.phone,
            photo_url: client.photo_url,
            cpf: client.cpf,
            is_birthday: isBirthday,
            birthday_voucher: birthdayVoucher
        }));
    } catch (error: any) {
        console.error('[PUBLIC CLIENT GET] Error:', error.message);
        return addCorsHeaders(req, NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 }));
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, fcm_token } = body;

        if (!id) {
            return addCorsHeaders(req, NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 }));
        }

        const { data, error } = await getSupabaseAdmin()
            .from('clients')
            .update({ fcm_token })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return addCorsHeaders(req, NextResponse.json(data));
    } catch (error: any) {
        console.error('[PUBLIC CLIENT PATCH] Error:', error.message);
        return addCorsHeaders(req, NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 }));
    }
}
