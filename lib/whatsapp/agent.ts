import { WhatsAppClient, WhatsAppCredentials } from './client';
import { WhatsAppSession } from './session';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { addMinutes, format, startOfToday, addDays, isSunday, subHours, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAvailableSlots } from '../availability-utils';

export interface AgentContext {
    tenantId: string;
    creds: WhatsAppCredentials;
}

/**
 * WhatsAppAgent
 * Responsável por processar a lógica de conversação, intenções e fluxos.
 */
export class WhatsAppAgent {
    static async handleMessage(ctx: AgentContext, payload: { from: string, text: string, buttonId?: string, messageType: string }) {
        const { from, text, buttonId } = payload;
        try {
            const session = await WhatsAppSession.get(ctx.tenantId, from);
            const input = (text || '').toUpperCase();

            console.log(`[WHATSAPP_AGENT] Processing message for Tenant ${ctx.tenantId} from ${from}. State: ${session.state}`);

            // Comandos Globais
            if (input === 'MENU' || input === 'SAIR' || input === 'CANCELAR' || input === 'OI' || input === 'OLA' || input === 'OLÁ') {
                await WhatsAppSession.clear(ctx.tenantId, from);
                return await this.handleIdleState(ctx, from);
            }

            if (session.state === 'registration_name') return await this.handleRegistrationName(ctx, from, session, text);
            if (session.state === 'registration_birthday') return await this.handleRegistrationBirthday(ctx, from, session, text);

            if (session.state === 'idle' || input === 'AGENDAR' || input === 'FILA' || input === 'STATUS' || buttonId === 'VIEW_STATUS') {
                return await this.handleIdleState(ctx, from, text, buttonId);
            }

            if (session.state.startsWith('booking_')) return await this.handleBookingFlow(ctx, from, session, text, buttonId);
            if (session.state.startsWith('queue_')) return await this.handleQueueFlow(ctx, from, session, text, buttonId);

            return await this.handleIdleState(ctx, from);
        } catch (error: any) {
            console.error('[WHATSAPP_AGENT_CRASH]', error.message, error.stack);
        }
    }

    private static async handleIdleState(ctx: AgentContext, phone: string, text: string = '', buttonId?: string) {
        const input = text.toUpperCase();

        const phoneWithout55 = phone.startsWith('55') ? phone.slice(2) : phone;
        const phoneWith55 = phone.startsWith('55') ? phone : `55${phone}`;

        const { data: client } = await getSupabaseAdmin()
            .from('clients')
            .select('id, name, birth_date')
            .eq('tenant_id', ctx.tenantId)
            .or(`phone.eq.${phone},phone.eq.${phoneWithout55},phone.eq.${phoneWith55}`)
            .limit(1)
            .maybeSingle();

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
            return WhatsAppClient.sendText(ctx.creds, phone, `Olá ${client.name}! 👋\n\nPrecisamos da sua *data de nascimento* para o cadastro. (Ex: 25/12/1990)`);
        }

        const { data: tenant } = await getSupabaseAdmin().from('tenants').select('module_queue_enabled, module_appointments_enabled').eq('id', ctx.tenantId).single();

        const queueEnabled = tenant?.module_queue_enabled ?? true;
        const apptEnabled = tenant?.module_appointments_enabled ?? true;

        if (apptEnabled && (input.includes('AGENDAR') || buttonId === 'BOOKING_START')) {
            await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_service', {});
            const services = await this.listServices(ctx.tenantId);
            const rows = (services || []).map(s => ({ id: s.id, title: s.name, description: `R$ ${s.price}` }));
            return WhatsAppClient.sendList(ctx.creds, phone, "Qual serviço você deseja?", "Ver Serviços", [{ title: "Serviços", rows }]);
        }

        if (queueEnabled && (input.includes('FILA') || buttonId === 'QUEUE_START')) {
            await WhatsAppSession.update(ctx.tenantId, phone, 'queue_select_barber', {});
            return this.handleQueueFlow(ctx, phone, { state: 'queue_select_barber', context: {} }, text, buttonId);
        }

        if (input.includes('STATUS') || buttonId === 'VIEW_STATUS') return this.handleStatusCheck(ctx, phone);

        const buttons = [];
        if (apptEnabled) buttons.push({ id: 'BOOKING_START', title: 'Agendar Horário' });
        if (queueEnabled) buttons.push({ id: 'QUEUE_START', title: 'Entrar na Fila' });
        buttons.push({ id: 'VIEW_STATUS', title: 'Meus Status' });

