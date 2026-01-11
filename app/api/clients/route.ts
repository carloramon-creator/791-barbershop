import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function GET(req: Request) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');

        let query = supabaseAdmin
            .from('clients')
            .select('*')
            .eq('tenant_id', tenant.id)
            .order('name', { ascending: true });

        if (search) {
            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,cpf.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const payload = await req.json();

        const { data, error } = await supabaseAdmin
            .from('clients')
            .insert({
                ...payload,
                tenant_id: tenant.id
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: 'Um cliente com este telefone já está cadastrado.' }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const payload = await req.json();

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const { data, error } = await supabaseAdmin
            .from('clients')
            .update(payload)
            .eq('id', id)
            .eq('tenant_id', tenant.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // 1. Limpar referências na fila (client_queue) ou agendamentos
        // Em vez de deletar da fila (o que apagaria o histórico de atendimentos), 
        // vamos apenas anular o client_id para manter os registros de atendimento 
        // para fins estatísticos nas barbearias.
        await supabaseAdmin
            .from('client_queue')
            .update({ client_id: null })
            .eq('client_id', id)
            .eq('tenant_id', tenant.id);

        await supabaseAdmin
            .from('appointments')
            .update({ client_id: null })
            .eq('client_id', id)
            .eq('tenant_id', tenant.id);

        // 2. Agora excluir o cliente
        const { error } = await supabaseAdmin
            .from('clients')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenant.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
