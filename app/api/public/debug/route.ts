import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { addCorsHeaders } from '@/lib/server-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { data, error } = await supabaseAdmin.from('tenants').select('count', { count: 'exact', head: true });
        const { data: list } = await supabaseAdmin.from('tenants').select('id, slug, name');

        return addCorsHeaders(req, NextResponse.json({
            status: 'online',
            count: data,
            error,
            tenants: list
        }));
    } catch (e: any) {
        return addCorsHeaders(req, NextResponse.json({ status: 'error', message: e.message }));
    }
}
