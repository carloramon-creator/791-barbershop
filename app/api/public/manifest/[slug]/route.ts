import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { addCorsHeaders } from '@/lib/server-utils';

export const dynamic = 'force-dynamic';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('c');

        const { data: tenant, error } = await getSupabaseAdmin()
            .from('tenants')
            .select('name, logo_url')
            .eq('slug', slug)
            .single();

        if (error || !tenant) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const manifest = {
            "name": tenant.name,
            "short_name": tenant.name,
            "start_url": clientId ? `/${slug}?c=${clientId}` : `/${slug}`,
            "display": "standalone",
            "background_color": "#020617",
            "theme_color": "#3b82f6",
            "icons": [
                {
                    "src": tenant.logo_url || "/icon-192.png",
                    "sizes": "192x192",
                    "type": "image/png",
                    "purpose": "any maskable"
                },
                {
                    "src": tenant.logo_url || "/icon-512.png",
                    "sizes": "512x512",
                    "type": "image/png",
                    "purpose": "any maskable"
                }
            ]
        };

        const response = NextResponse.json(manifest);
        return addCorsHeaders(req, response);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
