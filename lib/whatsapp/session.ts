import { getSupabaseAdmin } from '@/lib/supabase-server';

/**
 * Gerencia o estado e contexto da conversa de cada usuário
 */
export class WhatsAppSession {
    /**
     * Busca ou cria uma sessão para o telefone
     */
    static async get(phone: string) {
        const { data, error } = await getSupabaseAdmin()
            .from('whatsapp_sessions')
            .select('*')
            .eq('phone', phone)
            .maybeSingle();

        if (error) {
            console.error('[WHATSAPP_SESSION_GET_ERROR]', error);
            return { state: 'idle', context: {} };
        }

        if (!data) {
            return { state: 'idle', context: {} };
        }

        return {
            state: data.state || 'idle',
            context: data.context || {}
        };
    }

    /**
     * Atualiza o estado e contexto da sessão
     */
    static async update(phone: string, state: string, context: any = {}) {
        const { error } = await getSupabaseAdmin()
            .from('whatsapp_sessions')
            .upsert({
                phone,
                state,
                context,
                updated_at: new Date().toISOString()
            }, { onConflict: 'phone' });

        if (error) {
            console.error('[WHATSAPP_SESSION_UPDATE_ERROR]', error);
            return false;
        }

        return true;
    }

    /**
     * Limpa a sessão (volta para idle)
     */
    static async clear(phone: string) {
        return this.update(phone, 'idle', {});
    }
}
