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
            .from('barbers')
            .select('*, users(photo_url, name, nickname), barber_services(service_id)')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        // Formatar para resposta limpa
        const formatted = data?.map(b => ({
            id: b.id,
            name: b.name || (b as any).users?.name,
            nickname: b.nickname || (b as any).users?.nickname,
            photo_url: (b as any).users?.photo_url || b.photo_url,
            status: b.status,
            service_ids: (b as any).barber_services?.map((bs: any) => bs.service_id) || []
        })) || [];

        return addCorsHeaders(req, NextResponse.json(formatted));
    } catch (error: any) {
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
