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
        console.log(`[INVOICE-PROVIDER] Iniciando emissão MONOLÍTICA para: ${invoice.customerName}`);

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

            // 2. Chamar o microserviço de NFS-e
            console.log(`[INVOICE-PROVIDER] Delegando emissão para o microserviço: http://localhost:3333/nfse/emit`);

            // Extrair chaves para o microserviço (que espera privateKey e publicCert separados)
            const { privateKey, certificate: publicCert } = (await import('./nfse/signature-service')).default.extractFromPfx(pfxBase64, passphrase);

            const providerUrl = process.env.NFSE_PROVIDER_URL || 'http://localhost:3333';
            const providerSecret = process.env.NFSE_PROVIDER_SECRET || 'sua_chave_secreta_aqui';

            // Gerar token simples para o microserviço
            const jwt = (await import('jsonwebtoken')).default;
            const token = jwt.sign({ service: 'frontend-owner' }, providerSecret);

            const response = await fetch(`${providerUrl}/nfse/emit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    dpsData,
                    privateKey,
                    publicCert,
                    pfxBase64,
                    passphrase
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro na comunicação com o microserviço de NFS-e');
            }

            const result = await response.json();

            return {
                success: true,
                invoiceId: result.invoiceId || dpsData.numero,
                status: 'authorized',
                pdfUrl: `/api/nfse/pdf`, // A rota de download ainda pode ser via proxy ou direta
                message: 'Nota Fiscal autorizada com sucesso via Microserviço 791.'
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
