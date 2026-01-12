import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { supabaseAdmin } from '@/lib/supabase-server';
import { invoiceProvider } from '@/lib/invoice-provider';

export async function OPTIONS(req: Request) {
    return addCorsHeaders(req, new NextResponse(null, { status: 200 }));
}

/**
 * Endpoint para emitir NFS-e de um pagamento específico.
 */
export async function POST(req: Request) {
    try {
        const { tenant, user } = await getCurrentUserAndTenant();
        const { financeId } = await req.json();

        if (!financeId) {
            return addCorsHeaders(req, NextResponse.json({ error: 'ID do pagamento não informado' }, { status: 400 }));
        }

        // 1. Buscar o registro financeiro
        const { data: finance, error: financeError } = await supabaseAdmin
            .from('finance')
            .select('*')
            .eq('id', financeId)
            .eq('tenant_id', tenant.id)
            .single();

        if (financeError || !finance) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Pagamento não localizado' }, { status: 404 }));
        }

        // 2. Verificar se já existe nota emitida
        if (finance.metadata?.nfe_id) {
            return addCorsHeaders(req, NextResponse.json({
                error: 'Já existe uma nota fiscal emitida para este pagamento',
                nfe_id: finance.metadata.nfe_id
            }, { status: 400 }));
        }

        // 3. Preparar dados para o provedor de Invoice
        const invoiceData = {
            id: finance.id,
            tenantId: tenant.id,
            customerName: tenant.name || 'Cliente SaaS',
            customerDocument: tenant.cnpj || tenant.cpf || 'Documento não informado',
            serviceDescription: finance.description || 'Assinatura SaaS 791 Barber',
            value: finance.value,
            date: finance.date
        };

        // 4. Chamar o provedor (NFS-e Nacional)
        const result = await invoiceProvider.emitSaaSInvoice(invoiceData);

        if (result.success) {
            // 5. Atualizar o registro financeiro com o ID da nota
            await supabaseAdmin.from('finance').update({
                metadata: {
                    ...finance.metadata,
                    nfe_id: result.invoiceId,
                    nfe_pdf_url: result.pdfUrl,
                    nfe_xml_url: result.xmlUrl,
                    nfe_status: result.status,
                    nfe_emission_date: new Date().toISOString()
                }
            }).eq('id', finance.id);

            return addCorsHeaders(req, NextResponse.json({
                message: 'NFS-e emitida com sucesso!',
                invoiceId: result.invoiceId,
                pdfUrl: result.pdfUrl
            }));
        } else {
            return addCorsHeaders(req, NextResponse.json({ error: result.message || 'Erro na emissão da nota' }, { status: 500 }));
        }

    } catch (error: any) {
        console.error('[EMIT-NFSE ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
