import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function GET(req: Request) {
    try {
        // Permitir que qualquer pessoa veja os addons (público)
        // await getCurrentUserAndTenant();

        const { data: addons, error } = await supabaseAdmin
            .from('system_addons')
            .select('*')
            .order('price', { ascending: true });

        if (error) throw error;

        return addCorsHeaders(req, NextResponse.json(addons));
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
            .from('system_addons')
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
            .from('system_addons')
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