        return WhatsAppClient.sendButtons(ctx.creds, phone, "Olá! Como posso ajudar hoje?", buttons);
    }

    private static async handleRegistrationName(ctx: AgentContext, phone: string, session: any, text: string) {
        if (!text || text.length < 3) return WhatsAppClient.sendText(ctx.creds, phone, "Por favor, digite seu nome completo.");
        session.context.name = text;
        await WhatsAppSession.update(ctx.tenantId, phone, 'registration_birthday', session.context);
        return WhatsAppClient.sendText(ctx.creds, phone, `Prazer, *${text}*! 😊 Qual sua *data de nascimento*? (DD/MM/AAAA)`);
    }

    private static async handleRegistrationBirthday(ctx: AgentContext, phone: string, session: any, text: string) {
        try {
            const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
            const match = text.match(dateRegex);
            if (!match) return WhatsAppClient.sendText(ctx.creds, phone, "Formato inválido. Digite DD/MM/AAAA.");
            const [_, day, month, year] = match;
            await this.getOrCreateClient(ctx.tenantId, phone, session.context.name, `${year}-${month}-${day}`);
            await WhatsAppClient.sendText(ctx.creds, phone, "Cadastro concluído! ✅");
            const action = session.context.originalAction;
            await WhatsAppSession.clear(ctx.tenantId, phone);
            return await this.handleIdleState(ctx, phone, '', action);
        } catch (e: any) {
            return WhatsAppClient.sendText(ctx.creds, phone, `Erro ao salvar: ${e.message}`);
        }
    }

    private static async handleBookingFlow(ctx: AgentContext, phone: string, session: any, text: string, buttonId?: string): Promise<any> {
        const { state, context } = session;

        if (buttonId === 'BACK_TO_DATE') return this.presentDateSelection(ctx, phone, context);
        if (buttonId === 'BACK_TO_BARBER') {
            const barbers = await this.listBarbers(ctx.tenantId, context.serviceId);
            const rows = [
                { id: 'ANY_BARBER_BOOKING', title: 'Qualquer um', description: 'Mais rápido' },
                ...(barbers || []).slice(0, 9).map(b => ({ id: b.id, title: b.nickname || b.name }))
            ];
            await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_barber', context);
            return WhatsAppClient.sendList(ctx.creds, phone, `Serviço: *${context.serviceName}*. Algum profissional de preferência?`, "Ver Profissionais", [{ title: "Profissionais", rows }]);
        }

        if (state === 'booking_select_service') {
            const service = await this.searchService(ctx.tenantId, buttonId || text);
            if (service) {
                context.serviceId = service.id;
                context.serviceName = service.name;
                await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_barber', context);
                let barbers = await this.listBarbers(ctx.tenantId, service.id);
                const rows = [
                    { id: 'ANY_BARBER_BOOKING', title: 'Qualquer um', description: 'Mais rápido' },
                    ...(barbers || []).slice(0, 9).map(b => ({ id: b.id, title: b.nickname || b.name }))
                ];
                return WhatsAppClient.sendList(ctx.creds, phone, `Serviço: *${service.name}*. Algum profissional de preferência?`, "Ver Profissionais", [{ title: "Profissionais", rows }]);
            }
            return WhatsAppClient.sendText(ctx.creds, phone, "Serviço não encontrado. Tente novamente.");
        }

        if (state === 'booking_select_barber') {
            if (buttonId === 'ANY_BARBER_BOOKING') {
                context.barberId = null;
                context.barberName = 'Qualquer profissional';
            } else {
                const barber = await this.searchBarber(ctx.tenantId, buttonId || text);
                if (!barber) return WhatsAppClient.sendText(ctx.creds, phone, "Profissional não encontrado.");
                context.barberId = barber.id;
                context.barberName = barber.name;
            }
            return this.presentDateSelection(ctx, phone, context);
        }

        if (state === 'booking_select_date') {
            if (buttonId === 'BACK_TO_BARBER') {
                await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_service', context);
                return this.handleBookingFlow(ctx, phone, { state: 'booking_select_service', context }, context.serviceName);
            }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(buttonId || '')) return WhatsAppClient.sendText(ctx.creds, phone, "Data inválida.");
            context.selectedDate = buttonId;
            return this.presentTimeSelection(ctx, phone, context);
        }

        if (state === 'booking_select_time') {
            if (buttonId?.startsWith('PERIOD_')) {
                const period = buttonId === 'PERIOD_ALL' ? undefined : buttonId.replace('PERIOD_', '');
                return this.presentTimeSelection(ctx, phone, context, period);
            }
            if (!/^\d{2}:\d{2}$/.test(buttonId || '')) return WhatsAppClient.sendText(ctx.creds, phone, "Horário inválido.");
            context.selectedTime = buttonId;
            const iso = `${context.selectedDate}T${buttonId}:00`;
            context.startTimeISO = iso;
            await WhatsAppSession.update(ctx.tenantId, phone, 'booking_confirm', context);
            const display = format(parseISO(iso), "eeee, dd/MM 'as' HH:mm", { locale: ptBR });
            return WhatsAppClient.sendButtons(ctx.creds, phone, `Confirma agendamento?\n\n✂️ *${context.serviceName}*\n💈 *${context.barberName}*\n📅 *${display}*`, [
                { id: 'CONFIRM_YES', title: 'Sim, confirmar' },
                { id: 'MENU', title: 'Não, cancelar' }
            ]);
        }

        if (state === 'booking_confirm' && buttonId === 'CONFIRM_YES') return this.finalizeBooking(ctx, phone, context);
    }

    private static async handleQueueFlow(ctx: AgentContext, phone: string, session: any, text: string, buttonId?: string) {
        if (session.state === 'queue_select_barber') {
            if (buttonId || (text && text.toUpperCase() !== 'FILA')) {
                const selectedId = buttonId || text;
                try {
                    const clientId = await this.getOrCreateClient(ctx.tenantId, phone);
                    let targetBarberId = null;

                    if (selectedId === 'ANY_BARBER_QUEUE' || selectedId === 'QUEUE_START') {
                        const stats = await this.getBarbersWithQueueStats(ctx.tenantId);
                        if (stats.length > 0) targetBarberId = stats.sort((a, b) => a.queueSize - b.queueSize)[0].id;
                    } else {
                        const barber = await this.searchBarber(ctx.tenantId, selectedId);
                        if (barber) targetBarberId = barber.id;
                    }

                    if (!targetBarberId) {
                        const stats = await this.getBarbersWithQueueStats(ctx.tenantId);
                        if (!stats.length) return WhatsAppClient.sendText(ctx.creds, phone, "Ninguém disponível agora.");
                        const rows = [{ id: 'ANY_BARBER_QUEUE', title: 'Qualquer um' }, ...stats.map(b => ({ id: b.id, title: b.name }))];
                        return WhatsAppClient.sendList(ctx.creds, phone, "Escolha o profissional:", "Ver Fila", [{ title: "Fila", rows }]);
                    }

                    const { count } = await getSupabaseAdmin().from('client_queue').select('*', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId).eq('barber_id', targetBarberId).eq('status', 'waiting');
                    const pos = (count || 0) + 1;

                    await getSupabaseAdmin().from('client_queue').insert({
                        tenant_id: ctx.tenantId, barber_id: targetBarberId, client_id: clientId, client_phone: phone, status: 'waiting', position: pos
                    });

                    await WhatsAppClient.sendText(ctx.creds, phone, `✅ *Na fila!* Sua posição: ${pos}º.`);
                    return WhatsAppSession.clear(ctx.tenantId, phone);
                } catch (e: any) {
                    return WhatsAppClient.sendText(ctx.creds, phone, `Erro: ${e.message}`);
                }
            }
            const stats = await this.getBarbersWithQueueStats(ctx.tenantId);
            if (!stats.length) return WhatsAppClient.sendText(ctx.creds, phone, "Ninguém disponível.");
            const rows = [{ id: 'ANY_BARBER_QUEUE', title: 'Qualquer um' }, ...stats.map(b => ({ id: b.id, title: b.nickname || b.name, description: `Fila: ${b.queueSize} (~${b.estimatedWait} min)` }))];
            return WhatsAppClient.sendList(ctx.creds, phone, "Entre na fila:", "Ver Fila", [{ title: "Fila", rows }]);
        }
    }

    private static async listBarbers(tenantId: string, serviceId?: string) {
        const admin = getSupabaseAdmin();
        const { data: active } = await admin.from('barbers').select('id, user_id, name, nickname, status').eq('tenant_id', tenantId).eq('is_active', true).neq('status', 'offline').order('name');
        if (!active) return [];
        if (!serviceId) return active;
        const { data: links } = await admin.from('barber_services').select('barber_id').eq('service_id', serviceId);
        if (!links?.length) return active;
        const specialistIds = new Set(links.map(l => l.barber_id));
        const specialists = active.filter(b => specialistIds.has(b.user_id));
        return specialists.length > 0 ? specialists : active;
    }

    private static async getBarbersWithQueueStats(tenantId: string) {
        const admin = getSupabaseAdmin();
        const { data: barbers } = await admin.from('barbers').select('id, name, nickname').eq('tenant_id', tenantId).eq('is_active', true).neq('status', 'offline');
        if (!barbers) return [];
        const stats = [];
        for (const b of barbers) {
            const { count } = await admin.from('client_queue').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('barber_id', b.id).eq('status', 'waiting');
            stats.push({ ...b, queueSize: count || 0, estimatedWait: (count || 0) * 30 });
        }
        return stats;
    }

    private static async getOrCreateClient(tenantId: string, phone: string, name?: string, birthDate?: string) {
        const admin = getSupabaseAdmin();
        const pLess = phone.startsWith('55') ? phone.slice(2) : phone;
        const pPlus = phone.startsWith('55') ? phone : `55${phone}`;
        const { data: existing } = await admin.from('clients').select('id, name, birth_date').eq('tenant_id', tenantId).or(`phone.eq.${phone},phone.eq.${pLess},phone.eq.${pPlus}`).limit(1).maybeSingle();
        if (existing) {
            if (name || birthDate) await admin.from('clients').update({ name: name || existing.name, birth_date: birthDate || existing.birth_date }).eq('id', existing.id);
            return existing.id;
        }
        const { data: created } = await admin.from('clients').insert({ tenant_id: tenantId, phone, name: name || 'Cliente WhatsApp', birth_date: birthDate || null }).select().single();
        return created.id;
    }

    private static async searchService(tenantId: string, query: string) {
        const admin = getSupabaseAdmin();
        if (query.includes('-')) {
            const { data } = await admin.from('services').select('id, name, price').eq('id', query).eq('tenant_id', tenantId).maybeSingle();
            if (data) return data;
        }
        const { data } = await admin.from('services').select('id, name, price').eq('tenant_id', tenantId).ilike('name', `%${query}%`).limit(1).maybeSingle();
        return data;
    }

    private static async searchBarber(tenantId: string, query: string) {
        const admin = getSupabaseAdmin();
        if (query.includes('-')) {
            const { data } = await admin.from('barbers').select('id, name').eq('id', query).maybeSingle();
            if (data) return data;
        }
        const { data } = await admin.from('barbers').select('id, name').eq('tenant_id', tenantId).eq('is_active', true).ilike('name', `%${query}%`).limit(1).maybeSingle();
        return data;
    }

    private static async listServices(tenantId: string) {
        const { data } = await getSupabaseAdmin().from('services').select('id, name, price').eq('tenant_id', tenantId).order('name').limit(10);
        return data;
    }

    private static async presentDateSelection(ctx: AgentContext, phone: string, context: any) {
        await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_date', context);
        const dates = [];
        let curr = startOfToday();
        while (dates.length < 7) {
            if (!isSunday(curr)) dates.push(curr);
            curr = addDays(curr, 1);
        }
        const rows = dates.map(d => ({ id: format(d, 'yyyy-MM-dd'), title: format(d, "eeee (dd/MM)", { locale: ptBR }) }));
        return WhatsAppClient.sendList(ctx.creds, phone, "Escolha o dia:", "Ver Datas", [{ title: "Datas", rows }]);
    }

    private static async presentTimeSelection(ctx: AgentContext, phone: string, context: any, filterPeriod?: string) {
        await WhatsAppSession.update(ctx.tenantId, phone, 'booking_select_time', context);
        const admin = getSupabaseAdmin();

        let query = admin
            .from('appointments')
            .select('start_time, end_time')
            .eq('tenant_id', ctx.tenantId)
            .neq('status', 'cancelled')
            .gte('start_time', `${context.selectedDate}T00:00:00`)
            .lte('start_time', `${context.selectedDate}T23:59:59`);

        if (context.barberId) {
            query = query.eq('barber_id', context.barberId);
        }

        const { data: appts } = await query;
        const { data: tenant } = await admin.from('tenants').select('opening_hours').eq('id', ctx.tenantId).single();
        const { data: service } = await admin.from('services').select('duration_minutes').eq('id', context.serviceId).single();

        const allSlots = getAvailableSlots(
            parseISO(context.selectedDate),
            appts || [],
            tenant?.opening_hours,
            service?.duration_minutes || 30,
            'available',
            context.selectedDate === format(new Date(), 'yyyy-MM-dd')
        ).filter(s => s.available);

        if (!allSlots.length) {
            return WhatsAppClient.sendButtons(ctx.creds, phone, "Desculpe, não encontrei horários livres para esta data. O que deseja fazer?", [
                { id: 'BACK_TO_DATE', title: '📅 Outra Data' },
                { id: 'BACK_TO_BARBER', title: '💈 Trocar Barbeiro' }
            ]);
        }

        let filteredSlots = allSlots;
        let periodLabel = "";

        if (filterPeriod === 'MORNING') {
            filteredSlots = allSlots.filter(s => parseInt(s.time.split(':')[0]) < 12);
            periodLabel = " (Manhã)";
        } else if (filterPeriod === 'EARLY_AFTERNOON') {
            filteredSlots = allSlots.filter(s => parseInt(s.time.split(':')[0]) >= 12 && parseInt(s.time.split(':')[0]) < 15);
            periodLabel = " (Início da Tarde)";
        } else if (filterPeriod === 'LATE_AFTERNOON') {
            filteredSlots = allSlots.filter(s => parseInt(s.time.split(':')[0]) >= 15 && parseInt(s.time.split(':')[0]) < 18);
            periodLabel = " (Fim da Tarde)";
        } else if (filterPeriod === 'EVENING') {
            filteredSlots = allSlots.filter(s => parseInt(s.time.split(':')[0]) >= 18);
            periodLabel = " (Noite)";
        }

        // Se houver muitos slots e nenhum filtro aplicado, pede para escolher o período
        if (allSlots.length > 10 && !filterPeriod) {
            const rows = [];
            if (allSlots.some(s => parseInt(s.time.split(':')[0]) < 12))
                rows.push({ id: 'PERIOD_MORNING', title: '☀️ Manhã', description: 'Até 12:00' });
            if (allSlots.some(s => parseInt(s.time.split(':')[0]) >= 12 && parseInt(s.time.split(':')[0]) < 15))
                rows.push({ id: 'PERIOD_EARLY_AFTERNOON', title: '🌤️ Início da Tarde', description: '12:00 às 15:00' });
            if (allSlots.some(s => parseInt(s.time.split(':')[0]) >= 15 && parseInt(s.time.split(':')[0]) < 18))
                rows.push({ id: 'PERIOD_LATE_AFTERNOON', title: '⛅ Fim da Tarde', description: '15:00 às 18:00' });
            if (allSlots.some(s => parseInt(s.time.split(':')[0]) >= 18))
                rows.push({ id: 'PERIOD_EVENING', title: '🌙 Noite', description: 'Após 18:00' });

            return WhatsAppClient.sendList(ctx.creds, phone, "Temos muitos horários! Escolha um período:", "Ver Períodos", [{ title: "Períodos", rows }]);
        }

        const rows: any[] = filteredSlots.slice(0, 10).map(s => ({ id: s.time, title: s.time }));
        if (filterPeriod) {
            rows.push({ id: 'PERIOD_ALL', title: '↩️ Outros Períodos', description: 'Voltar para seleção de períodos' });
        }

        return WhatsAppClient.sendList(ctx.creds, phone, `Escolha o horário${periodLabel}:`, "Ver Horários", [{ title: "Horários", rows }]);
    }

    private static async finalizeBooking(ctx: AgentContext, phone: string, context: any) {
        try {
            const start = new Date(context.startTimeISO + '-03:00');
            const { data: s } = await getSupabaseAdmin().from('services').select('name, duration_minutes').eq('id', context.serviceId).single();
            await getSupabaseAdmin().from('appointments').insert({
                tenant_id: ctx.tenantId, client_id: await this.getOrCreateClient(ctx.tenantId, phone), client_phone: phone, client_name: context.name, barber_id: context.barberId, service_id: context.serviceId, start_time: start.toISOString(), end_time: addMinutes(start, s?.duration_minutes || 30).toISOString(), status: 'scheduled'
            });
            await WhatsAppClient.sendText(ctx.creds, phone, "✅ *Agendado!*");
            return WhatsAppSession.clear(ctx.tenantId, phone);
        } catch (e: any) {
            return WhatsAppClient.sendText(ctx.creds, phone, "Erro ao agendar.");
        }
    }

    private static async handleStatusCheck(ctx: AgentContext, phone: string) {
        const { data: appts } = await getSupabaseAdmin().from('appointments').select('start_time, status').eq('tenant_id', ctx.tenantId).eq('client_phone', phone).gte('start_time', new Date().toISOString()).limit(5);
        let msg = `📝 *Seus Status:*\n\n`;
        if (appts?.length) appts.forEach(a => msg += `• 🗓️ ${format(parseISO(a.start_time), 'dd/MM HH:mm')}\n`);
        else msg = "Sem agendamentos.";
        return WhatsAppClient.sendText(ctx.creds, phone, msg);
    }
}
