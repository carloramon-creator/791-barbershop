import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const { type, message, context } = payload;

        if (!type || !message) {
            return NextResponse.json({ error: 'Tipo e mensagem são obrigatórios' }, { status: 400 });
        }

        // Insert into database
        const { error } = await supabaseAdmin
            .from('support_tickets')
            .insert({
                type,
                message,
                tenant_id: context?.tenantId,
                user_id: context?.userId,
                context: {
                    ...context,
                    timestamp: new Date().toISOString()
                },
                status: 'open'
            });

        if (error) {
            console.error('[SUPPORT TICKET ERROR]', error);
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API SUPPORT ERROR]', error);
        return NextResponse.json({
            error: error.message || 'Erro ao processar chamado'
        }, { status: 500 });
    }
}
