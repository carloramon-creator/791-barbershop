import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { addCorsHeaders, resolveTenantId } from '@/lib/server-utils';

export async function OPTIONS(req: Request) {
    return addCorsHeaders(req, new NextResponse(null, { status: 200 }));
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get('slug');

        if (!slug) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Slug não fornecido' }, { status: 400 }));
        }

        const tenantId = await resolveTenantId(slug);
        if (!tenantId) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 }));
        }

        const { data, error } = await supabaseAdmin
            .from('services')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('name');

        if (error) throw error;
        return addCorsHeaders(req, NextResponse.json(data || []));
    } catch (error: any) {
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
