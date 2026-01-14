import xmlService, { DPSData } from './xml-service';
import signatureService from './signature-service';
import soapService from './soap-service';

export class NfseService {
    /**
     * Orquestra a emissão da NFS-e: Geração, Assinatura e Envio.
     */
    public async emitNfse(data: DPSData, pfxBase64: string, passphrase: string) {
        console.log(`[NfseService] Iniciando processo para nota ${data.numero}`);

        // 1. Extrair certificados do PFX
        const { privateKey, certificate } = signatureService.extractFromPfx(pfxBase64, passphrase);
        const pfxBuffer = Buffer.from(pfxBase64.includes(',') ? pfxBase64.split(',')[1] : pfxBase64, 'base64');

        // 2. Gerar XML do DPS
        const xml = xmlService.generateDPS(data);
        console.log(`[NfseService] XML DPS gerado`);

        // 3. Assinar XML
        const signedXml = signatureService.signXML(xml, privateKey, certificate, `DPS${data.numero}`);
        console.log(`[NfseService] XML assinado`);

        // 4. Enviar para SEFAZ (URLs oficiais NFS-e Nacional)
        // No futuro, isso pode vir da configuração do ambiente (homologação vs produção)
        const urlSefaz = "https://homologacao.nfse.rfb.gov.br/ServicosSefaz/NfseService.svc?wsdl";

        try {
            const result = await soapService.sendNfse(urlSefaz, signedXml, pfxBuffer, passphrase);
            console.log(`[NfseService] Resposta SEFAZ recebida com sucesso`);
            return result;
        } catch (error: any) {
            console.error('[NfseService] Erro no envio SOAP:', error.message);
            throw new Error('Erro na comunicação com a SEFAZ: ' + error.message);
        }
    }
}

export default new NfseService();
