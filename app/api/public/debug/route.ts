import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import fs from 'fs';
import path from 'path';
import { addCorsHeaders } from '@/lib/server-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        let commitHash = 'unknown';
        try {
            commitHash = fs.readFileSync(path.join(process.cwd(), 'commit_hash.txt'), 'utf8').trim();
        } catch (e) { }

        const { data, error } = await getSupabaseAdmin().from('tenants').select('count', { count: 'exact', head: true });
        const { data: list } = await getSupabaseAdmin().from('tenants').select('id, slug, name');

        const testSlug = 'ingleses';
        const { resolveTenantId } = await import('@/lib/server-utils');
        const resolvedId = await resolveTenantId(testSlug);

        const { data: testResult, error: testError } = await getSupabaseAdmin()
            .from('tenants')
            .select('id')
            .ilike('slug', testSlug)
            .maybeSingle();

        return addCorsHeaders(req, NextResponse.json({
            status: 'online',
            commit: commitHash,
            count: data,
            error,
            tenants: list,
            test: {
                slug: testSlug,
                resolvedId: resolvedId,
                rawResult: testResult,
                error: testError
            }
        }));
    } catch (e: any) {
        return addCorsHeaders(req, NextResponse.json({ status: 'error', message: e.message }));
    }
}
