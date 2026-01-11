import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { addCorsHeaders, resolveTenantId } from '@/lib/server-utils';

export async function OPTIONS(req: Request) {
    return addCorsHeaders(req, new NextResponse(null, { status: 200 }));
}

/**
 * Endpoint PÚBLICO para identificar um cliente via ID único (personalizado).
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('id');
        const slug = searchParams.get('slug');

        if (!clientId) {
            return addCorsHeaders(req, NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 }));
        }

        // Determinar tenant_id se o slug for fornecido (para segurança extra)
        let tenantId = null;
        if (slug) {
            tenantId = await resolveTenantId(slug);
        }

        let query = supabaseAdmin
            .from('clients')
            .select('id, name, phone, photo_url, cpf, tenant_id')
            .eq('id', clientId);

        if (tenantId) {
            query = query.eq('tenant_id', tenantId);
        }

        const { data: client, error } = await query.maybeSingle();

        if (error) throw error;
        if (!client) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 }));
        }

        return addCorsHeaders(req, NextResponse.json(client));
    } catch (error: any) {
        console.error('[PUBLIC CLIENT GET ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
