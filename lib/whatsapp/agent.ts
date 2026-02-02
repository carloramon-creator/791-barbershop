import { WhatsAppClient, WhatsAppCredentials } from './client';
import { WhatsAppSession } from './session';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { addMinutes, parse, format, isAfter, startOfToday, addDays, isSunday, setHours, setMinutes, isBefore, isEqual, parseISO, addHours, subHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAvailableSlots } from '../availability-utils';

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

            // 2. Detecção de Intenção Inicial
            if (session.state === 'idle' || input === 'AGENDAR' || input === 'FILA' || input === 'STATUS' || buttonId === 'VIEW_STATUS') {
                return await this.handleIdleState(ctx, from, text, buttonId);
            }

            // 2.1 Navegação Global / "Voltar"
            if (input === 'VOLTAR' || input === 'ALTERAR' || input === 'MUDAR') {
                if (session.state.startsWith('booking_')) {
                    return WhatsAppClient.sendButtons(
                        ctx.creds,
                        from,
                        "Entendido, você quer alterar algo. O que seria?",
                        [
                            { id: 'CHANGE_SERVICE', title: 'Serviço' },
                            { id: 'CHANGE_BARBER', title: 'Profissional' },
                            { id: 'CHANGE_DATE', title: 'Data/Horário' }
                        ]
                    );
                }
                // Se for Fila, apenas cancela e volta pro menu
                await WhatsAppSession.clear(ctx.tenantId, from);
                return WhatsAppClient.sendText(ctx.creds, from, "Tudo bem, voltamos ao início. Como posso ajudar?");
            }

            // 2.2 Tratamento de ações de alteração globais (vinda dos botões acima)
            if (buttonId === 'CHANGE_SERVICE') {
                await WhatsAppSession.update(ctx.tenantId, from, 'booking_select_service', session.context);
                const services = await this.listServices(ctx.tenantId);
                const rows = (services || []).map((s: any) => ({ id: s.id, title: s.name }));
                return WhatsAppClient.sendList(ctx.creds, from, "Selecione o serviço:", "Ver Serviços", [{ title: "Serviços", rows }]);
            }
            if (buttonId === 'CHANGE_BARBER') {
                await WhatsAppSession.update(ctx.tenantId, from, 'booking_select_barber', session.context);
                const barbers = await this.listBarbers(ctx.tenantId, session.context.serviceId);
                const rows = [{ id: 'ANY_BARBER_BOOKING', title: 'Qualquer um' }, ...(barbers || []).map(b => ({ id: b.id, title: b.nickname || b.name }))];
                return WhatsAppClient.sendList(ctx.creds, from, "Selecione o profissional:", "Ver Profissionais", [{ title: "Profissionais", rows }]);
            }
            if (buttonId === 'CHANGE_DATE') {
                return this.presentDateSelection(ctx, from, session.context);
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
        // Verificar com e sem o DDI 55
        const phoneWithout55 = phone.startsWith('55') ? phone.slice(2) : phone;
        const phoneWith55 = phone.startsWith('55') ? phone : `55${phone}`;

        const { data: client } = await getSupabaseAdmin()
            .from('clients')
            .select('id, name, birth_date')
            .eq('tenant_id', ctx.tenantId)
            .or(`phone.eq.${phone},phone.eq.${phoneWithout55},phone.eq.${phoneWith55}`)
            .limit(1)
            .maybeSingle();

        // Se não tem nome (novo) ou o nome é o padrão "Cliente WhatsApp", ou não tem data de nascimento
        if (!client || !client.name || client.name === 'Cliente WhatsApp') {
            await WhatsAppSession.update(ctx.tenantId, phone, 'registration_name', {
                originalAction: buttonId || (input.includes('AGENDAR') ? 'BOOKING_START' : input.includes('FILA') ? 'QUEUE_START' : null)
            });
            return WhatsAppClient.sendText(ctx.creds, phone, "Olá! Notei que é sua primeira vez por aqui. 💈\n\nPara começarmos, *qual é o seu nome completo?*");
        }

        if (!client.birth_date) {
            await WhatsAppSession.update(ctx.tenantId, phone, 'registration_birthday', {
                name: client.name,
                originalAction: buttonId || (input.includes('AGENDAR') ? 'BOOKING_START' : input.includes('FILA') ? 'QUEUE_START' : null)
            });
            return WhatsAppClient.sendText(ctx.creds, phone, `Olá ${client.name}! 👋\n\nEstamos atualizando nosso cadastro e precisamos da sua *data de nascimento*. (Ex: 25/12/1990)`);
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
            // [MODIFIED] Direto para seleção de barbeiro, sem redundância
            await WhatsAppSession.update(ctx.tenantId, phone, 'queue_select_barber', { coupon: buttonId === 'BIRTHDAY_FILA' ? 'BIRTHDAY' : null });

            // Reutilizar lógica de listar para fila
            return this.handleQueueFlow(ctx, phone, { state: 'queue_select_barber', context: { coupon: buttonId === 'BIRTHDAY_FILA' ? 'BIRTHDAY' : null } }, text, buttonId);
        }

        // Menu Inicial Dinâmico
        const buttons = [];
        if (apptEnabled) buttons.push({ id: 'BOOKING_START', title: 'Agendar Horário' });
        if (queueEnabled) buttons.push({ id: 'QUEUE_START', title: 'Entrar na Fila' });
        buttons.push({ id: 'VIEW_STATUS', title: 'Ver Meus Status' });

        if (input.includes('STATUS') || buttonId === 'VIEW_STATUS') {
            return this.handleStatusCheck(ctx, phone);
        }

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
        try {
            // Validar formato DD/MM/AAAA
            const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
            const match = text.match(dateRegex);

            if (!match) {
                return WhatsAppClient.sendText(ctx.creds, phone, "Formato inválido. Por favor, digite no formato *DD/MM/AAAA* (ex: 15/05/1995).");
            }

            const [_, day, month, year] = match;
            const isoDate = `${year}-${month}-${day}`;

            console.log(`[REGISTRATION] Updating client ${phone} with name ${session.context.name} and birth ${isoDate}`);

            // Salvar tudo no banco
            await this.getOrCreateClient(ctx.tenantId, phone, session.context.name, isoDate);

            await WhatsAppClient.sendText(ctx.creds, phone, "Cadastro concluído com sucesso! ✅");

            // Retomar o que o usuário queria fazer originalmente
            const originalAction = session.context.originalAction;
            await WhatsAppSession.clear(ctx.tenantId, phone);
            return await this.handleIdleState(ctx, phone, '', originalAction);
        } catch (error: any) {
            console.error('[REGISTRATION_ERROR]', error.message);
            // DEBUG: Expor erro para o usuário corrigir o problema
            return WhatsAppClient.sendText(ctx.creds, phone, `Ops, tive um erro ao salvar seu cadastro: ${error.message || JSON.stringify(error)}. Tente novamente.`);
        }
    }

    /**
     * Fluxo de Agendamento
     */
    private static async handleBookingFlow(ctx: AgentContext, phone: string, session: any, text: string, buttonId?: string) {
        const state = session.state;
        const context = session.context;

        // 4.1 Selecionar Serviço
        if (state === 'booking_select_service') {
            const service = await this.searchService(ctx.tenantId, buttonId || text);

            if (service) {
                console.log(`[BOOKING] [${phone}] Service found: ${service.name} (${service.id})`);
                context.serviceId = service.id;
                context.serviceName = service.name;
                context.servicePrice = service.price; // Save price for summary if needed

                console.log(`[BOOKING] [${phone}] Updating state to booking_select_barber`);
                await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_barber', context);

                console.log(`[BOOKING] [${phone}] Listing barbers for service ${service.id}`);
                let barbers = await this.listBarbers(ctx.tenantId, service.id);

                if (!barbers || barbers.length === 0) {
                    console.log(`[BOOKING] [${phone}] No barbers found for service, listing all active`);
                    const allBarbers = await this.listBarbers(ctx.tenantId);
                    if (allBarbers && allBarbers.length > 0) barbers = allBarbers;
                }

                const displayedBarbers = (barbers || []).slice(0, 9);
                console.log(`[BOOKING] [${phone}] Sending list with ${displayedBarbers.length} barbers`);

                const result = await WhatsAppClient.sendList(
                    ctx.creds,
                    phone,
                    `Certo, serviço *${service.name.slice(0, 100)}*. Tem algum profissional de preferência?`,
                    "Ver Profissionais",
                    [{
                        title: "Profissionais",
                        rows: [
                            { id: 'ANY_BARBER_BOOKING', title: 'Qualquer um', description: 'Atendimento mais rápido' },
                            ...displayedBarbers.map(b => ({
                                id: b.id,
                                title: (b.nickname || b.name || 'Profissional').slice(0, 24),
                                description: 'Escolher este'
                            }))
                        ]
                    }]
                );

                if (result && !result.success) {
                    console.error(`[BOOKING] [${phone}] Failed to send barbers list:`, result.error);
                    return WhatsAppClient.sendText(ctx.creds, phone, "Ops! Tive um problema técnico ao listar os profissionais. Por favor, tente selecionar o serviço novamente.");
                }
                return result;
            }

            // Fallback erro serviço
            const servicesResult = await this.listServices(ctx.tenantId);
            const services = servicesResult || [];
            return WhatsAppClient.sendList(
                ctx.creds,
                phone,
                "Não entendi o serviço. Selecione abaixo:",
                "Ver Serviços",
                [{
                    title: "Serviços Disponíveis",
                    rows: services.map((s: any) => ({ id: s.id, title: s.name }))
                }]
            );
        }

        // 4.2 Selecionar Profissional
        if (state === 'booking_select_barber') {
            if (buttonId === 'ANY_BARBER_BOOKING' || (text && text.toUpperCase().includes('QUALQUER'))) {
                context.barberId = null;
                context.barberName = 'Qualquer profissional';
            } else {
                const barber = await this.searchBarber(ctx.tenantId, buttonId || text);
                if (!barber) {
                    return WhatsAppClient.sendText(ctx.creds, phone, "Profissional não encontrado. Por favor, selecione na lista.");
                }
                context.barberId = barber.id;
                context.barberName = barber.name;
            }

            // Avançar para Seleção de Dia
            return this.presentDateSelection(ctx, phone, context);
        }

        // 4.3 Selecionar Data
        if (state === 'booking_select_date') {
            const selectedDate = buttonId || text; // format YYYY-MM-DD expected from ID, or text?
            // LIST id should be date ISO string YYYY-MM-DD

            // Validação simples
            if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
                return WhatsAppClient.sendText(ctx.creds, phone, "Opção inválida. Por favor selecione uma data da lista.");
            }

            context.selectedDate = selectedDate;

            // Avançar para Seleção de Horário
            return this.presentTimeSelection(ctx, phone, context);
        }

        // 4.4 Selecionar Horário
        if (state === 'booking_select_time') {
            const selectedTime = buttonId || text; // Format HH:mm

            if (!/^\d{2}:\d{2}$/.test(selectedTime)) {
                return WhatsAppClient.sendText(ctx.creds, phone, "Horário inválido. Selecione um da lista.");
            }

            context.selectedTime = selectedTime;

            // Montar ISO final
            const dateTimeISO = `${context.selectedDate}T${selectedTime}:00`;
            context.startTimeISO = dateTimeISO;

            await WhatsAppSession.update(ctx.tenantId, phone, 'booking_confirm', context);

            const displayDate = format(parseISO(dateTimeISO), "eeee, dd 'de' MMMM 'às' HH:mm", { locale: ptBR });

            return WhatsAppClient.sendButtons(
                ctx.creds,
                phone,
                `📝 *Confirmação de Agendamento*\n\n✂️ *Serviço:* ${context.serviceName}\n💈 *Profissional:* ${context.barberName}\n📅 *Data:* ${displayDate}\n\nConfirma o agendamento?`,
                [
                    { id: 'CONFIRM_YES', title: '✅ Confirmar' },
                    { id: 'CONFIRM_CHANGE', title: '✏️ Alterar algo' }, // Changed NO logic to Change logic
                    { id: 'CONFIRM_CANCEL', title: '❌ Cancelar' }
                ]
            );
        }

        // 4.5 Finalizar
        if (state === 'booking_confirm') {
            if (buttonId === 'CONFIRM_YES') {
                return this.finalizeBooking(ctx, phone, context);
            }

            if (buttonId === 'CONFIRM_CHANGE') {
                // Navegação / "Voltar"
                return WhatsAppClient.sendButtons(
                    ctx.creds,
                    phone,
                    "O que você gostaria de alterar?",
                    [
                        { id: 'CHANGE_SERVICE', title: 'Serviço' },
                        { id: 'CHANGE_BARBER', title: 'Profissional' },
                        { id: 'CHANGE_DATE', title: 'Data/Horário' }
                        // { id: 'CHANGE_TIME', title: 'Horário' }, // Already covered by CHANGE_DATE
                    ]
                );
            }

            if (buttonId === 'CONFIRM_CANCEL') {
                await WhatsAppClient.sendText(ctx.creds, phone, "Agendamento cancelado. Se mudar de ideia, é só chamar!");
                return WhatsAppSession.clear(ctx.tenantId, phone);
            }

            // Handling Change Options
            if (buttonId === 'CHANGE_SERVICE') {
                await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_service', { ...context });
                const services = await this.listServices(ctx.tenantId);
                return WhatsAppClient.sendList(ctx.creds, phone, "Selecione o serviço:", "Ver Serviços", [{ title: "Serviços", rows: (services || []).map((s: any) => ({ id: s.id, title: s.name })) }]);
            }
            if (buttonId === 'CHANGE_BARBER') {
                await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_barber', { ...context });
                const barbers = await this.listBarbers(ctx.tenantId, context.serviceId);
                const displayedBarbers = (barbers || []).slice(0, 9);
                return WhatsAppClient.sendList(
                    ctx.creds,
                    phone,
                    "Selecione o profissional:",
                    "Ver Profissionais",
                    [{
                        title: "Profissionais",
                        rows: [
                            { id: 'ANY_BARBER_BOOKING', title: 'Qualquer um', description: 'Atendimento mais rápido' },
                            ...displayedBarbers.map(b => ({
                                id: b.id,
                                title: (b.nickname || b.name || 'Profissional').slice(0, 24),
                                description: 'Escolher este'
                            }))
                        ]
                    }]
                );
            }
            if (buttonId === 'CHANGE_DATE') {
                return this.presentDateSelection(ctx, phone, context);
            }
        }
    }

    // --- Booking Helpers ---

    private static async presentDateSelection(ctx: AgentContext, phone: string, context: any) {
        await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_date', context);

        // Gerar próximos 7 dias úteis (Respeitando fuso BR para "Hoje")
        const dates = [];
        const nowBr = subHours(new Date(), 3);
        let current = new Date(nowBr.getFullYear(), nowBr.getMonth(), nowBr.getDate(), 0, 0, 0, 0);

        // Loop até ter 7 dias, pulando Domingos (assumindo fechado)
        let count = 0;
        while (count < 7) {
            if (!isSunday(current)) {
                dates.push(current);
                count++;
            }
            current = addDays(current, 1);
        }

        const rows = dates.map(d => {
            const dateStr = format(d, 'yyyy-MM-dd');
            const display = format(d, "eeee (dd/MM)", { locale: ptBR });
            // Capitalize first letter
            const Display = display.charAt(0).toUpperCase() + display.slice(1);
            return {
                id: dateStr,
                title: Display,
                description: 'Ver horários disponíveis'
            };
        });

        return WhatsAppClient.sendList(
            ctx.creds,
            phone,
            `Para agendar com *${context.barberName}*, escolha o melhor dia:`,
            "Ver Datas",
            [{
                title: "Próximos Dias Dias",
                rows: rows
            }]
        );
    }

    private static async presentTimeSelection(ctx: AgentContext, phone: string, context: any) {
        await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_time', context);

        const selectedDate = parseISO(context.selectedDate + 'T00:00:00');

        // 1. Buscar Agendamentos Ocupados
        const admin = getSupabaseAdmin();
        const { data: appointments } = await admin
            .from('appointments')
            .select('start_time, end_time')
            .eq('tenant_id', ctx.tenantId)
            .neq('status', 'cancelled')
            .gte('start_time', `${context.selectedDate}T00:00:00`)
            .lte('start_time', `${context.selectedDate}T23:59:59`)
            .eq(context.barberId ? 'barber_id' : '', context.barberId || '');

        // 2. Buscar Configurações do Tenant e Staff
        const [{ data: tenant }, { data: barber }] = await Promise.all([
            getSupabaseAdmin().from('tenants').select('opening_hours').eq('id', ctx.tenantId).single(),
            context.barberId
                ? getSupabaseAdmin().from('barbers').select('status').eq('id', context.barberId).single()
                : Promise.resolve({ data: null })
        ]);

        const { data: service } = await getSupabaseAdmin()
            .from('services')
            .select('duration_minutes')
            .eq('id', context.serviceId)
            .single();
        const duration = service?.duration_minutes || 30;

        // 3. Obter slots usando o utilitário compartilhado
        const isToday = context.selectedDate === format(new Date(), 'yyyy-MM-dd');
        const availableSlots = getAvailableSlots(
            selectedDate,
            appointments || [],
            tenant?.opening_hours,
            duration,
            barber?.status,
            isToday
        ).filter(s => s.available);

        if (availableSlots.length === 0) {
            return WhatsAppClient.sendButtons(
                ctx.creds,
                phone,
                "Poxa, não temos horários livres para essa data. 😕",
                [{ id: 'CHANGE_DATE', title: 'Escolher outra data' }]
            );
        }

        // Limitar a exibir 10 horários para não quebrar a lista do WhatsApp
        const displayedSlots = availableSlots.slice(0, 10);

        return WhatsAppClient.sendList(
            ctx.creds,
            phone,
            `Horários disponíveis para *${format(selectedDate, 'dd/MM')}*:`,
            "Ver Horários",
            [{
                title: "Horários Disponíveis",
                rows: displayedSlots.map(slot => ({
                    id: slot.time,
                    title: slot.time,
                    description: 'Disponível'
                }))
            }]
        );
    }

    private static async finalizeBooking(ctx: AgentContext, phone: string, context: any) {
        try {
            // Recuperar dados básicos
            const { serviceId, barberId, startTimeISO, serviceName, barberName } = context;

            // ... (Lógica de Insert igual ao anterior, mas usando os dados do context atualizado)
            // Precisamos do ClientId
            const phoneWithout55 = phone.startsWith('55') ? phone.slice(2) : phone;
            const phoneWith55 = phone.startsWith('55') ? phone : `55${phone}`;
            const { data: client } = await getSupabaseAdmin()
                .from('clients')
                .select('id, name')
                .eq('tenant_id', ctx.tenantId)
                .or(`phone.eq.${phone},phone.eq.${phoneWithout55},phone.eq.${phoneWith55}`)
                .maybeSingle();

            const clientId = client?.id || await this.getOrCreateClient(ctx.tenantId, phone);
            const clientName = client?.name || 'Cliente WhatsApp';

            // Se barberId for null (ANY), precisamos atribuir um.
            // Estratégia: Random ou Round Robin. Aqui: Pegar o primeiro livre.
            let finalBarberId = barberId;
            if (!finalBarberId) {
                const { data: freeBarber } = await getSupabaseAdmin()
                    .from('barbers')
                    .select('id')
                    .eq('tenant_id', ctx.tenantId)
                    .eq('is_active', true)
                    .limit(1)
                    .maybeSingle(); // TODO: check real availability
                finalBarberId = freeBarber?.id;
            }

            if (!finalBarberId) throw new Error("Sem profissionais disponíveis para finalizar.");

            // Calcular Fim
            // Forçamos o fuso -03:00 para garantir que o horário do cliente seja salvo corretamente como UTC no banco
            const start = new Date(startTimeISO + '-03:00');
            const { data: service } = await getSupabaseAdmin()
                .from('services')
                .select('name, duration_minutes')
                .eq('id', serviceId)
                .single();

            const currentServiceName = service?.name || serviceName || 'Serviço';
            const duration = service?.duration_minutes || 30;
            const end = addMinutes(start, duration);

            const { error } = await getSupabaseAdmin().from('appointments').insert({
                tenant_id: ctx.tenantId,
                client_id: clientId,
                client_phone: phone,
                client_name: clientName,
                barber_id: finalBarberId,
                service_id: serviceId,
                service_ids: [serviceId],
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                status: 'scheduled',
                notes: `Serviço: ${currentServiceName}`
            });

            if (error) throw error;

            await WhatsAppClient.sendText(ctx.creds, phone, `✅ *Agendamento Realizado!* \n\nServiço: ${currentServiceName}\nProfissional: ${barberName}\nData: ${format(parseISO(startTimeISO), "dd/MM 'às' HH:mm", { locale: ptBR })}\n\nTe aguardamos!`);
            return WhatsAppSession.clear(ctx.tenantId, phone);

        } catch (err: any) {
            console.error('[BOOKING_FINALIZE_ERROR]', err);
            return WhatsAppClient.sendText(ctx.creds, phone, "Erro ao finalizar agendamento. Tente novamente.");
        }
    }

    /**
     * Fluxo de Fila
     */
    /**
     * Fluxo de Fila
     */
    private static async handleQueueFlow(ctx: AgentContext, phone: string, session: any, text: string, buttonId?: string) {
        const state = session.state;
        const context = session.context;

        // 5.1 Selecionar Barbeiro para Fila ou Qualquer Um
        if (state === 'queue_select_barber') {
            // Se já foi selecionado via botão ou texto
            if (buttonId || (text && text.toUpperCase() !== 'FILA')) {
                const selectedId = buttonId || text;

                // Lógica de entrada na fila
                try {
                    const phoneWithout55 = phone.startsWith('55') ? phone.slice(2) : phone;
                    const phoneWith55 = phone.startsWith('55') ? phone : `55${phone}`;

                    const { data: client } = await getSupabaseAdmin()
                        .from('clients')
                        .select('id, name')
                        .eq('tenant_id', ctx.tenantId)
                        .or(`phone.eq.${phone},phone.eq.${phoneWithout55},phone.eq.${phoneWith55}`)
                        .limit(1)
                        .maybeSingle();

                    const clientId = client?.id || await this.getOrCreateClient(ctx.tenantId, phone);
                    const clientName = client?.name || 'Cliente WhatsApp';

                    // Definir Barbeiro Alvo
                    let targetBarberId = null;

                    if (selectedId === 'ANY_BARBER_QUEUE') {
                        // Achar barbeiro com MENOR fila
                        const barbersStats = await this.getBarbersWithQueueStats(ctx.tenantId);
                        if (barbersStats.length > 0) {
                            // Ordenar por queueSize
                            barbersStats.sort((a, b) => a.queueSize - b.queueSize);
                            targetBarberId = barbersStats[0].id;
                        }
                    } else {
                        // Tentar achar barber específico
                        const barber = await this.searchBarber(ctx.tenantId, selectedId);
                        if (barber) targetBarberId = barber.id;
                    }

                    if (!targetBarberId) {
                        // Mostrar lista de novo se falhar
                        // Mas antes verificar se é o primeiro acesso ao state (text == 'FILA' ou vindo do menu)
                        // Se for o primeiro acesso, cai no bloco abaixo de listar.
                        // Se tentou selecionar e falhou:
                        if (selectedId && selectedId !== 'QUEUE_START') {
                            return WhatsAppClient.sendText(ctx.creds, phone, "Não consegui identificar o profissional selecionado. Por favor, tente novamente.");
                        }
                    } else {
                        // INSERIR NA FILA
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
                                barber_id: targetBarberId,
                                client_id: clientId,
                                client_name: clientName,
                                client_phone: phone,
                                status: 'waiting',
                                position: nextPosition
                            });

                        if (insertError) throw insertError;

                        await WhatsAppClient.sendText(ctx.creds, phone, `✅ *Você entrou na fila com sucesso!* \nSua posição é a ${nextPosition}ª. Te avisaremos por aqui quando sua vez estiver chegando!`);
                        return WhatsAppSession.clear(ctx.tenantId, phone);
                    }

                } catch (err: any) {
                    console.error('[WHATSAPP_QUEUE_ERROR]', err.message);
                    return WhatsAppClient.sendText(ctx.creds, phone, `Erro ao entrar na fila: ${err.message || JSON.stringify(err)}. Tente novamente.`);
                }
            }

            // Exibir Lista de Barbeiros com Tempo de Espera
            const barbersStats = await this.getBarbersWithQueueStats(ctx.tenantId);

            if (!barbersStats || barbersStats.length === 0) {
                return WhatsAppClient.sendText(ctx.creds, phone, "Desculpe, não há profissionais disponíveis online no momento para entrar na fila.");
            }

            const displayedStats = (barbersStats || []).slice(0, 9);

            return WhatsAppClient.sendList(
                ctx.creds,
                phone,
                "Para entrar na fila, escolha um profissional ou a opção mais rápida:",
                "Ver Fila",
                [{
                    title: "Opções de Fila",
                    rows: [
                        { id: 'ANY_BARBER_QUEUE', title: 'Qualquer um', description: 'Menor tempo de espera' },
                        ...displayedStats.map(b => ({
                            id: b.id,
                            title: b.nickname || b.name,
                            description: `Fila: ${b.queueSize} pessoa(s) (~${b.estimatedWait} min)`
                        }))
                    ]
                }]
            );
        }
    }

    private static async getBarbersWithQueueStats(tenantId: string) {
        const admin = getSupabaseAdmin();

        // 1. Buscar Barbeiros Ativos e Disponíveis
        // Nota: Assumindo que 'available', 'busy' contam como ativos para fila. 'offline' não.
        const { data: barbers } = await admin
            .from('barbers')
            .select('id, name, nickname')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .neq('status', 'offline');

        if (!barbers || barbers.length === 0) return [];

        const stats = [];

        for (const barber of barbers) {
            // Contar quantos na fila waiting para este barbeiro
            const { count } = await admin
                .from('client_queue')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('barber_id', barber.id)
                .eq('status', 'waiting');

            const queueSize = count || 0;
            // Estimar 30 min por pessoa
            const estimatedWait = queueSize * 30;

            stats.push({
                ...barber,
                queueSize,
                estimatedWait
            });
        }

        return stats;
    }

    // --- Helpers de busca filtrando por TenantId ---

    private static async searchService(tenantId: string, query: string) {
        const admin = getSupabaseAdmin();

        // 1. Tentar por UUID exato (se vier do buttonId)
        if (query.length > 30 && query.includes('-')) {
            const { data } = await admin.from('services').select('id, name, price').eq('id', query).eq('tenant_id', tenantId).maybeSingle();
            if (data) return data;
        }

        // 2. Tentar por nome
        const { data } = await admin
            .from('services')
            .select('id, name, price')
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
        // 1. Buscar todos os barbeiros ativos do tenant
        // Incluímos o relacionamento com barber_services para saber quais serviços cada um faz
        let query = getSupabaseAdmin()
            .from('barbers')
            .select('id, name, nickname, barber_services(service_id)')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .order('name');

        console.log(`[LIST_BARBERS] Querying for tenant ${tenantId}. ServiceId filter: ${serviceId || 'NONE'}`);

        const { data, error } = await query;

        if (error) {
            console.error('[LIST_BARBERS_ERROR]', error);
            return [];
        }

        // 2. Mapear e formatar os dados
        const formattedBarbers = data?.map((b: any) => ({
            id: b.id,
            name: b.name,
            nickname: b.nickname,
            // Extrair service_ids do relacionamento barber_services
            service_ids: b.barber_services?.map((bs: any) => bs.service_id) || []
        })) || [];

        console.log(`[LIST_BARBERS] Found ${formattedBarbers.length} active barbers.`);

        // 3. Filtrar por serviço se fornecido
        if (serviceId) {
            const filtered = formattedBarbers.filter(b => b.service_ids.includes(serviceId));
            console.log(`[LIST_BARBERS] Filtered by service ${serviceId}: ${filtered.length} found.`);

            // Se houver barbeiros para o serviço, retorna eles
            if (filtered.length > 0) return filtered;

            // Caso contrário, loga e deixa o fallback do handleBookingFlow agir (ou já retorna tudo aqui)
            console.log(`[LIST_BARBERS] No specific barber found for service ${serviceId}. Returning ALL active.`);
        }

        return formattedBarbers;
    }

    // --- Core Helpers ---

    private static async getOrCreateClient(tenantId: string, phone: string, name?: string, birthDate?: string) {
        const admin = getSupabaseAdmin();

        // Verificar variações do telefone (com e sem 55)
        const phoneWithout55 = phone.startsWith('55') ? phone.slice(2) : phone;
        const phoneWith55 = phone.startsWith('55') ? phone : `55${phone}`;

        const { data: existing } = await admin
            .from('clients')
            .select('id, name, birth_date')
            .eq('tenant_id', tenantId)
            .or(`phone.eq.${phone},phone.eq.${phoneWithout55},phone.eq.${phoneWith55}`)
            .limit(1)
            .maybeSingle();

        if (existing) {
            // Se já existe mas estamos atualizando dados (vindo do fluxo de registro)
            if (name || birthDate) {
                const { error: updateError } = await admin
                    .from('clients')
                    .update({
                        name: name || existing.name,
                        birth_date: birthDate || existing.birth_date
                    })
                    .eq('id', existing.id);

                if (updateError) throw updateError;
            }
            return existing.id;
        }

        const { data: created, error } = await admin
            .from('clients')
            .insert({
                tenant_id: tenantId,
                phone,
                name: name || 'Cliente WhatsApp',
                birth_date: birthDate || null
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

    private static async handleStatusCheck(ctx: AgentContext, phone: string) {
        const admin = getSupabaseAdmin();
        const phoneWithout55 = phone.startsWith('55') ? phone.slice(2) : phone;
        const phoneWith55 = phone.startsWith('55') ? phone : `55${phone}`;

        // 1. Buscar Agendamentos Futuros
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: appointments } = await admin
            .from('appointments')
            .select('start_time, status, barbers(name, nickname)')
            .eq('tenant_id', ctx.tenantId)
            .or(`client_phone.eq.${phone},client_phone.eq.${phoneWithout55},client_phone.eq.${phoneWith55}`)
            .gte('start_time', todayStart.toISOString())
            .not('status', 'in', '("cancelled","completed","finished")')
            .order('start_time', { ascending: true });

        // 2. Buscar Posição na Fila
        const { data: queueItems } = await admin
            .from('client_queue')
            .select('id, barber_id, status, created_at, barbers(name, nickname)')
            .eq('tenant_id', ctx.tenantId)
            .or(`client_phone.eq.${phone},client_phone.eq.${phoneWithout55},client_phone.eq.${phoneWith55}`)
            .eq('status', 'waiting');

        let message = `📝 *Seus Status:*\n\n`;

        if (appointments && appointments.length > 0) {
            message += `🗓️ *Agendamentos:*\n`;
            appointments.forEach(a => {
                // Conversão robusta para exibição (sempre -3h relativo ao UTC salvo)
                const d = new Date(a.start_time);
                const date = format(subHours(d, d.getTimezoneOffset() === 0 ? 3 : 0), "dd/MM 'às' HH:mm", { locale: ptBR });
                // NOTA: Se o servidor já está em -3h, o getTimezoneOffset será 180. Se for 0 (UTC), subtraímos 3.
                // Mas para ser 100% à prova de balas independente do servidor:
                const brTime = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
                const dateFixed = format(brTime, "dd/MM 'às' HH:mm", { locale: ptBR });

                const barber = (a.barbers as any)?.nickname || (a.barbers as any)?.name || 'Profissional';
                message += `• 🗓️ ${dateFixed} com ${barber}\n`;
            });
            message += `\n`;
        }

        if (queueItems && queueItems.length > 0) {
            message += `⏳ *Na Fila:*\n`;
            for (const item of queueItems) {
                const barber = (item.barbers as any)?.nickname || (item.barbers as any)?.name || 'Profissional';

                // Calcular posição
                const { count } = await admin
                    .from('client_queue')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', ctx.tenantId)
                    .eq('barber_id', item.barber_id)
                    .eq('status', 'waiting')
                    .lt('created_at', (item as any).created_at || new Date().toISOString());

                const position = (count || 0) + 1;
                message += `• Com ${barber}: *${position}º lugar*\n`;
            }
        }

        if ((!appointments || appointments.length === 0) && (!queueItems || queueItems.length === 0)) {
            message = "Você não possui agendamentos futuros ou posições na fila no momento. 💈";
        }

        return WhatsAppClient.sendText(ctx.creds, phone, message);
    }
}
