import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { addCorsHeaders } from '@/lib/server-utils';

export async function OPTIONS(req: Request) {
    return addCorsHeaders(req, new NextResponse(null, { status: 200 }));
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ barberId: string }> }
) {
    try {
        const { barberId } = await params;

        const { data, error } = await supabaseAdmin
            .from('barber_services')
            .select('service_id')
            .eq('barber_id', barberId);

        if (error) throw error;
        return addCorsHeaders(req, NextResponse.json(data?.map(d => d.service_id) || []));
    } catch (error: any) {
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
