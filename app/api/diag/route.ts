import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
    try {
        const { data: tables } = await getSupabaseAdmin().rpc('get_tables_list'); // If accessible

        const { data: supportTickets, error: supportError } = await getSupabaseAdmin()
            .from('support_tickets')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        const { data: barbersList, error: barbersError } = await getSupabaseAdmin()
            .from('barbers')
            .select('id, user_id, tenant_id, name')
            .limit(5);

        return NextResponse.json({
            status: 'ok',
            database: {
                support_tickets: {
                    count: supportTickets?.length || 0,
                    error: supportError?.message,
                    items: supportTickets
                },
                barbers: {
                    count: barbersList?.length || 0,
                    error: barbersError?.message,
                    items: barbersList
                }
            },
            server_time: new Date().toISOString()
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message });
    }
}
