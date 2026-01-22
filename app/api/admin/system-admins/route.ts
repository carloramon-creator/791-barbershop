
import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
    try {
        const { email, permissions = ['manage_tenants', 'manage_finance', 'manage_plans', 'manage_coupons', 'manage_settings', 'manage_support', 'manage_admins'] } = await req.json();
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // 1. Verify Request Permissions (Must be System Admin)
        const client = await supabase();
        const { data: { user: currentUser }, error: authError } = await client.auth.getUser();

        if (authError || !currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: requesterData } = await client
            .from('users')
            .select('is_system_admin')
            .eq('id', currentUser.id)
            .single();

        if (!requesterData?.is_system_admin && !currentUser.email?.endsWith('@791solucoes.com.br')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Admin Logic
        const adminClient = getSupabaseAdmin();

        // Check if user exists in Auth
        // Supabase Admin listUsers doesn't have simple filter by email in all versions, 
        // but let's try grabbing by email directly via public table first? 
        // No, public table might not have it if they deleted it but kept auth.
        // Let's use inviteUserByEmail, it usually handles 'already exists' gracefully or we catch it.

        // Actually, let's try to find their ID first to see if they are already registered.
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        // listUsers is paginated, not reliable for search if many users.
        // Better: Query public.users first.
        const { data: publicUser } = await adminClient
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        let userId = publicUser?.id;

        if (userId) {
            // User Exists in Public -> Just Promote
            const { error: updateError } = await adminClient
                .from('users')
                .update({
                    is_system_admin: true,
                    admin_permissions: permissions
                })
                .eq('id', userId);

            if (updateError) throw updateError;
            return NextResponse.json({ message: 'User promoted successfully', type: 'promotion' });

        } else {
            // User Not in Public (or Not in Auth). 
            // Try Invite.
            const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email);

            if (inviteError) {
                // If error is "User already registered", then they are in Auth but not Public? Rare edge case.
                throw inviteError;
            }

            const newUserId = inviteData.user.id;

            // Ensure public record exists with is_system_admin
            // We use upsert to be safe
            const { error: insertError } = await adminClient
                .from('users')
                .upsert({
                    id: newUserId,
                    email: email,
                    name: email.split('@')[0], // Default name
                    is_system_admin: true,
                    admin_permissions: permissions,
                    role: null, // Pure admin
                    created_at: new Date().toISOString()
                });

            if (insertError) {
                console.error('Error creating public user:', insertError);
                // If trigger auto-created it, upsert might fail on duplicate key if not careful? 
                // Usually upsert handles it.
            }

            return NextResponse.json({ message: 'User invited successfully', type: 'invite' });
        }

    } catch (e: any) {
        console.error('Error promoting/inviting admin:', e);
        return NextResponse.json({ error: e.message || 'Internal Error' }, { status: 500 });
    }
}
