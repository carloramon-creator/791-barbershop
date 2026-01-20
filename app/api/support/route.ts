import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function POST(req: Request) {
    try {
        const { tenant, user } = await getCurrentUserAndTenant();
        const body = await req.json();

        const { type, message, tenantName, userEmail } = body;

        console.log('[SUPPORT MESSAGE RECEIVED]', {
            type,
            message,
            tenant: tenantName || tenant?.name,
            email: userEmail || user?.email,
            timestamp: new Date().toISOString()
        });

        // 1. Tentar salvar no banco (tabela system_support_messages)
        // Se a tabela não existir, apenas ignoramos o erro e continuamos (logamos no console pelo menos)
        try {
            await supabaseAdmin
                .from('system_support_messages')
                .insert({
                    tenant_id: tenant?.id || null,
                    user_id: user?.id || null,
                    type,
                    message,
                    metadata: {
                        tenant_name: tenantName || tenant?.name,
                        user_email: userEmail || user?.email,
                        origin: 'system_modal'
                    }
                });
        } catch (dbError) {
            console.error('[SUPPORT DB ERROR] Tabela system_support_messages pode não existir:', dbError);
        }

        // 2. Retornar sucesso para o usuário
        return addCorsHeaders(req, NextResponse.json({
            success: true,
            message: 'Mensagem enviada com sucesso'
        }));

    } catch (error: any) {
        console.error('[SUPPORT API ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({
            error: 'Erro ao processar mensagem de suporte'
        }, { status: 500 }));
    }
}
