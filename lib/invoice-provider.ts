/**
 * 791 INVOICE PROVIDER - Padrão Nacional NFS-e
 * Este provedor lida com a lógica de emissão de Notas Fiscais de Serviço.
 * Inicialmente emulando o comportamento para testes com o SaaS.
 */

import nfseService from './nfse/nfse-service';
import { getSupabaseAdmin } from './supabase-server';

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
    public async emitSaaSInvoice(invoice: InvoiceData, skipAutoCheck: boolean = true): Promise<InvoiceResponse> {
        console.log(`[INVOICE-PROVIDER] Iniciando emissão DIRETA para: ${invoice.customerName}`);

        try {
            // 0. Buscar configurações no DB
            const { data: settings } = await getSupabaseAdmin()
                .from('system_settings')
                .select('value')
                .eq('key', 'nfse_config')
                .single();

            const config = settings?.value || {};
            const pfxBase64 = config.pfxBase64;
            const passphrase = config.passphrase;

            if (!skipAutoCheck && !config.auto_emit) {
                console.log('[INVOICE-PROVIDER] Emissão automática desativada nas configurações.');
                return { success: false, status: 'pending', message: 'Emissão automática desativada.' };
            }

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

            // 2. Chamar o serviço de NFS-e diretamente (mesmo processo)
            console.log(`[INVOICE-PROVIDER] Emitindo via NfseService...`);
            const result = await nfseService.emitNfse(dpsData, pfxBase64, passphrase);

            return {
                success: true,
                invoiceId: (result as any).invoiceId || dpsData.numero,
                status: 'authorized',
                pdfUrl: `/api/nfse/pdf`,
                message: 'Nota Fiscal autorizada com sucesso via Provedor 791 (Nacional).'
            };
        } catch (error: any) {
            console.error('[INVOICE-PROVIDER ERROR]', error);
            return {
                success: false,
                status: 'rejected',
                message: error.message || 'Falha na emissão da NFS-e'
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
