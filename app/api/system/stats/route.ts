import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function GET(req: Request) {
    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const { data: stats, error } = await getSupabaseAdmin().rpc('get_system_global_stats');

        if (error) throw error;

        return NextResponse.json(stats);
    } catch (error: any) {
        console.error('[SYSTEM STATS GET] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
