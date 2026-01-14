import { NextResponse } from 'next/server';
import pdfService from '@/lib/nfse/pdf-service';

export async function POST(req: Request) {
    try {
        const { dpsData } = await req.json();

        if (!dpsData) {
            return NextResponse.json({ error: 'Dados do DPS não informados' }, { status: 400 });
        }

        const pdfBuffer = await pdfService.generateDanfseBuffer(dpsData);

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="danfse.pdf"',
            },
        });
    } catch (error: any) {
        console.error('[API-NFSE-PDF] Erro:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
