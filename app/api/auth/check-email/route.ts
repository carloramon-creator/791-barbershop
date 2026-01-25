import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const getSupabaseAdmin() = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Check if email exists in auth users
        // Note: listUsers is an admin operation. 
        // We fetching only 1 page, hoping to filter? 
        // Supabase Admin listUsers doesn't support filtering by email directly in all versions, 
        // but modern versions do via options or we can check a public profile table if it exists.
        // Assuming we rely on the auth system, we might need to iterate or use a different approach if the user base is huge.
        // For now, let's try to query the "users" table which we seem to be populating in signup route:
        // "const { data: user, error: userError } = await getSupabaseAdmin().from('users').insert({...})"

        // Let's verify if there is a 'users' table in signup/route.ts
        // In the viewed code of signup/route.ts, I see:
        // const { data: user, error: userError } = await getSupabaseAdmin().from('users').insert({...})
        // So YES, there is a public.users table. We should check THAT.

        const { data, error } = await getSupabaseAdmin()
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error('Error checking email:', error);
            // Fail open or closed? If db error, maybe let them proceed and fail at end? 
            // Or block. Let's return error.
            return NextResponse.json({ error: 'Erro ao verificar email' }, { status: 500 });
        }

        if (data) {
            return NextResponse.json({ exists: true });
        }

        return NextResponse.json({ exists: false });

    } catch (error) {
        console.error('Check email error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
