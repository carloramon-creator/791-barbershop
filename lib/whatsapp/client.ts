/**
 * WhatsApp Cloud API Client
 * Oficial Meta Integration
 */

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_VERSION = 'v19.0';

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
    private static baseUrl = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

    /**
     * Envia uma mensagem via WhatsApp Cloud API
     */
    static async sendMessage(payload: WhatsAppMessagePayload) {
        if (!WHATSAPP_ACCESS_TOKEN || !PHONE_NUMBER_ID) {
            console.error('[WHATSAPP] Credenciais ausentes (Token ou Phone ID)');
            return null;
        }

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[WHATSAPP_API_ERROR]', JSON.stringify(data, null, 2));
                return { success: false, error: data };
            }

            return { success: true, data };
        } catch (error) {
            console.error('[WHATSAPP_FETCH_ERROR]', error);
            return { success: false, error };
        }
    }

    /**
     * Atalho para enviar texto simples
     */
    static async sendText(to: string, text: string) {
        return this.sendMessage({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: text }
        });
    }

    /**
     * Atalho para enviar template
     */
    static async sendTemplate(to: string, templateName: string, langCode = 'pt_BR', components: any[] = []) {
        return this.sendMessage({
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
