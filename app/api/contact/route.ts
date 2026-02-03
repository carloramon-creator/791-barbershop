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
                const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${RESEND_API_KEY}`
                    },
                    body: JSON.stringify({
                        from: '791 Barber <contato@791barber.com>',
                        to: [process.env.CONTACT_RECEIVER_EMAIL || 'carloramon.cre@gmail.com'],
                        subject: `Novo Contato: ${name}`,
                        html: `
                            <h2>Novo contato recebido pelo site</h2>
                            <p><strong>Nome:</strong> ${name}</p>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>Mensagem:</strong></p>
                            <p>${message}</p>
                            <hr />
                            <p>Este é um email automático enviado pelo sistema 791 Barber.</p>
                        `
                    })
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    console.error('Erro Resend API:', errorData);
                }
            } catch (emailErr) {
                console.error('Erro ao chamar API do Resend:', emailErr);
            }
        } else {
            console.warn('RESEND_API_KEY não configurada. Email não enviado.');
        }

        return NextResponse.json({
            success: true,
            message: 'Mensagem recebida com sucesso! Entraremos em contato em breve.'
        });
    } catch (error) {
        console.error('Erro ao processar contato:', error);
        return NextResponse.json(
            { error: 'Erro ao processar sua mensagem. Tente novamente.' },
            { status: 500 }
        );
    }
}
