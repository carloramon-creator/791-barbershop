import { NextResponse } from 'next/server';
import pdfService from '@/lib/nfse/pdf-service';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        console.log(`[API-NFSE-PDF-GET] Recebido pedido para ID: ${id}`);

        if (!id) {
            console.error('[API-NFSE-PDF-GET] ID não informado');
            return NextResponse.json({ error: 'ID não informado' }, { status: 400 });
        }

        const { tenant, user } = await getCurrentUserAndTenant();
        console.log(`[API-NFSE-PDF-GET] Usuário: ${user?.email}, Tenant: ${tenant?.name}`);

        // 1. Buscar a fatura
        const { data: finance, error: financeError } = await getSupabaseAdmin()
            .from('finance')
            .select('*')
            .eq('id', id)
            .eq('tenant_id', tenant.id)
            .single();

        if (financeError || !finance) {
            return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 });
        }

        // 2. Montar dpsData para o PDF
        const dpsData = {
            id: finance.metadata?.nfe_id || finance.id.slice(-8),
            numero: finance.metadata?.nfe_id || finance.id.slice(-8),
            dataEmissao: finance.metadata?.nfe_emission_date || finance.date,
            prestador: {
                name: tenant.name,
                razaoSocial: tenant.razao_social,
                cnpj: tenant.cnpj,
                logoUrl: tenant.logo_url,
                endereco: `${tenant.street || ''}, ${tenant.number || ''} ${tenant.city || ''}/${tenant.state || ''}`
            },
            tomador: {
                nome: finance.metadata?.tomador_nome || finance.customer_name || 'Não informado',
                razaoSocial: finance.metadata?.tomador_nome || finance.customer_name || 'Não informado',
                cnpj: finance.metadata?.tomador_documento || finance.customer_document || 'Não informado',
                endereco: finance.metadata?.tomador_endereco || 'Não informado'
            },
            servico: {
                discriminacao: finance.description || 'Prestação de serviços',
                valorServicos: finance.amount || finance.value || 0
            }
        };

        const pdfBuffer = await pdfService.generateDanfseBuffer(dpsData);

        return new NextResponse(pdfBuffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename="danfse.pdf"',
            },
        });
    } catch (error: any) {
        console.error('[API-NFSE-PDF-GET] Erro:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { dpsData } = await req.json();

        if (!dpsData) {
            return NextResponse.json({ error: 'Dados do DPS não informados' }, { status: 400 });
        }

        const pdfBuffer = await pdfService.generateDanfseBuffer(dpsData);

        return new NextResponse(pdfBuffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="danfse.pdf"',
            },
        });
    } catch (error: any) {
        console.error('[API-NFSE-PDF-POST] Erro:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
