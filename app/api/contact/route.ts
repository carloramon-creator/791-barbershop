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
                // Durante testes, se o domínio não estiver verificado, usar onboarding@resend.dev
                // O email de destino deve ser o mesmo cadastrado no Resend
                const fromEmail = 'onboarding@resend.dev';
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
                        subject: `Novo Contato: ${name}`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                                <h2 style="color: #2563eb;">Novo contato recebido pelo site</h2>
                                <p><strong>Nome:</strong> ${name}</p>
                                <p><strong>Email:</strong> ${email}</p>
                                <p><strong>Mensagem:</strong></p>
                                <div style="background: #f1f5f9; padding: 15px; border-radius: 8px;">
                                    ${message}
                                </div>
                                <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;" />
                                <p style="font-size: 12px; color: #64748b;">Este é um email automático enviado pelo sistema 791 Barber.</p>
                            </div>
                        `
                    })
                });

                const resData = await res.json();
                if (!res.ok) {
                    console.error('Erro Resend API:', resData);
                } else {
                    console.log('✅ Email enviado via Resend:', resData.id);
                }
            } catch (emailErr) {
                console.error('Erro ao chamar API do Resend:', emailErr);
            }
        } else {
            console.warn('RESEND_API_KEY não configurada no servidor. Email não enviado.');
        }

        return NextResponse.json({
            success: true,
            message: 'Mensagem recebida com sucesso! Verifique seu email em alguns instantes.'
        });
    } catch (error) {
        console.error('Erro ao processar contato:', error);
        return NextResponse.json(
            { error: 'Erro ao processar sua mensagem. Tente novamente.' },
            { status: 500 }
        );
    }
}
