import { getSupabaseAdmin } from '../lib/supabase-server';

async function test() {
    console.log('--- Testing Database ---');

    // Check support tickets with Joins
    const { data: tickets, error: ticketErr } = await getSupabaseAdmin()
        .from('support_tickets')
        .select(`
            *,
            tenants ( name ),
            user:users ( name, nickname )
        `)
        .limit(5);

    if (ticketErr) {
        console.error('Error fetching support_tickets:', ticketErr.message);
    } else {
        console.log('Recent tickets:', tickets?.length || 0);
        tickets?.forEach(t => console.log(`- [${t.created_at}] T:${t.tenant_id} U:${t.user_id}: ${t.message.substring(0, 30)}...`));
    }

    // Check barbers
    const { data: barbers, error: barberErr } = await getSupabaseAdmin()
        .from('barbers')
        .select('id, user_id, tenant_id')
        .limit(5);

    if (barberErr) {
        console.error('Error fetching barbers:', barberErr.message);
    } else {
        console.log('Barbers count sample:', barbers?.length || 0);
    }

    // Check users
    const { data: users, error: userErr } = await getSupabaseAdmin()
        .from('users')
        .select('id, email, roles')
        .limit(5);

    if (userErr) {
        console.error('Error fetching users:', userErr.message);
    } else {
        console.log('Users sample:', users?.length || 0);
    }
}

test();
