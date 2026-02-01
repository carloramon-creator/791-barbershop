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

            console.log(`[WHATSAPP_AGENT] Processing message for Tenant ${ctx.tenantId} from ${from}. State: ${session.state}`);

            // 1. Detecção de Intenção Inicial (se estiver em IDLE)
            if (session.state === 'idle') {
                console.log(`[WHATSAPP_AGENT] Entrando em handleIdleState para ${from}`);
                return await this.handleIdleState(ctx, from, text, buttonId);
            }

            // 2. Fluxos de Agendamento (BOOKING)
            if (session.state.startsWith('booking_')) {
                return await this.handleBookingFlow(ctx, from, session, text, buttonId);
            }

            // 3. Fluxos de Fila (QUEUE)
            if (session.state.startsWith('queue_')) {
                return await this.handleQueueFlow(ctx, from, session, text);
            }

            // Fallback genérico
            await WhatsAppClient.sendText(ctx.creds, from, "Desculpe, me perdi um pouco. Digite AGENDAR ou FILA para recomeçarmos. 🙂");
            await WhatsAppSession.clear(ctx.tenantId, from);
        } catch (error: any) {
            console.error('[WHATSAPP_AGENT_CRASH]', error.message, error.stack);
        }
    }

    /**
     * Estado Inicial: Detectar o que o cliente quer
     */
    private static async handleIdleState(ctx: AgentContext, phone: string, text: string = '', buttonId?: string) {
        const input = text.toUpperCase();

        // Intenção: AGENDAR
        if (input.includes('AGENDAR') || input.includes('MARCAR') || input.includes('HORÁRIO') || buttonId === 'BIRTHDAY_AGENDAR') {
            await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_service', { coupon: buttonId === 'BIRTHDAY_AGENDAR' ? 'BIRTHDAY' : null });
            return WhatsAppClient.sendText(ctx.creds, phone, "Perfeito! Qual serviço você gostaria de realizar? (Ex: Corte, Barba, Combo...)");
        }

        // Intenção: FILA
        if (input.includes('FILA') || input.includes('ESPERA') || buttonId === 'BIRTHDAY_FILA') {
            await WhatsAppSession.update(ctx.tenantId, phone, 'queue_confirm', { coupon: buttonId === 'BIRTHDAY_FILA' ? 'BIRTHDAY' : null });
            return WhatsAppClient.sendText(ctx.creds, phone, "Você gostaria de entrar na fila agora? Responda SIM ou NÃO.");
        }

        // Não entendeu
        console.log(`[WHATSAPP_AGENT] Não entendi a intenção. Enviando menu inicial para ${phone}`);
        return WhatsAppClient.sendText(ctx.creds, phone, "Olá! Sou o assistente da barbearia. 💈\n\nComo posso te ajudar hoje?\n\nDigite *AGENDAR* para marcar um horário ou *FILA* para entrar na fila de espera.");
    }

    /**
     * Fluxo de Agendamento
     */
    private static async handleBookingFlow(ctx: AgentContext, phone: string, session: any, text: string, buttonId?: string) {
        const state = session.state;
        const context = session.context;

        // 4.1 Selecionar Serviço
        if (state === 'booking_select_service') {
            const input = text.toUpperCase();
            if (input.includes('QUAIS') || input.includes('LISTA') || input.includes('OPÇÕES')) {
                const services = await this.listServices(ctx.tenantId);
                const list = services?.map(s => `• ${s.name}`).join('\n') || 'Nenhum serviço encontrado.';
                return WhatsAppClient.sendText(ctx.creds, phone, `Temos os seguintes serviços:\n\n${list}\n\nQual deles você deseja?`);
            }

            const service = await this.searchService(ctx.tenantId, text);
            if (service) {
                context.serviceId = service.id;
                context.serviceName = service.name;
                await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_barber', context);
                return WhatsAppClient.sendText(ctx.creds, phone, `Beleza, serviço *${service.name}*. Tem algum barbeiro preferido? Se não, responda *QUALQUER* ou peça a *LISTA*.`);
            }

            const services = await this.listServices(ctx.tenantId);
            const list = services?.map(s => `• ${s.name}`).join('\n') || '';
            let msg = "Não encontrei esse serviço. Pode digitar novamente? (Ex: Corte, Barba)";
            if (list) msg += `\n\nOpções disponíveis:\n${list}`;

            return WhatsAppClient.sendText(ctx.creds, phone, msg);
        }

        // 4.2 Selecionar Barbeiro
        if (state === 'booking_select_barber') {
            const input = text.toUpperCase();

            if (input === 'QUALQUER') {
                context.barberId = null;
                context.barberName = 'Qualquer barbeiro';
            } else if (input.includes('QUAIS') || input.includes('LISTA') || input.includes('NOMES')) {
                const barbers = await this.listBarbers(ctx.tenantId);
                const list = barbers?.map(b => `• ${b.name}`).join('\n') || 'Nenhum barbeiro encontrado.';
                return WhatsAppClient.sendText(ctx.creds, phone, `Atualmente temos estes barbeiros:\n\n${list}\n\nQual deles você prefere? (Ou responda *QUALQUER*)`);
            } else {
                const barber = await this.searchBarber(ctx.tenantId, text);
                if (!barber) {
                    const barbers = await this.listBarbers(ctx.tenantId);
                    const list = barbers?.map(b => `• ${b.name}`).join('\n') || '';
                    let msg = "Não encontrei esse barbeiro. Pode digitar o nome dele ou *QUALQUER*?";
                    if (list) msg += `\n\nBarbeiros disponíveis:\n${list}`;
                    return WhatsAppClient.sendText(ctx.creds, phone, msg);
                }
                context.barberId = barber.id;
                context.barberName = barber.name;
            }
            await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_datetime', context);
            return WhatsAppClient.sendText(ctx.creds, phone, "Para que dia e horário? (Ex: hoje 15:00, amanhã às 10:30)");
        }

        // 4.3 Confirmar Agendamento
        if (state === 'booking_select_datetime') {
            context.datetime = text;
            await WhatsAppSession.update(ctx.tenantId, phone, 'booking_confirm', context);
            return WhatsAppClient.sendText(ctx.creds, phone, `Certo! Vou marcar *${context.serviceName}* com *${context.barberName}* para *${text}*. Confirma? (Responda SIM ou NÃO)`);
        }

        // 4.4 Finalizar
        if (state === 'booking_confirm') {
            if (text.toUpperCase().includes('SIM')) {
                try {
                    // 1. Resolver Cliente
                    const clientId = await this.getOrCreateClient(ctx.tenantId, phone);

                    // 2. Resolver Data/Hora
                    const startTime = this.parseDateTime(context.datetime);
                    if (!startTime) {
                        return WhatsAppClient.sendText(ctx.creds, phone, "Não consegui entender a data/horário. Pode digitar novamente? (Ex: amanhã às 15:00)");
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
                            client_name: 'Cliente WhatsApp', // Poderíamos perguntar o nome no futuro
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
    private static async handleQueueFlow(ctx: AgentContext, phone: string, session: any, text: string) {
        if (text.toUpperCase().includes('SIM')) {
            try {
                const clientId = await this.getOrCreateClient(ctx.tenantId, phone);

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
                        client_name: 'Cliente WhatsApp',
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
        const { data } = await getSupabaseAdmin()
            .from('services')
            .select('id, name')
            .eq('tenant_id', tenantId)
            .ilike('name', `%${query}%`)
            .limit(1)
            .maybeSingle();
        return data;
    }

    private static async searchBarber(tenantId: string, query: string) {
        const { data } = await getSupabaseAdmin()
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
            .select('name')
            .eq('tenant_id', tenantId)
            .limit(10);
        return data;
    }

    private static async listBarbers(tenantId: string) {
        const { data } = await getSupabaseAdmin()
            .from('barbers')
            .select('name')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .limit(10);
        return data;
    }

    // --- Core Helpers ---

    private static async getOrCreateClient(tenantId: string, phone: string) {
        const admin = getSupabaseAdmin();
        const { data: existing } = await admin
            .from('clients')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('phone', phone)
            .maybeSingle();

        if (existing) return existing.id;

        const { data: created } = await admin
            .from('clients')
            .insert({
                tenant_id: tenantId,
                phone: phone,
                name: 'Cliente WhatsApp',
                source: 'whatsapp'
            })
            .select('id')
            .single();

        return created?.id;
    }

    private static parseDateTime(input: string): Date | null {
        const text = input.toLowerCase();
        let targetDate = startOfToday();

        if (text.includes('amanhã')) {
            targetDate = addDays(targetDate, 1);
        } else if (text.includes('depois de amanhã')) {
            targetDate = addDays(targetDate, 2);
        }

        // Tentar extrair HH:mm
        const timeMatch = text.match(/(\d{1,2})[:h](\d{2})?/);
        if (timeMatch) {
            const hours = parseInt(timeMatch[1], 10);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
            targetDate.setHours(hours, minutes, 0, 0);
            return targetDate;
        }

        return null;
    }
}
