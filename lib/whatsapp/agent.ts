import { WhatsAppClient, WhatsAppCredentials } from './client';
import { WhatsAppSession } from './session';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { addMinutes, parse, format, isAfter, startOfToday, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AgentContext {
    tenantId: string;
    creds: WhatsAppCredentials;
}

/**
 * WhatsAppAgent
 * Responsável por processar a lógica de conversação, intenções e fluxos.
 * Agora com suporte Multi-tenant.
 */
export class WhatsAppAgent {
    /**
     * Ponto de entrada para mensagens vindas do Webhook
     */
    static async handleMessage(ctx: AgentContext, payload: { from: string, text: string, buttonId?: string, messageType: string }) {
        const { from, text, buttonId } = payload;
        try {
            const session = await WhatsAppSession.get(ctx.tenantId, from);
            const input = (text || '').toUpperCase();

            console.log(`[WHATSAPP_AGENT] Processing message for Tenant ${ctx.tenantId} from ${from}. State: ${session.state}`);

            // Comandos Globais de Reset
            if (input === 'MENU' || input === 'SAIR' || input === 'CANCELAR' || input === 'OI' || input === 'OLA' || input === 'OLÁ') {
                await WhatsAppSession.clear(ctx.tenantId, from);
                return await this.handleIdleState(ctx, from);
            }

            // 1. Fluxos de Registro (REGISTRATION)
            if (session.state === 'registration_name') {
                return await this.handleRegistrationName(ctx, from, session, text);
            }
            if (session.state === 'registration_birthday') {
                return await this.handleRegistrationBirthday(ctx, from, session, text);
            }

            // 2. Detecção de Intenção Inicial (se estiver em IDLE ou se enviar uma palavra-chave agnóstica de estado)
            if (session.state === 'idle' || input === 'AGENDAR' || input === 'FILA') {
                return await this.handleIdleState(ctx, from, text, buttonId);
            }

            // 3. Fluxos de Agendamento (BOOKING)
            if (session.state.startsWith('booking_')) {
                return await this.handleBookingFlow(ctx, from, session, text, buttonId);
            }

            // 4. Fluxos de Fila (QUEUE)
            if (session.state.startsWith('queue_')) {
                return await this.handleQueueFlow(ctx, from, session, text, buttonId);
            }

            // Fallback genérico
            return await this.handleIdleState(ctx, from);
        } catch (error: any) {
            console.error('[WHATSAPP_AGENT_CRASH]', error.message, error.stack);
        }
    }

    /**
     * Estado Inicial: Detectar o que o cliente quer
     */
    private static async handleIdleState(ctx: AgentContext, phone: string, text: string = '', buttonId?: string) {
        const input = text.toUpperCase();

        // 0. Buscar Cadastro do Cliente para ver se precisamos de registro
        const { data: client } = await getSupabaseAdmin()
            .from('clients')
            .select('id, name, birth_date')
            .eq('tenant_id', ctx.tenantId)
            .eq('phone', phone)
            .maybeSingle();

        // Se não tem nome (novo) ou o nome é o padrão "Cliente WhatsApp", ou não tem data de nascimento
        if (!client || !client.name || client.name === 'Cliente WhatsApp' || !client.birth_date) {
            await WhatsAppSession.update(ctx.tenantId, phone, 'registration_name', {
                originalAction: buttonId || (input.includes('AGENDAR') ? 'BOOKING_START' : input.includes('FILA') ? 'QUEUE_START' : null)
            });
            return WhatsAppClient.sendText(ctx.creds, phone, "Olá! Notei que é sua primeira vez por aqui. 💈\n\nPara começarmos, *qual é o seu nome completo?*");
        }

        // 1. Buscar Configurações do Tenant para saber o que oferecer
        const { data: tenant } = await getSupabaseAdmin()
            .from('tenants')
            .select('module_queue_enabled, module_appointments_enabled')
            .eq('id', ctx.tenantId)
            .single();

        const queueEnabled = tenant?.module_queue_enabled ?? true;
        const apptEnabled = tenant?.module_appointments_enabled ?? true;

        // Intenção: AGENDAR
        if (apptEnabled && (input.includes('AGENDAR') || input.includes('MARCAR') || buttonId === 'BOOKING_START' || buttonId === 'BIRTHDAY_AGENDAR')) {
            await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_service', { coupon: buttonId === 'BIRTHDAY_AGENDAR' ? 'BIRTHDAY' : null });

            const services = await this.listServices(ctx.tenantId);
            if (!services || services.length === 0) {
                return WhatsAppClient.sendText(ctx.creds, phone, "Nenhum serviço disponível no momento. Por favor, tente mais tarde.");
            }

            return WhatsAppClient.sendList(
                ctx.creds,
                phone,
                "Perfeito! Qual serviço você gostaria de realizar?",
                "Ver Serviços",
                [{
                    title: "Serviços Disponíveis",
                    rows: services.map(s => ({
                        id: s.id,
                        title: s.name,
                        description: `R$ ${s.price}`
                    }))
                }]
            );
        }

        // Intenção: FILA
        if (queueEnabled && (input.includes('FILA') || input.includes('ESPERA') || buttonId === 'QUEUE_START' || buttonId === 'BIRTHDAY_FILA')) {
            await WhatsAppSession.update(ctx.tenantId, phone, 'queue_confirm', { coupon: buttonId === 'BIRTHDAY_FILA' ? 'BIRTHDAY' : null });
            return WhatsAppClient.sendButtons(ctx.creds, phone, "Você gostaria de entrar na fila agora?", [
                { id: 'QUEUE_YES', title: 'Sim, entrar na fila' },
                { id: 'QUEUE_NO', title: 'Não, agora não' }
            ]);
        }

        // Menu Inicial Dinâmico
        const buttons = [];
        if (apptEnabled) buttons.push({ id: 'BOOKING_START', title: 'Agendar Horário' });
        if (queueEnabled) buttons.push({ id: 'QUEUE_START', title: 'Entrar na Fila' });

        if (buttons.length === 0) {
            return WhatsAppClient.sendText(ctx.creds, phone, "Olá! No momento estamos sem serviços disponíveis para agendamento online. Por favor, entre em contato via telefone.");
        }

        return WhatsAppClient.sendButtons(
            ctx.creds,
            phone,
            "Olá! Sou o assistente da barbearia. 💈\n\nComo posso te ajudar hoje?",
            buttons
        );
    }

    /**
     * Fluxo de Registro: Nome
     */
    private static async handleRegistrationName(ctx: AgentContext, phone: string, session: any, text: string) {
        if (!text || text.length < 3) {
            return WhatsAppClient.sendText(ctx.creds, phone, "Por favor, digite seu nome completo para continuarmos.");
        }

        session.context.name = text;
        await WhatsAppSession.update(ctx.tenantId, phone, 'registration_birthday', session.context);
        return WhatsAppClient.sendText(ctx.creds, phone, `Prazer, *${text}*! 😊\n\nAgora, qual sua *data de nascimento*? (Ex: 25/12/1990)`);
    }

    /**
     * Fluxo de Registro: Aniversário
     */
    private static async handleRegistrationBirthday(ctx: AgentContext, phone: string, session: any, text: string) {
        // Validar formato DD/MM/AAAA
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = text.match(dateRegex);

        if (!match) {
            return WhatsAppClient.sendText(ctx.creds, phone, "Formato inválido. Por favor, digite no formato *DD/MM/AAAA* (ex: 15/05/1995).");
        }

        const [_, day, month, year] = match;
        const isoDate = `${year}-${month}-${day}`;

        // Salvar tudo no banco
        await this.getOrCreateClient(ctx.tenantId, phone, session.context.name, isoDate);

        await WhatsAppClient.sendText(ctx.creds, phone, "Cadastro concluído com sucesso! ✅");

        // Retomar o que o usuário queria fazer originalmente
        const originalAction = session.context.originalAction;
        await WhatsAppSession.clear(ctx.tenantId, phone);
        return await this.handleIdleState(ctx, phone, '', originalAction);
    }

    /**
     * Fluxo de Agendamento
     */
    private static async handleBookingFlow(ctx: AgentContext, phone: string, session: any, text: string, buttonId?: string) {
        const state = session.state;
        const context = session.context;

        // 4.1 Selecionar Serviço
        if (state === 'booking_select_service') {
            // Se o usuário mandou o ID via lista ou o nome via texto
            const service = await this.searchService(ctx.tenantId, buttonId || text);

            if (service) {
                context.serviceId = service.id;
                context.serviceName = service.name;
                await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_barber', context);

                const barbers = await this.listBarbers(ctx.tenantId, service.id);
                if (!barbers || barbers.length === 0) {
                    // Se não tiver barbeiros específicos para esse serviço, avisa mas permite escolher "Qualquer"
                    // ou simplesmente informa que o agendamento será com "Qualquer barbeiro" disponível.
                    context.barberId = null;
                    context.barberName = 'Qualquer barbeiro';
                    await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_datetime', context);
                    return WhatsAppClient.sendText(ctx.creds, phone, `Beleza! Para o serviço *${service.name}*, não temos um barbeiro específico agora, então marcaremos com o que estiver disponível.\n\nPara que dia e horário você deseja agendar? (Ex: hoje 15:00, amanhã às 10:30)`);
                }

                return WhatsAppClient.sendList(
                    ctx.creds,
                    phone,
                    `Beleza, serviço *${service.name}*. Tem algum barbeiro preferido?`,
                    "Ver Barbeiros",
                    [{
                        title: "Nossa Equipe",
                        rows: [
                            { id: 'ANY_BARBER', title: 'Qualquer um', description: 'O que estiver disponível mais rápido' },
                            ...barbers.map(b => ({ id: b.id, title: b.nickname || b.name }))
                        ]
                    }]
                );
            }

            // Fallback se não selecionou nada válido
            const servicesResult = await this.listServices(ctx.tenantId);
            const services = servicesResult || [];
            return WhatsAppClient.sendList(
                ctx.creds,
                phone,
                "Não consegui identificar o serviço. Por favor, selecione na lista abaixo:",
                "Ver Serviços",
                [{
                    title: "Serviços Disponíveis",
                    rows: services.map((s: any) => ({ id: s.id, title: s.name }))
                }]
            );
        }

        // 4.2 Selecionar Barbeiro
        if (state === 'booking_select_barber') {
            if (buttonId === 'ANY_BARBER' || text.toUpperCase() === 'QUALQUER') {
                context.barberId = null;
                context.barberName = 'Qualquer barbeiro';
            } else {
                const barber = await this.searchBarber(ctx.tenantId, buttonId || text);
                if (!barber) {
                    const barbersResult = await this.listBarbers(ctx.tenantId);
                    const barbers = barbersResult || [];
                    return WhatsAppClient.sendList(
                        ctx.creds,
                        phone,
                        "Não encontrei esse barbeiro. Pode selecionar um na lista ou escolher 'Qualquer um':",
                        "Ver Barbeiros",
                        [{
                            title: "Nossa Equipe",
                            rows: [
                                { id: 'ANY_BARBER', title: 'Qualquer um' },
                                ...barbers.map(b => ({ id: b.id, title: b.name }))
                            ]
                        }]
                    );
                }
                context.barberId = barber.id;
                context.barberName = barber.name;
            }
            await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_datetime', context);
            return WhatsAppClient.sendText(ctx.creds, phone, "Para que dia e horário? (Ex: hoje 15:00, amanhã às 10:30)\n\n_Digite *CANCELAR* para sair_");
        }

        // 4.3 Selecionar Data/Hora
        if (state === 'booking_select_datetime') {
            const startTime = this.parseDateTime(text);
            if (!startTime) {
                return WhatsAppClient.sendText(ctx.creds, phone, "Não consegui entender a data/horário. Pode digitar novamente? (Ex: hoje 15:00, amanhã às 10:30)");
            }

            context.datetime = text;
            context.startTimeISO = startTime.toISOString();
            await WhatsAppSession.update(ctx.tenantId, phone, 'booking_confirm', context);

            return WhatsAppClient.sendButtons(
                ctx.creds,
                phone,
                `Certo! Vou marcar *${context.serviceName}* com *${context.barberName}* para *${text}*. Confirma?`,
                [
                    { id: 'CONFIRM_YES', title: 'SIM, confirmar' },
                    { id: 'CONFIRM_NO', title: 'NÃO, cancelar' }
                ]
            );
        }

        // 4.4 Finalizar
        if (state === 'booking_confirm') {
            if (buttonId === 'CONFIRM_YES' || text.toUpperCase().includes('SIM')) {
                try {
                    // 1. Resolver Cliente
                    const clientResponse = await getSupabaseAdmin()
                        .from('clients')
                        .select('id, name')
                        .eq('tenant_id', ctx.tenantId)
                        .eq('phone', phone)
                        .maybeSingle();

                    const clientId = clientResponse.data?.id || await this.getOrCreateClient(ctx.tenantId, phone);
                    const clientName = clientResponse.data?.name || 'Cliente WhatsApp';

                    // 2. Resolver Data/Hora (preferir o ISO salvo se existir, senão parseia de novo)
                    const startTime = context.startTimeISO ? new Date(context.startTimeISO) : this.parseDateTime(context.datetime);

                    if (!startTime || isNaN(startTime.getTime())) {
                        return WhatsAppClient.sendText(ctx.creds, phone, "Não consegui entender a data/horário. Pode digitar novamente? (Ex: amanhã às 15:00 ou hoje 10:30)");
                    }

                    // 3. Pegar duração do serviço para setar end_time
                    const { data: service } = await getSupabaseAdmin()
                        .from('services')
                        .select('duration_minutes')
                        .eq('id', context.serviceId)
                        .single();

                    const duration = service?.duration_minutes || 30;
                    const endTime = addMinutes(startTime, duration);

                    // 4. Criar Agendamento Real
                    const { error: insertError } = await getSupabaseAdmin()
                        .from('appointments')
                        .insert({
                            tenant_id: ctx.tenantId,
                            client_id: clientId,
                            client_phone: phone,
                            client_name: clientName,
                            barber_id: context.barberId,
                            service_id: context.serviceId,
                            start_time: startTime.toISOString(),
                            end_time: endTime.toISOString(),
                            status: 'scheduled'
                        });

                    if (insertError) throw insertError;

                    await WhatsAppClient.sendText(ctx.creds, phone, `✅ *Agendamento Confirmado!* Te esperamos em ${format(startTime, "eeee, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}. Qualquer dúvida é só chamar!`);
                    return WhatsAppSession.clear(ctx.tenantId, phone);
                } catch (err: any) {
                    console.error('[WHATSAPP_BOOKING_ERROR]', err.message);
                    return WhatsAppClient.sendText(ctx.creds, phone, "Ops, tive um erro ao salvar seu agendamento. Por favor, tente novamente em alguns instantes ou ligue para a barbearia.");
                }
            }
            await WhatsAppClient.sendText(ctx.creds, phone, "Agendamento cancelado. Se precisar de algo, é só mandar AGENDAR novamente.");
            return WhatsAppSession.clear(ctx.tenantId, phone);
        }
    }

    /**
     * Fluxo de Fila
     */
    private static async handleQueueFlow(ctx: AgentContext, phone: string, session: any, text: string, buttonId?: string) {
        if (buttonId === 'QUEUE_YES' || text.toUpperCase().includes('SIM')) {
            try {
                const { data: client } = await getSupabaseAdmin()
                    .from('clients')
                    .select('id, name')
                    .eq('tenant_id', ctx.tenantId)
                    .eq('phone', phone)
                    .maybeSingle();

                const clientId = client?.id || await this.getOrCreateClient(ctx.tenantId, phone);
                const clientName = client?.name || 'Cliente WhatsApp';

                // Pegar última posição para definir a nova
                const { data: lastInQueue } = await getSupabaseAdmin()
                    .from('client_queue')
                    .select('position')
                    .eq('tenant_id', ctx.tenantId)
                    .eq('status', 'waiting')
                    .order('position', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                const nextPosition = (lastInQueue?.position || 0) + 1;

                const { error: insertError } = await getSupabaseAdmin()
                    .from('client_queue')
                    .insert({
                        tenant_id: ctx.tenantId,
                        client_id: clientId,
                        client_name: clientName,
                        client_phone: phone,
                        status: 'waiting',
                        position: nextPosition
                    });

                if (insertError) throw insertError;

                await WhatsAppClient.sendText(ctx.creds, phone, `✅ *Você entrou na fila!* Sua posição é a ${nextPosition}ª. Te avisaremos por aqui quando sua vez estiver chegando!`);
                return WhatsAppSession.clear(ctx.tenantId, phone);
            } catch (err: any) {
                console.error('[WHATSAPP_QUEUE_ERROR]', err.message);
                return WhatsAppClient.sendText(ctx.creds, phone, "Erro ao entrar na fila. Tente novamente mais tarde.");
            }
        }
        await WhatsAppClient.sendText(ctx.creds, phone, "Entendido. Se mudar de ideia, é só mandar FILA.");
        return WhatsAppSession.clear(ctx.tenantId, phone);
    }

    // --- Helpers de busca filtrando por TenantId ---

    private static async searchService(tenantId: string, query: string) {
        const admin = getSupabaseAdmin();

        // 1. Tentar por UUID exato (se vier do buttonId)
        if (query.length > 30 && query.includes('-')) {
            const { data } = await admin.from('services').select('id, name').eq('id', query).single();
            if (data) return data;
        }

        // 2. Tentar por nome
        const { data } = await admin
            .from('services')
            .select('id, name')
            .eq('tenant_id', tenantId)
            .ilike('name', `%${query}%`)
            .limit(1)
            .maybeSingle();
        return data;
    }

    private static async searchBarber(tenantId: string, query: string) {
        const admin = getSupabaseAdmin();

        // 1. Tentar por UUID exato
        if (query.length > 30 && query.includes('-')) {
            const { data } = await admin.from('barbers').select('id, name').eq('id', query).single();
            if (data) return data;
        }

        // 2. Tentar por nome
        const { data } = await admin
            .from('barbers')
            .select('id, name')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .ilike('name', `%${query}%`)
            .limit(1)
            .maybeSingle();
        return data;
    }

    private static async listServices(tenantId: string) {
        const { data } = await getSupabaseAdmin()
            .from('services')
            .select('id, name, price')
            .eq('tenant_id', tenantId)
            .order('name')
            .limit(10);
        return data;
    }

    private static async listBarbers(tenantId: string, serviceId?: string) {
        let query = getSupabaseAdmin()
            .from('barbers')
            .select('id, name, nickname, service_ids')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .order('name');

        const { data } = await query;

        // Filtro manual se vier serviceId (já que service_ids é array json)
        if (serviceId && data) {
            return data.filter(b => b.service_ids?.includes(serviceId));
        }

        return data;
    }

    // --- Core Helpers ---

    private static async getOrCreateClient(tenantId: string, phone: string, name?: string, birthDate?: string) {
        const admin = getSupabaseAdmin();
        const { data: existing } = await admin
            .from('clients')
            .select('id, name, birth_date')
            .eq('tenant_id', tenantId)
            .eq('phone', phone)
            .maybeSingle();

        if (existing) {
            // Se já existe mas estamos atualizando dados (vindo do fluxo de registro)
            if (name || birthDate) {
                await admin
                    .from('clients')
                    .update({
                        name: name || existing.name,
                        birth_date: birthDate || existing.birth_date
                    })
                    .eq('id', existing.id);
            }
            return existing.id;
        }

        const { data: created, error } = await admin
            .from('clients')
            .insert({
                tenant_id: tenantId,
                phone,
                name: name || 'Cliente WhatsApp',
                birth_date: birthDate || null,
                source: 'whatsapp'
            })
            .select()
            .single();

        if (error) throw error;
        return created.id;
    }

    private static parseDateTime(input: string): Date | null {
        // Normalizar entrada removendo acentos e caracteres estranhos como backticks
        const text = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[`]/g, '');
        let targetDate = startOfToday();

        console.log(`[PARSE_DATETIME] Parsing: "${text}"`);

        if (text.includes('amanha')) {
            targetDate = addDays(targetDate, 1);
        } else if (text.includes('depois de amanha')) {
            targetDate = addDays(targetDate, 2);
        } else if (text.includes('hoje')) {
            // Já é hoje por padrão
        }

        // Tentar extrair HH:mm ou apenas HH
        // Formatos aceitos: "15:00", "15:30", "15h30", "15h", "15" (se for entre 7 e 22h)
        const timeMatch = text.match(/(\d{1,2})([:h])?(\d{2})?/);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

            // Heurística para quando mandarem só o número (ex: "hoje 15")
            // Se o separador (match[2]) não estiver presente e o número for menor que 7, provavelmente não é hora comercial ou é confuso
            if (!timeMatch[2] && hours < 7) {
                console.warn(`[PARSE_DATETIME] Hora suspeita ignore: ${hours}`);
                // Podemos tentar outro match ou falhar se não tiver contexto textual de tempo
            }

            targetDate.setHours(hours, minutes, 0, 0);
            console.log(`[PARSE_DATETIME] Result: ${targetDate.toISOString()}`);
            return targetDate;
        }

        return null;
    }
}
