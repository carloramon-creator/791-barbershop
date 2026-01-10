
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
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

        // Buscar faturas SaaS
        const { data: invoices, error } = await supabaseAdmin
            .from('finance')
            .select('*')
            .eq('tenant_id', tenant.id)
            .ilike('description', 'SaaS%')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return addCorsHeaders(req, NextResponse.json({ invoices: invoices || [] }));
    } catch (error: any) {
        console.error('[GET INVOICES ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
