/**
 * WhatsApp Cloud API Client
 * Oficial Meta Integration - Multi-tenant support
 */

export interface WhatsAppCredentials {
    accessToken: string;
    phoneNumberId: string;
}

export interface WhatsAppMessagePayload {
    messaging_product: 'whatsapp';
    to: string;
    type: 'text' | 'template' | 'interactive';
    text?: { body: string };
    template?: {
        name: string;
        language: { code: string };
        components?: any[];
    };
    interactive?: any;
}

export class WhatsAppClient {
    private static getBaseUrl(phoneNumberId: string) {
        return `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
    }

    /**
     * Envia uma mensagem via WhatsApp Cloud API usando credenciais específicas
     */
    /**
     * Normaliza números brasileiros para garantir o nono dígito no envio
     */
    private static normalizeNumber(phone: string): string {
        let clean = phone.replace(/\D/g, '');
        console.log(`[WHATSAPP_CLIENT] Usando número conforme recebido do Meta: ${clean}`);
        return clean;
    }

    static async sendMessage(creds: WhatsAppCredentials, payload: WhatsAppMessagePayload) {
        if (!creds.accessToken || !creds.phoneNumberId) {
            console.error('[WHATSAPP] Credenciais ausentes');
            return null;
        }

        // Normalizar o destinatário
        payload.to = this.normalizeNumber(payload.to);

        try {
            console.log(`[WHATSAPP_CLIENT] Fazendo POST para ${this.getBaseUrl(creds.phoneNumberId)} enviando para ${payload.to}`);
            const response = await fetch(this.getBaseUrl(creds.phoneNumberId), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${creds.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[WHATSAPP_API_ERROR]', JSON.stringify(data, null, 2));
                return { success: false, error: data };
            }

            console.log('[WHATSAPP_CLIENT] Mensagem enviada com sucesso:', data.messages?.[0]?.id);
            return { success: true, data };
        } catch (error) {
            console.error('[WHATSAPP_FETCH_ERROR]', error);
            return { success: false, error };
        }
    }

    /**
     * Atalhos para enviar texto simples
     */
    static async sendText(creds: WhatsAppCredentials, to: string, text: string) {
        return this.sendMessage(creds, {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: text }
        });
    }

    /**
     * Atalho para enviar template
     */
    static async sendTemplate(creds: WhatsAppCredentials, to: string, templateName: string, langCode = 'pt_BR', components: any[] = []) {
        return this.sendMessage(creds, {
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
                name: templateName,
                language: { code: langCode },
                components
            }
        });
    }
}
