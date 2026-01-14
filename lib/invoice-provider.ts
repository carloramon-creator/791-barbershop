/**
 * 791 INVOICE PROVIDER - Padrão Nacional NFS-e
 * Este provedor lida com a lógica de emissão de Notas Fiscais de Serviço.
 * Inicialmente emulando o comportamento para testes com o SaaS.
 */

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
        name: '791 SOLUCOES TECNOLOGICAS LTDA',
        cnpj: 'XX.XXX.XXX/0001-XX',
        im: 'XXXXXXX',
        municipioCode: '4205407' // Ex: Florianópolis
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
        console.log(`[INVOICE-PROVIDER] Iniciando emissão real para: ${invoice.customerName}`);

        try {
            const apiUrl = process.env.NFSE_API_URL || 'http://localhost:3333';
            const apiKey = process.env.NFSE_API_KEY || '791-secret-key';

            // 1. Autenticar
            const authRes = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey })
            });
            const authData = await authRes.json();
            if (!authRes.ok) throw new Error('Falha na autenticação com o provedor de NFS-e');

            const token = authData.token;

            // 2. Preparar dados para DPS
            const dpsData = {
                numero: invoice.id.slice(-8),
                serie: "1",
                dataEmissao: new Date().toISOString(),
                prestador: this.providerConfig,
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

            // 3. Emitir Nota
            const emitRes = await fetch(`${apiUrl}/nfse/emit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    dpsData,
                    privateKey: "PLACEHOLDER_PRIVATE_KEY", // Em prod, viria de cofre de senhas
                    publicCert: "PLACEHOLDER_CERT",
                    passphrase: "password"
                })
            });

            const emitData = await emitRes.json();
            if (!emitRes.ok) throw new Error(emitData.error || 'Erro ao emitir NFS-e');

            return {
                success: true,
                invoiceId: emitData.sefazResult?.id || dpsData.numero,
                status: 'authorized',
                pdfUrl: `${apiUrl}/nfse/pdf`, // A rota de PDF agora recebe o POST com dpsData
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
