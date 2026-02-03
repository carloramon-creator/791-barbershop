import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
    try {
        const { name, email, message } = await request.json();

        // Validação básica
        if (!name || !email || !message) {
            return NextResponse.json(
                { error: 'Todos os campos são obrigatórios' },
                { status: 400 }
            );
        }

        // 1. Salvar no Supabase (Persistência)
        const supabase = getSupabaseAdmin();
        const { error: dbError } = await supabase
            .from('landing_contacts')
            .insert([{ name, email, message }]);

        if (dbError) {
            console.error('Erro ao salvar no banco:', dbError);
            // Continuamos mesmo se falhar o banco, para tentar enviar o email
        }

        // 2. Enviar email via Resend
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (RESEND_API_KEY) {
            try {
                // Se o usuário já verificou o domínio no Resend, ele pode usar um email próprio
                // Caso contrário, usamos o modo de teste (onboarding@resend.dev)
                // IMPORTANTE: onboarding@resend.dev só envia para o email do dono da conta Resend.
                const fromEmail = process.env.CONTACT_SENDER_EMAIL || 'onboarding@resend.dev';
                const toEmail = process.env.CONTACT_RECEIVER_EMAIL || 'carloramon.cre@gmail.com';

                const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${RESEND_API_KEY}`
                    },
                    body: JSON.stringify({
                        from: `791 Barber <${fromEmail}>`,
                        to: [toEmail],
                        reply_to: email, // Permite responder direto ao cliente
                        subject: `Novo Contato: ${name}`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #eee; border-radius: 12px;">
                                <h2 style="color: #2563eb; margin-top: 0;">Novo contato recebido! 🚀</h2>
                                <p><strong>Nome:</strong> ${name}</p>
                                <p><strong>Email:</strong> ${email}</p>
                                <p><strong>Mensagem:</strong></p>
                                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; font-style: italic;">
                                    ${message}
                                </div>
                                <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eee;" />
                                <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                                    Este é um email automático do seu site 791barber.com.<br/>
                                    Enviado via Resend API.
                                </p>
                            </div>
                        `
                    })
                });

                const resData = await res.json();
                if (!res.ok) {
                    console.error('Erro Resend API:', JSON.stringify(resData, null, 2));
                } else {
                    console.log('✅ Email enviado com sucesso via Resend:', resData.id);
                }
            } catch (emailErr) {
                console.error('Erro fatal ao disparar email:', emailErr);
            }
        } else {
            console.warn('Variável RESEND_API_KEY não encontrada nas configurações do servidor.');
        }

        return NextResponse.json({
            success: true,
            message: 'Mensagem recebida! Verifique sua caixa de entrada (e o spam).'
        });
    } catch (error) {
        console.error('Erro ao processar contato:', error);
        return NextResponse.json(
            { error: 'Erro ao processar sua mensagem. Tente novamente.' },
            { status: 500 }
        );
    }
}
