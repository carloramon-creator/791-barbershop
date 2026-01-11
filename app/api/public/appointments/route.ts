import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { addCorsHeaders, resolveTenantId } from '@/lib/server-utils';

export async function OPTIONS(req: Request) {
    return addCorsHeaders(req, new NextResponse(null, { status: 200 }));
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            tenant_slug,
            client_name,
            client_phone,
            cpf,
            photo_url,
            barber_id,
            start_time,
            end_time,
            service_ids,
            status = 'scheduled'
        } = body;

        if (!tenant_slug || !barber_id || !start_time || !end_time || !service_ids) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Faltam dados obrigatórios' }, { status: 400 }));
        }

        const tenantId = await resolveTenantId(tenant_slug);
        if (!tenantId) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 }));
        }

        // 1. Verificar se cliente já existe ou cadastrar/atualizar
        let clientId = null;
        if (client_phone) {
            const phoneClean = client_phone.replace(/\D/g, '');
            const { data: existingClient } = await supabaseAdmin
                .from('clients')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('phone', phoneClean)
                .maybeSingle();

            if (existingClient) {
                clientId = existingClient.id;
                // Atualizar dados se necessário
                await supabaseAdmin.from('clients').update({ name: client_name, cpf, photo_url }).eq('id', clientId);
            } else {
                const { data: newClient } = await supabaseAdmin
                    .from('clients')
                    .insert({ tenant_id: tenantId, name: client_name, phone: phoneClean, cpf, photo_url })
                    .select('id')
                    .single();
                clientId = newClient?.id;
            }
        }

        // 2. Criar Agendamento
        const { data: appointment, error: aptError } = await supabaseAdmin
            .from('appointments')
            .insert({
                tenant_id: tenantId,
                barber_id,
                client_id: clientId,
                client_name,
                client_phone,
                start_time,
                end_time,
                service_id: service_ids[0], // Fallback para compatibilidade com schema legado se necessário
                service_ids,
                status
            })
            .select()
            .single();

        if (aptError) throw aptError;

        return addCorsHeaders(req, NextResponse.json(appointment));
    } catch (error: any) {
        console.error('[PUBLIC APPOINTMENT ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
