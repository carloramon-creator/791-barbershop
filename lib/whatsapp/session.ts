import { getSupabaseAdmin } from '@/lib/supabase-server';

/**
 * Gerencia o estado e contexto da conversa de cada usuário,
 * isolado por barbearia (tenant_id).
 */
export class WhatsAppSession {
    /**
     * Busca ou cria uma sessão para o telefone em uma barbearia específica
     */
    static async get(tenantId: string, phone: string) {
        const { data, error } = await getSupabaseAdmin()
            .from('whatsapp_sessions')
            .select('*')
            .eq('tenant_id', tenantId)
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
     * Atualiza o estado e contexto da sessão para uma barbearia específica
     */
    static async update(tenantId: string, phone: string, state: string, context: any = {}) {
        const { error } = await getSupabaseAdmin()
            .from('whatsapp_sessions')
            .upsert({
                tenant_id: tenantId,
                phone,
                state,
                context,
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,phone' });

        if (error) {
            console.error('[WHATSAPP_SESSION_UPDATE_ERROR]', error);
            return false;
        }

        return true;
    }

    /**
     * Limpa a sessão (volta para idle)
     */
    static async clear(tenantId: string, phone: string) {
        return this.update(tenantId, phone, 'idle', {});
    }
}
