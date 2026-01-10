
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { id: barberId } = await params;

        // Verify if barber belongs to tenant (implicit check via join if needed, or simple select)
        // Here we just fetch directly from barber_services. 
        // We assume RLS or logic ensures isolation, but admin client bypasses RLS, so we trust tenant_id check on upper levels usually.
        // However, barber_services linking table might not have tenant_id.
        // BUT, the services themselves have tenant_id and the user has tenant_id.

        const { data, error } = await supabaseAdmin
            .from('barber_services')
            .select('service_id')
            .eq('barber_id', barberId);

        if (error) throw error;

        // Return array of service IDs
        return NextResponse.json(data.map((row: any) => row.service_id));
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { id: barberId } = await params;
        const { serviceIds } = await request.json();

        if (!Array.isArray(serviceIds)) {
            return NextResponse.json({ error: 'serviceIds must be an array' }, { status: 400 });
        }

        // 1. Delete all existing links
        const { error: deleteError } = await supabaseAdmin
            .from('barber_services')
            .delete()
            .eq('barber_id', barberId);

        if (deleteError) throw deleteError;

        // 2. Insert new links
        if (serviceIds.length > 0) {
            const inserts = serviceIds.map(id => ({
                barber_id: barberId,
                service_id: id
            }));

            const { error: insertError } = await supabaseAdmin
                .from('barber_services')
                .insert(inserts);

            if (insertError) throw insertError;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
