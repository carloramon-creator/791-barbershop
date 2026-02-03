import { NextRequest, NextResponse } from 'next/server';

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

        // TODO: Integrar com serviço de email (SendGrid, Resend, etc)
        // Por enquanto, apenas log
        console.log('📧 Novo contato recebido:', { name, email, message });

        // Aqui você pode integrar com:
        // - SendGrid
        // - Resend
        // - Nodemailer
        // - Ou qualquer outro serviço de email

        // Exemplo com fetch para um webhook (você pode usar Zapier, Make, etc)
        // await fetch('https://hooks.zapier.com/hooks/catch/...', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ name, email, message })
        // });

        return NextResponse.json({
            success: true,
            message: 'Mensagem enviada com sucesso! Entraremos em contato em breve.'
        });
    } catch (error) {
        console.error('Erro ao enviar contato:', error);
        return NextResponse.json(
            { error: 'Erro ao enviar mensagem. Tente novamente.' },
            { status: 500 }
        );
    }
}
