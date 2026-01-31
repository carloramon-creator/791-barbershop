import { NextResponse } from 'next/server';
import { WhatsAppClient } from '@/lib/whatsapp/client';
// import { WhatsAppAgent } from '@/lib/whatsapp/agent'; // Ainda será criado

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

/**
 * Webhook principal para integração com WhatsApp Cloud API
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('[WHATSAPP_WEBHOOK] Validado com sucesso!');
        return new Response(challenge, { status: 200 });
    }

    return new Response('Forbidden', { status: 403 });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Verificar se é uma mensagem do WhatsApp
        if (body.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;
            const message = value?.messages?.[0];

            if (message) {
                const phone = message.from;
                const type = message.type;

                let normalizedPayload: any = {
                    trigger: 'INCOMING_MESSAGE',
                    from: phone,
                    messageType: type,
                    raw: message
                };

                // Extrair texto ou clique em botão
                if (type === 'text') {
                    normalizedPayload.text = message.text?.body;
                } else if (type === 'interactive') {
                    const interactive = message.interactive;
                    if (interactive.type === 'button_reply') {
                        normalizedPayload.buttonId = interactive.button_reply?.id;
                        normalizedPayload.text = interactive.button_reply?.title;
                        normalizedPayload.messageType = 'button';
                    } else if (interactive.type === 'list_reply') {
                        normalizedPayload.buttonId = interactive.list_reply?.id;
                        normalizedPayload.text = interactive.list_reply?.title;
                        normalizedPayload.messageType = 'list';
                    }
                }

                console.log('[WHATSAPP_WEBHOOK] Mensagem recebida:', normalizedPayload.from, normalizedPayload.text);

                // Chamar o Agente para processar a lógica
                const { WhatsAppAgent } = await import('@/lib/whatsapp/agent');
                await WhatsAppAgent.handleMessage(normalizedPayload);
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Not a WhatsApp business account event' }, { status: 404 });
    } catch (error: any) {
        console.error('[WHATSAPP_WEBHOOK_ERROR]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
