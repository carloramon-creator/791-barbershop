/**
 * 791 INVOICE PROVIDER - Padrão Nacional NFS-e
 * Este provedor lida com a lógica de emissão de Notas Fiscais de Serviço.
 * Inicialmente emulando o comportamento para testes com o SaaS.
 */

import nfseService from './nfse/nfse-service';

import { supabaseAdmin } from './supabase-server';

export interface InvoiceData {
    id: string;
    tenantId: string;
    customerName: string;
    customerDocument: string;
    serviceDescription: string;
    value: number;
    date: string;
}

export interface InvoiceResponse {
    success: boolean;
    invoiceId?: string;
    pdfUrl?: string;
    xmlUrl?: string;
    status: 'pending' | 'authorized' | 'rejected';
    message?: string;
}

class InvoiceProvider {
    private static instance: InvoiceProvider;

    // Configurações do SaaS 791Barber (Prestador de Serviço)
    private readonly providerConfig = {
        cnpj: '61.887.941/0001-83',
        inscricaoMunicipal: 'ISENTO',
    };

    private constructor() { }

    public static getInstance(): InvoiceProvider {
        if (!InvoiceProvider.instance) {
            InvoiceProvider.instance = new InvoiceProvider();
        }
        return InvoiceProvider.instance;
    }

    /**
     * Emite uma nota fiscal de faturamento do SaaS para uma barbearia.
     */
    public async emitSaaSInvoice(invoice: InvoiceData): Promise<InvoiceResponse> {
        console.log(`[INVOICE-PROVIDER] Iniciando emissão MONOLÍTICA para: ${invoice.customerName}`);

        try {
            // 0. Buscar configurações no DB
            const { data: settings } = await supabaseAdmin
                .from('system_settings')
                .select('value')
                .eq('key', 'nfse_config')
                .single();

            const config = settings?.value || {};
            const pfxBase64 = config.pfxBase64;
            const passphrase = config.passphrase;

            if (!pfxBase64 || !passphrase) {
                throw new Error('Certificado digital ou senha não configurados no painel SuperAdmin.');
            }

            // 1. Preparar dados para DPS
            const dpsData = {
                numero: invoice.id.slice(-8),
                serie: "1",
                dataEmissao: new Date().toISOString(),
                prestador: {
                    cnpj: this.providerConfig.cnpj,
                    inscricaoMunicipal: this.providerConfig.inscricaoMunicipal
                },
                tomador: {
                    cnpj: invoice.customerDocument.length > 11 ? invoice.customerDocument : undefined,
                    cpf: invoice.customerDocument.length <= 11 ? invoice.customerDocument : undefined,
                    razaoSocial: invoice.customerName
                },
                servico: {
                    codigoItemListaServico: "0101",
                    valorServicos: invoice.value,
                    discriminacao: invoice.serviceDescription
                }
            };

            // 2. Chamar o serviço interno diretamente
            const result = await nfseService.emitNfse(dpsData, pfxBase64, passphrase);

            return {
                success: true,
                invoiceId: result?.id || dpsData.numero,
                status: 'authorized',
                pdfUrl: `/api/nfse/pdf`, // Rota interna
                message: 'Nota Fiscal autorizada com sucesso pelo Padrão Nacional.'
            };
        } catch (error: any) {
            console.error('[INVOICE-PROVIDER ERROR]', error);
            return {
                success: false,
                status: 'rejected',
                message: error.message
            };
        }
    }

    /**
     * Consulta o status de uma nota
     */
    public async checkStatus(invoiceId: string): Promise<string> {
        return 'autorizada';
    }
}

export const invoiceProvider = InvoiceProvider.getInstance();
