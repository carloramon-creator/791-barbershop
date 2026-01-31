import { WhatsAppClient } from './client';
import { WhatsAppSession } from './session';
import { getSupabaseAdmin } from '@/lib/supabase-server';

/**
 * WhatsAppAgent
 * Responsável por processar a lógica de conversação, intenções e fluxos.
 */
export class WhatsAppAgent {
    /**
     * Ponto de entrada para mensagens vindas do Webhook
     */
    static async handleMessage(payload: { from: string, text: string, buttonId?: string, messageType: string }) {
        const { from, text, buttonId, messageType } = payload;
        const session = await WhatsAppSession.get(from);

        console.log(`[WHATSAPP_AGENT] Processing message from ${from}. State: ${session.state}`);

        // 1. Detecção de Intenção Inicial (se estiver em IDLE)
        if (session.state === 'idle') {
            return this.handleIdleState(from, text, buttonId);
        }

        // 2. Fluxos de Agendamento (BOOKING)
        if (session.state.startsWith('booking_')) {
            return this.handleBookingFlow(from, session, text, buttonId);
        }

        // 3. Fluxos de Fila (QUEUE)
        if (session.state.startsWith('queue_')) {
            return this.handleQueueFlow(from, session, text, buttonId);
        }

        // Fallback genérico
        await WhatsAppClient.sendText(from, "Desculpe, me perdi um pouco. Digite AGENDAR ou FILA para recomeçarmos. 🙂");
        await WhatsAppSession.clear(from);
    }

    /**
     * Estado Inicial: Detectar o que o cliente quer
     */
    private static async handleIdleState(phone: string, text: string = '', buttonId?: string) {
        const input = text.toUpperCase();

        // Intenção: AGENDAR
        if (input.includes('AGENDAR') || input.includes('MARCAR') || input.includes('HORÁRIO') || buttonId === 'BIRTHDAY_AGENDAR') {
            await WhatsAppSession.update(phone, 'booking_select_service', { coupon: buttonId === 'BIRTHDAY_AGENDAR' ? 'BIRTHDAY' : null });
            return WhatsAppClient.sendText(phone, "Perfeito! Qual serviço você gostaria de realizar? (Ex: Corte, Barba, Combo...)");
        }

        // Intenção: FILA
        if (input.includes('FILA') || input.includes('ESPERA') || buttonId === 'BIRTHDAY_FILA') {
            await WhatsAppSession.update(phone, 'queue_confirm', { coupon: buttonId === 'BIRTHDAY_FILA' ? 'BIRTHDAY' : null });
            return WhatsAppClient.sendText(phone, "Você gostaria de entrar na fila agora? Responda SIM ou NÃO.");
        }

        // Não entendeu
        await WhatsAppClient.sendText(phone, "Olá! Sou o assistente da barbearia. 💈\n\nComo posso te ajudar hoje?\n\nDigite *AGENDAR* para marcar um horário ou *FILA* para entrar na fila de espera.");
    }

    /**
     * Fluxo de Agendamento
     */
    private static async handleBookingFlow(phone: string, session: any, text: string, buttonId?: string) {
        const state = session.state;
        const context = session.context;

        // 4.1 Selecionar Serviço
        if (state === 'booking_select_service') {
            // Aqui buscaríamos no DB. Por agora, simulamos busca.
            const service = await this.searchService(text);
            if (service) {
                context.serviceId = service.id;
                context.serviceName = service.name;
                await WhatsAppSession.update(phone, 'booking_select_barber', context);
                return WhatsAppClient.sendText(phone, `Beleza, serviço *${service.name}*. Tem algum barbeiro preferido? Se não, responda *QUALQUER*.`);
            }
            return WhatsAppClient.sendText(phone, "Não encontrei esse serviço. Pode digitar novamente? (Ex: Corte, Barba)");
        }

        // 4.2 Selecionar Barbeiro
        if (state === 'booking_select_barber') {
            if (text.toUpperCase() === 'QUALQUER') {
                context.barberId = null;
                context.barberName = 'Qualquer barbeiro';
            } else {
                const barber = await this.searchBarber(text);
                if (!barber) return WhatsAppClient.sendText(phone, "Não encontrei esse barbeiro. Pode digitar o nome dele ou *QUALQUER*?");
                context.barberId = barber.id;
                context.barberName = barber.name;
            }
            await WhatsAppSession.update(phone, 'booking_select_datetime', context);
            return WhatsAppClient.sendText(phone, "Para que dia e horário? (Ex: hoje 15:00, amanhã às 10:30)");
        }

        // 4.3 Confirmar Agendamento (Simulação de data simplificada)
        if (state === 'booking_select_datetime') {
            context.datetime = text; // Em prod, usaríamos um parser (LLM ou regex)
            await WhatsAppSession.update(phone, 'booking_confirm', context);
            return WhatsAppClient.sendText(phone, `Certo! Vou marcar *${context.serviceName}* com *${context.barberName}* para *${text}*. Confirma? (Responda SIM ou NÃO)`);
        }

        // 4.4 Finalizar
        if (state === 'booking_confirm') {
            if (text.toUpperCase().includes('SIM')) {
                // TODO: Chamar POST /api/bookings no backend real
                await WhatsAppClient.sendText(phone, `✅ *Agendamento Confirmado!* Te esperamos em ${context.datetime}. Qualquer dúvida é só chamar!`);
                return WhatsAppSession.clear(phone);
            }
            await WhatsAppClient.sendText(phone, "Agendamento cancelado. Se precisar de algo, é só mandar AGENDAR novamente.");
            return WhatsAppSession.clear(phone);
        }
    }

    /**
     * Fluxo de Fila
     */
    private static async handleQueueFlow(phone: string, session: any, text: string) {
        if (text.toUpperCase().includes('SIM')) {
            // TODO: Chamar POST /api/queue no backend real
            await WhatsAppClient.sendText(phone, "✅ *Você entrou na fila!* Sua posição é a 3ª e o tempo estimado de espera é de 45 minutos. Te avisaremos por aqui quando sua vez estiver chegando.");
            return WhatsAppSession.clear(phone);
        }
        await WhatsAppClient.sendText(phone, "Entendido. Se mudar de ideia, é só mandar FILA.");
        return WhatsAppSession.clear(phone);
    }

    // --- Helpers de busca (Simulando acesso ao Supabase) ---

    private static async searchService(query: string) {
        // Mock de busca
        const services = [{ id: 's1', name: 'Corte' }, { id: 's2', name: 'Barba' }];
        return services.find(s => s.name.toLowerCase().includes(query.toLowerCase()));
    }

    private static async searchBarber(query: string) {
        // Mock de busca
        const barbers = [{ id: 'b1', name: 'Ramon' }, { id: 'b2', name: 'Zeca' }];
        return barbers.find(b => b.name.toLowerCase().includes(query.toLowerCase()));
    }
}
