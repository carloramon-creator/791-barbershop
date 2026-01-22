import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function GET(req: Request) {
    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const businessUnit = searchParams.get('businessUnit');

        let query = supabaseAdmin
            .from('system_finance_records')
            .select('*')
            .order('date', { ascending: false });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        if (businessUnit && businessUnit !== 'all') query = query.eq('business_unit', businessUnit);

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[HOLDING FINANCE GET] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req: Request) {
    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const payload = await req.json();

        const { data, error } = await supabaseAdmin
            .from('system_finance_records')
            .insert({
                ...payload,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[HOLDING FINANCE POST] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const deleteMode = searchParams.get('deleteMode') || 'single'; // single, all, future

        // Se for modo single, precisa do ID. Se for outro modo, precisa do ID de referência para buscar o recurrence_id
        if (!id) throw new Error('ID não informado');

        // 1. Fetch the target record to check for recurrence metadata (if we need it)
        // For efficiency, we can just trust the client params if we passed recurrenceId directly, but let's stick to ID for safety or fetch it.
        // Let's assume the frontend passes the ID of the record being clicked.

        let query = supabaseAdmin.from('system_finance_records').delete();

        if (deleteMode === 'single') {
            query = query.eq('id', id);
        } else {
            // Fetch the record first to get the recurrence_id
            const { data: record, error: fetchError } = await supabaseAdmin
                .from('system_finance_records')
                .select('metadata, date')
                .eq('id', id)
                .single();

            if (fetchError || !record) throw new Error('Registro não encontrado');

            const recurrenceId = record.metadata?.recurrence?.id;
            if (!recurrenceId) {
                // Fallback to single delete if no recurrence info
                query = query.eq('id', id);
            } else {
                // Recurrence Logic
                if (deleteMode === 'all') {
                    // Delete based on the JSON path for recurrence ID
                    // syntax for JSON containment or path match might vary.
                    // A cleaner way is using the arrow operator ->> for text comparison
                    query = query.filter('metadata->recurrence->>id', 'eq', recurrenceId);
                } else if (deleteMode === 'future') {
                    query = query
                        .filter('metadata->recurrence->>id', 'eq', recurrenceId)
                        .gte('date', record.date);
                }
            }
        }

        const { error } = await query;

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[HOLDING FINANCE DELETE] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
