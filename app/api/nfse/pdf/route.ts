import { NextResponse } from 'next/server';
import pdfService from '@/lib/nfse/pdf-service';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';
import { headers } from 'next/headers'; // Added this import

export async function GET(req: Request) {
    console.log(`[API-NFSE-PDF-GET] (v=3) INIT: ${req.url}`);
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const source = searchParams.get('source');

        if (!id) {
            console.error('[API-NFSE-PDF-GET] Error: ID missing');
            return NextResponse.json({ error: 'ID da fatura não informado' }, { status: 400 });
        }

        const headersList = await headers();
        const host = headersList.get('host') || '';
        console.log(`[API-NFSE-PDF-GET] Host: ${host}`);

        const { tenant, user } = await getCurrentUserAndTenant();
        console.log(`[API-NFSE-PDF-GET] Auth Success: user=${user?.email}, tenant=${tenant?.name} (${tenant?.id})`);

        // 1. Buscar a fatura
        const { data: finance, error: financeError } = await getSupabaseAdmin()
            .from('finance')
            .select('*')
            .eq('id', id)
            .single();

        if (financeError || !finance) {
            console.error(`[API-NFSE-PDF-GET] Error: Invoice not found. ID: ${id}`);
            return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 });
        }

        // Segurança básica: tenant do usuário deve ser o mesmo da fatura,
        // EXCETO se for System Admin (atendimento ao suporte)
        const isOwner = finance.tenant_id === tenant.id;
        const isAuthorized = isOwner || (user?.email === 'ramon@791solucoes.com.br');

        if (!isAuthorized) {
            console.error(`[API-NFSE-PDF-GET] Unauthorized: User ${user?.email} tried to access invoice ${id} of tenant ${finance.tenant_id}`);
            return NextResponse.json({ error: 'Acesso negado para esta fatura' }, { status: 403 });
        }

        // 2. Se for link externo (ex: IPM), redireciona
        const pdfUrl = finance.metadata?.nfe_pdf_url || finance.metadata?.pdfUrl || finance.metadata?.pdf_url;
        if (pdfUrl && pdfUrl.startsWith('http') && !pdfUrl.includes('/api/nfse/pdf')) {
            console.log(`[API-NFSE-PDF-GET] External URL detected, redirecting: ${pdfUrl}`);
            return NextResponse.redirect(pdfUrl);
        }

        // 3. Determinar se é um pagamento SaaS para inverter Prestador/Tomador
        const isSaaS = finance.metadata?.is_saas_payment === true ||
            finance.description?.toUpperCase().includes('SAAS') ||
            finance.description?.toUpperCase().includes('MENSALIDADE') ||
            finance.description?.toUpperCase().includes('791 BARBER');

        console.log(`[API-NFSE-PDF-GET] Detection: isSaaS=${isSaaS}`);

        let dpsData: any;

        if (isSaaS) {
            // PRESTADOR: 791 SOLUÇÕES (SaaS)
            // TOMADOR: Barbearia (Tenant)
            dpsData = {
                id: finance.metadata?.nfe_id || finance.id.slice(-8),
                numero: finance.metadata?.nfe_id || finance.id.slice(-8),
                dataEmissao: finance.metadata?.nfe_emission_date || finance.date,
                logoUrl: 'https://791barbershop.com/logo-791.jpg', // Logo padrão 791
                prestador: {
                    name: '791 SOLUÇÕES TECNOLÓGICAS LTDA',
                    razaoSocial: '791 SOLUÇÕES TECNOLÓGICAS LTDA',
                    cnpj: '61.887.941/0001-83',
                    endereco: 'RUA ADHEMAR DA SILVA, 1118 - SÃO JOSÉ/SC'
                },
                tomador: {
                    nome: tenant.name,
                    razaoSocial: tenant.razao_social || tenant.name,
                    cnpj: tenant.cnpj || tenant.cpf || 'Não informado',
                    endereco: tenant.address || 'Não informado'
                },
                servico: {
                    discriminacao: finance.description || 'Assinatura SaaS 791 Barber',
                    valorServicos: finance.value || 0
                }
            };
        } else {
            // PRESTADOR: Barbearia (Tenant)
            // TOMADOR: Cliente Final (Finance)
            dpsData = {
                id: finance.metadata?.nfe_id || finance.id.slice(-8),
                numero: finance.metadata?.nfe_id || finance.id.slice(-8),
                dataEmissao: finance.metadata?.nfe_emission_date || finance.date,
                logoUrl: tenant.logo_url,
                prestador: {
                    name: tenant.name,
                    razaoSocial: tenant.razao_social || tenant.name,
                    cnpj: tenant.cnpj,
                    endereco: tenant.address || 'Não informado'
                },
                tomador: {
                    nome: finance.customer_name || finance.metadata?.tomador_nome || 'Consumidor Final',
                    razaoSocial: finance.customer_name || finance.metadata?.tomador_nome || 'Consumidor Final',
                    cnpj: finance.customer_document || finance.metadata?.tomador_documento || 'Não informado',
                    endereco: finance.metadata?.tomador_endereco || 'Não informado'
                },
                servico: {
                    discriminacao: finance.description || 'Serviços Prestados',
                    valorServicos: finance.value || 0
                }
            };
        }

        // 4. Buscar configurações globais (CNAE/TaxCode)
        const { data: globalSettings } = await getSupabaseAdmin()
            .from('system_settings')
            .select('value')
            .eq('key', 'nfse_config')
            .single();

        const globalConfig = globalSettings?.value || {};

        // Injetar dados de DPS e códigos globais
        dpsData.cnae = globalConfig.cnae || '6202300';
        dpsData.taxCode = globalConfig.tax_code || '01.01.01';
        dpsData.dpsInfo = {
            numero: finance.metadata?.dps_number || '1',
            serie: finance.metadata?.dps_serie || '70000',
            dataEmissao: finance.metadata?.nfe_emission_date || finance.date || new Date().toISOString()
        };

        // Dados da Reforma Tributária (IBS/CBS) - NT 122/2025
        dpsData.reformaTributaria = {
            finNFSe: finance.metadata?.finNFSe || '0', // 0=Normal, 1=Substituição...
            indFinal: finance.metadata?.indFinal || '1', // 1=Sim (Geralmente serviços são consumo final)
            cIndOp: finance.metadata?.cIndOp || '010101', // Operação padrão
            ibsEstadual: {
                aliquota: 0.1,
                valor: (finance.value || 0) * 0.001
            },
            ibsMunicipal: {
                aliquota: 0,
                valor: 0
            },
            cbsFederal: {
                aliquota: 0.9,
                valor: (finance.value || 0) * 0.009
            }
        };

        console.log(`[API-NFSE-PDF-GET] Generating PDF Buffer (Tax Reform enabled)...`);
        const pdfBuffer = await pdfService.generateDanfseBuffer(dpsData);

        return new NextResponse(pdfBuffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename="danfse.pdf"',
                'Cache-Control': 'no-store, max-age=0'
            },
        });
    } catch (error: any) {
        console.error('[API-NFSE-PDF-GET] FATAL ERROR (v=5):', error.message);
        return NextResponse.json({ error: `Falha ao gerar PDF (v=5): ${error.message}` }, { status: 500 });
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
