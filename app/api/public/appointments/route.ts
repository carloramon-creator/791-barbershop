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

        // 3. Atualizar FCM Token do cliente se fornecido
        if (body.fcm_token && clientId) {
            await supabaseAdmin
                .from('clients')
                .update({ fcm_token: body.fcm_token })
                .eq('id', clientId);
        }

        return addCorsHeaders(req, NextResponse.json(appointment));
    } catch (error: any) {
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get('slug');
        const phone = searchParams.get('phone');

        if (!slug || !phone) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Slug e Telefone são obrigatórios' }, { status: 400 }));
        }

        const tenantId = await resolveTenantId(slug);
        if (!tenantId) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 }));
        }

        // Limpa telefone para garantir apenas números
        const phoneClean = phone.replace(/\D/g, '');

        let query = supabaseAdmin
            .from('appointments')
            .select(`
                *,
                barbers (
                    name,
                    nickname,
                    users (
                        photo_url
                    )
                ),
                service_ids
            `)
            .eq('tenant_id', tenantId)
            // Busca por telefone exato (com máscara se vier) OU telefone limpo (se salvo apenas números)
            // IMPORTANTE: Valores com caracteres especiais (espaço, parenteses) devem estar entre aspas duplas na string do PostgREST
            .or(`client_phone.eq."${phone}",client_phone.eq."${phoneClean}",client_phone.eq."${phoneClean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}"`)
            .order('start_time', { ascending: true });

        // Pega desde o início do dia para evitar problemas de timezone
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('start_time', today.toISOString());

        const { data: appointments, error } = await query;

        if (error) throw error;

        // Se precisarmos expandir os serviços, faríamos aqui, mas o front pode lidar com IDs ou podemos fazer join se o schema permitir
        // Por enquanto retornamos os IDs e o front já tem a lista de serviços carregada, ou podemos fazer um fetch extra. 
        // Simplificação: Front já tem serviços carregados no wizard, pode reaproveitar ou buscar novamente.
        // Melhor: Retornar detalhes dos serviços se possível, mas o schema atual usa array de IDs.
        // Vamos buscar os serviços para enriquecer a resposta

        let enrichedAppointments = appointments;

        if (appointments && appointments.length > 0) {
            const allServiceIds = Array.from(new Set(appointments.flatMap(a => a.service_ids || [])));
            if (allServiceIds.length > 0) {
                const { data: services } = await supabaseAdmin
                    .from('services')
                    .select('id, name, price, duration_minutes')
                    .in('id', allServiceIds);

                if (services) {
                    const serviceMap = new Map(services.map(s => [s.id, s]));
                    enrichedAppointments = appointments.map(a => ({
                        ...a,
                        services_details: (a.service_ids || []).map((id: string) => serviceMap.get(id)).filter(Boolean)
                    }));
                }
            }
        }

        return addCorsHeaders(req, NextResponse.json(enrichedAppointments));

    } catch (error: any) {
        console.error('[GET APPOINTMENTS ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
