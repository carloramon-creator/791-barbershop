import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { addCorsHeaders } from '@/lib/server-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { data, error } = await supabaseAdmin.from('tenants').select('count', { count: 'exact', head: true });
        const { data: list } = await supabaseAdmin.from('tenants').select('id, slug, name');

        const testSlug = 'ingleses';
        const { data: testResult, error: testError } = await supabaseAdmin
            .from('tenants')
            .select('id')
            .ilike('slug', testSlug)
            .maybeSingle();

        return addCorsHeaders(req, NextResponse.json({
            status: 'online',
            count: data,
            error,
            tenants: list,
            test: {
                slug: testSlug,
                result: testResult,
                error: testError
            }
        }));
    } catch (e: any) {
        return addCorsHeaders(req, NextResponse.json({ status: 'error', message: e.message }));
    }
}
