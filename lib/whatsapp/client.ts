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
        return `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    }

    /**
     * Envia uma mensagem via WhatsApp Cloud API usando credenciais específicas
     */
    /**
     * Normaliza números brasileiros para garantir o nono dígito no envio
     */
    private static normalizeNumber(phone: string): string {
        // Apenas remove caracteres não numéricos. 
        // A Meta lida melhor com o número puro (12 ou 13 dígitos) do que com lógicas de inserção manual de nono dígito.
        return phone.replace(/\D/g, '');
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
     * Atalho para enviar botões interativos (Máximo 3)
     */
    static async sendButtons(creds: WhatsAppCredentials, to: string, body: string, buttons: { id: string, title: string }[]) {
        return this.sendMessage(creds, {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive: {
                type: 'button',
                body: { text: body },
                action: {
                    buttons: buttons.map(btn => ({
                        type: 'reply',
                        reply: { id: btn.id, title: btn.title }
                    }))
                }
            }
        });
    }

    /**
     * Atalho para enviar listas interativas (Máximo 10 itens)
     */
    static async sendList(creds: WhatsAppCredentials, to: string, body: string, buttonText: string, sections: { title: string, rows: { id: string, title: string, description?: string }[] }[]) {
        return this.sendMessage(creds, {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive: {
                type: 'list',
                body: { text: body },
                action: {
                    button: buttonText,
                    sections: sections.map(sec => ({
                        title: sec.title,
                        rows: sec.rows.map(row => ({
                            id: row.id,
                            title: row.title,
                            description: row.description
                        }))
                    }))
                }
            }
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
