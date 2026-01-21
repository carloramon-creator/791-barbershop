import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
    try {
        const { data: tables } = await supabaseAdmin.rpc('get_tables_list'); // If accessible

        // Let's just try to select 1 from support_tickets
        const { data: ticketCount, error: ticketError } = await supabaseAdmin
            .from('support_tickets')
            .select('id')
            .limit(1);

        const { data: barberCount, error: barberError } = await supabaseAdmin
            .from('barbers')
            .select('id')
            .limit(1);

        return NextResponse.json({
            support_tickets: {
                exists: !ticketError,
                error: ticketError?.message,
                sample: ticketCount
            },
            barbers: {
                exists: !barberError,
                error: barberError?.message,
                sample: barberCount
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message });
    }
}
