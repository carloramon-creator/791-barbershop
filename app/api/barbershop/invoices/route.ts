
import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function GET(req: Request) {
    try {
        const { tenant, user } = await getCurrentUserAndTenant();
        if (!tenant || !user) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Não autenticado' }, { status: 401 }));
        }

        // Buscar faturas SaaS (tenant_id null mas metadata tem o ID do tenant)
        const { data: invoices, error } = await supabaseAdmin
            .from('finance')
            .select('*')
            .or(`metadata->>tenant_id.eq.${tenant.id},tenant_id.eq.${tenant.id}`)
            .contains('metadata', { method: 'boleto_inter' }) // Filtra apenas faturas SaaS
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Adicionar também as de Pix
        const { data: pixInvoices } = await supabaseAdmin
            .from('finance')
            .select('*')
            .or(`metadata->>tenant_id.eq.${tenant.id},tenant_id.eq.${tenant.id}`)
            .contains('metadata', { method: 'pix_inter' })
            .order('created_at', { ascending: false });

        const allInvoices = [...(invoices || []), ...(pixInvoices || [])].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return addCorsHeaders(req, NextResponse.json({ invoices: allInvoices }));
    } catch (error: any) {
        console.error('[GET INVOICES ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
