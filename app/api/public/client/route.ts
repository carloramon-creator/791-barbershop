import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
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
        const { data: client, error } = await supabaseAdmin
            .from('clients')
            .select('id, name, phone, photo_url, tenant_id')
            .eq('id', clientId)
            .eq('tenant_id', tenantId)
            .single();

        if (error || !client) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Cliente não localizado' }, { status: 404 }));
        }

        return addCorsHeaders(req, NextResponse.json({
            id: client.id,
            name: client.name,
            phone: client.phone,
            photo_url: client.photo_url
        }));
    } catch (error: any) {
        console.error('[PUBLIC CLIENT GET] Error:', error.message);
        return addCorsHeaders(req, NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 }));
    }
}
