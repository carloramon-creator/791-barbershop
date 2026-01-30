import { DPSData } from '../xml-service';
import signatureService from '../signature-service';
import soapService from '../soap-service';
import { NfseProvider, EmitResult } from './types';

export class NationalProvider implements NfseProvider {
    public async emit(data: DPSData, pfxBase64: string, passphrase: string, credentials?: any): Promise<EmitResult> {
        console.log(`[NationalProvider] Iniciando emissão para nota ${data.numero}`);

        // 1. Extrair certificados
        const { privateKey, certificate } = signatureService.extractFromPfx(pfxBase64, passphrase);
        const pfxBuffer = Buffer.from(pfxBase64.includes(',') ? pfxBase64.split(',')[1] : pfxBase64, 'base64');

        // 2. Gerar XML do DPS (padrão nacional já no xml-service)
        const xml = require('../xml-service').default.generateDPS(data);

        // 3. Assinar XML
        const signedXml = signatureService.signXML(xml, privateKey, certificate, `DPS${data.numero}`);

        // 4. Enviar via SOAP
        const urlSefaz = "https://hom.nfse.fazenda.gov.br/ServicosSefaz/NfseService.svc?wsdl";

        try {
            const result = await soapService.sendNfse(urlSefaz, signedXml, pfxBuffer, passphrase);
            return {
                success: true,
                invoiceId: (result as any).invoiceId || data.numero,
                status: 'authorized',
                message: 'Emitido via Provedor Nacional'
            };
        } catch (error: any) {
            throw new Error('Erro Provedor Nacional: ' + error.message);
        }
    }
}

export default new NationalProvider();
