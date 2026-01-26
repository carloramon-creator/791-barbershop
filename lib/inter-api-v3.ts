import * as https from 'https';
// Trigger Build: 11:41 BRT - PDF FIX 📄

interface InterConfigV3 {
    clientId: string;
    clientSecret: string;
    cert: string;
    key: string;
    accountNumber?: string;
}

export class InterAPIV3 {
    private config: InterConfigV3;
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;

    constructor(config: InterConfigV3) {
        this.config = config;
    }

    public async makeRequest(options: https.RequestOptions, body?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
                    } else {
                        reject({ statusCode: res.statusCode, message: data, headers: res.headers });
                    }
                });
            });
            req.on('error', (error) => { reject(error); });
            if (body) req.write(body);
            req.end();
        });
    }

    async getAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiresAt) return this.accessToken;

        const params = new URLSearchParams();
        params.append('client_id', this.config.clientId);
        params.append('client_secret', this.config.clientSecret);
        // TENTATIVA ROBUSTA: Pedir apenas o necessário para Recorrência se for esse o objetivo
        // 'rec.read rec.write' são essenciais. Se falhar, é bloqueio do banco.
        const scopes = 'pix.read pix.write rec.read rec.write boleto-cobranca.read boleto-cobranca.write';
        params.append('scope', scopes);
        params.append('grant_type', 'client_credentials');

        const body = params.toString();
        const options: https.RequestOptions = {
            hostname: 'cdpj.partners.bancointer.com.br',
            port: 443,
            path: '/oauth/v2/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body)
            },
            cert: this.config.cert,
            key: this.config.key,
            rejectUnauthorized: false,
            family: 4
        };

        const data = await this.makeRequest(options, body);
        this.accessToken = data.access_token;
        this.tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000;
        return this.accessToken!;
    }

    async createBilling(payload: any) {
        const token = await this.getAccessToken();
        const body = JSON.stringify(payload);

        const headers: any = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        };

        if (this.config.accountNumber) {
            headers['x-conta-corrente'] = this.config.accountNumber;
        }

        const options: https.RequestOptions = {
            hostname: 'cdpj.partners.bancointer.com.br',
            port: 443,
            path: '/cobranca/v3/cobrancas',
            method: 'POST',
            headers,
            cert: this.config.cert,
            key: this.config.key,
            rejectUnauthorized: false,
            family: 4
        };

        const response = await this.makeRequest(options, body);

        // Retorna imediatamente. Se for síncrono, vem os dados. Se for assíncrono, vem codigoSolicitacao.
        return response;
    }

    async getBillingBySolicitacao(codigoSolicitacao: string) {
        const token = await this.getAccessToken();
        const headers: any = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        };

        if (this.config.accountNumber) {
            headers['x-conta-corrente'] = this.config.accountNumber;
        }

        const options: https.RequestOptions = {
            hostname: 'cdpj.partners.bancointer.com.br',
            port: 443,
            path: `/cobranca/v3/cobrancas/${codigoSolicitacao}`,
            method: 'GET',
            headers,
            cert: this.config.cert,
            key: this.config.key,
            rejectUnauthorized: false,
            family: 4,
            timeout: 10000
        };

        return await this.makeRequest(options);
    }

    /**
     * Pix Automático: Cria uma location para QR Code
     */
    async createLocation(tipo: 'cob' | 'cobv' | 'rec' = 'rec') {
        const token = await this.getAccessToken();
        const body = JSON.stringify({ tipo });
        const headers: any = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        };

        if (this.config.accountNumber) {
            headers['x-conta-corrente'] = this.config.accountNumber;
        }

        const options: https.RequestOptions = {
            hostname: 'cdpj.partners.bancointer.com.br',
            port: 443,
            path: '/pix/v2/loc',
            method: 'POST',
            headers,
            cert: this.config.cert,
            key: this.config.key,
            rejectUnauthorized: false
        };
        return await this.makeRequest(options, body);
    }

    /**
     * Pix Automático: Cria um acordo de recorrência
     */
    /**
     * Pix Automático: Cria um acordo de recorrência
     */
    async createRecurrenceAgreement(payload: any) {
        const token = await this.getAccessToken();
        const body = JSON.stringify(payload);
        const headers: any = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        };

        if (this.config.accountNumber) {
            headers['x-conta-corrente'] = this.config.accountNumber;
        }

        const options: https.RequestOptions = {
            hostname: 'cdpj.partners.bancointer.com.br',
            port: 443,
            path: '/pix/v2/rec',
            method: 'POST',
            headers,
            cert: this.config.cert,
            key: this.config.key,
            rejectUnauthorized: false
        };
        return await this.makeRequest(options, body);
    }

    /**
     * Pix V2: Cobrança Imediata (Para Jornada 3)
     */
    async createPixImmediateBilling(payload: any) {
        const token = await this.getAccessToken();
        const body = JSON.stringify(payload);
        const headers: any = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        };

        if (this.config.accountNumber) {
            headers['x-conta-corrente'] = this.config.accountNumber;
        }

        const options: https.RequestOptions = {
            hostname: 'cdpj.partners.bancointer.com.br',
            port: 443,
            path: '/pix/v2/cob',
            method: 'POST',
            headers,
            cert: this.config.cert,
            key: this.config.key,
            rejectUnauthorized: false
        };
        return await this.makeRequest(options, body);
    }

    /**
     * Pix Recorrente: Cobrar parcela (Jornada 4)
     * Cria uma cobrança vinculada à recorrência
     */
    async createRecurrenceCharge(txid: string, payload: any) {
        const token = await this.getAccessToken();
        const body = JSON.stringify(payload);
        const headers: any = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        };

        if (this.config.accountNumber) {
            headers['x-conta-corrente'] = this.config.accountNumber;
        }

        const options: https.RequestOptions = {
            hostname: 'cdpj.partners.bancointer.com.br',
            port: 443,
            path: `/pix/v2/cob/${txid}`,
            method: 'PUT', // Jornada 4 menciona POST/cob ou PUT/cob/{txid}. PUT é idempotente.
            headers,
            cert: this.config.cert,
            key: this.config.key,
            rejectUnauthorized: false
        };
        return await this.makeRequest(options, body);
    }

    /**
     * Pix Automático: Consulta acordo de recorrência
     */
    async getRecurrenceAgreement(idRec: string, txid?: string) {
        const token = await this.getAccessToken();
        let path = `/pix/v2/rec/${idRec}`;
        if (txid) path += `?txid=${txid}`;

        const headers: any = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        };

        if (this.config.accountNumber) {
            headers['x-conta-corrente'] = this.config.accountNumber;
        }

        const options: https.RequestOptions = {
            hostname: 'cdpj.partners.bancointer.com.br',
            port: 443,
            path: path,
            method: 'GET',
            headers,
            cert: this.config.cert,
            key: this.config.key,
            rejectUnauthorized: false
        };
        return await this.makeRequest(options);
    }

    async listBillings(startDate: string, endDate: string, extraParams: string = '') {
        const token = await this.getAccessToken();
        const headers: any = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        };

        if (this.config.accountNumber) {
            headers['x-conta-corrente'] = this.config.accountNumber;
        }

        const options: https.RequestOptions = {
            hostname: 'cdpj.partners.bancointer.com.br',
            port: 443,
            path: `/cobranca/v3/cobrancas?dataInicial=${startDate}&dataFinal=${endDate}${extraParams}`,
            method: 'GET',
            headers,
            cert: this.config.cert,
            key: this.config.key,
            rejectUnauthorized: false,
            family: 4
        };

        return await this.makeRequest(options);
    }

    async registerWebhook(webhookUrl: string, type: 'boleto' | 'pix', pixKey?: string) {
        const token = await this.getAccessToken();
        let path = type === 'boleto' ? '/cobranca/v3/cobrancas/webhook' : `/pix/v2/webhook/${pixKey}`;
        const body = JSON.stringify({ webhookUrl });

        const headers: any = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        };

        if (this.config.accountNumber) {
            headers['x-conta-corrente'] = this.config.accountNumber;
        }

        const options: https.RequestOptions = {
            hostname: 'cdpj.partners.bancointer.com.br',
            port: 443,
            path: path,
            method: 'PUT',
            headers,
            cert: this.config.cert,
            key: this.config.key,
            rejectUnauthorized: false,
            family: 4
        };

        await this.makeRequest(options, body);
        return { success: true };
    }

    /**
     * Baixa o PDF de uma cobrança do Banco Inter
     * Tenta de forma inteligente: UUID -> Falha -> Busca NossoNumero -> Tenta NossoNumero
     */
    async getBillingPdf(identifier: string): Promise<Buffer> {
        const token = await this.getAccessToken();

        // Função auxiliar para tentar baixar
        const tryDownload = (id: string) => {
            const headers: any = {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json' // O Inter V3 retorna PDF em Base64 dentro de um JSON
            };

            if (this.config.accountNumber) {
                headers['x-conta-corrente'] = this.config.accountNumber;
            }

            const options: https.RequestOptions = {
                hostname: 'cdpj.partners.bancointer.com.br',
                port: 443,
                path: `/cobranca/v3/cobrancas/${id}/pdf`,
                method: 'GET',
                headers,
                cert: this.config.cert,
                key: this.config.key,
                rejectUnauthorized: false,
                family: 4
            };

            return new Promise<Buffer>((resolve, reject) => {
                const req = https.request(options, (res) => {
                    const chunks: any[] = [];
                    res.on('data', (chunk) => chunks.push(chunk));
                    res.on('end', () => {
                        const buffer = Buffer.concat(chunks);
                        if (res.statusCode === 200) {
                            console.log(`[INTER PDF] ✅ Sucesso com ID: ${id}`);

                            const contentType = res.headers['content-type'] || '';
                            if (contentType.includes('application/json')) {
                                try {
                                    const json = JSON.parse(buffer.toString());
                                    if (json.pdf) {
                                        console.log('[INTER PDF] 📄 Decodificando Base64...');
                                        resolve(Buffer.from(json.pdf, 'base64'));
                                        return;
                                    }
                                } catch (e) {
                                    console.error('[INTER PDF] Erro ao parsear JSON:', e);
                                }
                            }
                            resolve(buffer);
                        } else {
                            const errorBody = buffer.toString();
                            console.warn(`[INTER PDF WARN] Falha com ID: ${id} | Status: ${res.statusCode}`);
                            reject({ statusCode: res.statusCode, body: errorBody });
                        }
                    });
                });

                req.setTimeout(20000, () => {
                    req.destroy();
                    reject(new Error('Timeout'));
                });

                req.on('error', (e) => reject(e));
                req.end();
            });
        };

        try {
            console.log(`[INTER PDF] Tentativa 1 com ID: ${identifier}`);
            return await tryDownload(identifier);
        } catch (error: any) {
            // Se falhou e o identificador parece ser um UUID, vamos tentar descobrir o nossoNumero
            if (identifier.length > 20) { // UUID tem 36 chars, nossoNumero tem ~11-20
                console.log(`[INTER PDF] 🔄 Tentativa 1 falhou. Buscando dados da cobrança para descobrir NossoNumero...`);
                try {
                    // Busca dados completos
                    const details = await this.getBillingBySolicitacao(identifier);

                    // Tenta encontrar nossoNumero em vários lugares possíveis na resposta
                    const nossoNumero =
                        details.cobranca?.boleto?.nossoNumero ||
                        details.boleto?.nossoNumero ||
                        details.nossoNumero;

                    if (nossoNumero && nossoNumero !== identifier) {
                        console.log(`[INTER PDF] 💡 NossoNumero descoberto: ${nossoNumero}. Tentando novamente...`);
                        return await tryDownload(nossoNumero);
                    } else {
                        console.warn('[INTER PDF] ⚠️ Não foi possível encontrar um NossoNumero diferente nos detalhes.');
                    }
                } catch (detailError) {
                    console.error('[INTER PDF] ❌ Erro ao buscar detalhes da cobrança:', detailError);
                }
            }
            throw error; // Relança o erro original se a recuperação falhar
        }
    }
}
