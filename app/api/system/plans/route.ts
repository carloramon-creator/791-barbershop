import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function GET(req: Request) {
    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Acesso negado' }, { status: 403 }));
        }

        const { data: plans, error } = await supabaseAdmin
            .from('system_plans')
            .select('*')
            .order('price', { ascending: true });

        if (error) throw error;

        return addCorsHeaders(req, NextResponse.json(plans));
    } catch (error: any) {
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

export async function POST(req: Request) {
    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Acesso negado' }, { status: 403 }));
        }

        const body = await req.json();
        const { data, error } = await supabaseAdmin
            .from('system_plans')
            .insert([body])
            .select()
            .single();

        if (error) throw error;

        return addCorsHeaders(req, NextResponse.json(data));
    } catch (error: any) {
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

export async function PATCH(req: Request) {
    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Acesso negado' }, { status: 403 }));
        }

        const body = await req.json();
        const { id, ...updates } = body;

        const { data, error } = await supabaseAdmin
            .from('system_plans')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return addCorsHeaders(req, NextResponse.json(data));
    } catch (error: any) {
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
