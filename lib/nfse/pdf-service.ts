import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import path from 'path';

export class PdfService {
    /**
     * Gera um PDF (DANFSE) simplificado e retorna como Buffer.
     */
    public async generateDanfseBuffer(data: any): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            const fontPath = path.join(process.cwd(), 'public', 'noto-sans.ttf');
            const doc = new PDFDocument({
                margin: 30,
                size: 'A4'
            });
            const chunks: Buffer[] = [];
            const stream = new PassThrough();

            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', (err) => reject(err));

            doc.pipe(stream);
            doc.font(fontPath);

            // Fetch Logo if exists
            const logoUrl = data.prestador?.logoUrl || data.logoUrl || data.metadata?.logoUrl;
            if (logoUrl && logoUrl.startsWith('http')) {
                try {
                    const response = await fetch(logoUrl);
                    const arrayBuffer = await response.arrayBuffer();
                    const logoBuffer = Buffer.from(arrayBuffer);
                    doc.image(logoBuffer, 50, 40, { width: 60 });
                } catch (e) {
                    console.error('Failed to load logo in PDF:', e);
                }
            }

            // Header
            doc.fontSize(14).text('DANFSE - Documento Auxiliar da NFS-e', 0, 45, { align: 'center' });
            doc.fontSize(8).text(`Número: ${data.numero || data.nfe_id || 'PROVISÓRIO'}`, 450, 40);
            const dataEmissao = data.dataEmissao ? new Date(data.dataEmissao).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
            doc.text(`Emissão: ${dataEmissao}`, 450, 52);
            doc.moveDown(3);

            const drawBox = (y: number, height: number, label: string) => {
                doc.rect(50, y, 500, height).stroke();
                doc.fontSize(7).text(label, 55, y + 5);
            };

            // PRESTADOR
            let currentY = 80;
            drawBox(currentY, 60, 'PRESTADOR DE SERVIÇOS');
            doc.fontSize(10).text(data.prestador?.razaoSocial || data.prestador?.name || '791 SOLUCOES TECNOLOGICAS LTDA', 60, currentY + 18);
            doc.fontSize(9).text(`CNPJ: ${data.prestador?.cnpj || '61.887.941/0001-83'}`, 60, currentY + 32);
            doc.text(`${data.prestador?.endereco || 'SÃO JOSÉ - SC'}`, 60, currentY + 44);

            // TOMADOR
            currentY += 70;
            drawBox(currentY, 60, 'TOMADOR DE SERVIÇOS');
            const tomadorNome = data.tomador?.razaoSocial || data.tomador?.nome || data.tomadorNominal || 'Não Informado';
            const tomadorDoc = data.tomador?.cnpj || data.tomador?.cpf || data.tomadorDocumento || 'Não Informado';
            doc.fontSize(10).text(tomadorNome, 60, currentY + 18);
            doc.fontSize(9).text(`CPF/CNPJ: ${tomadorDoc}`, 60, currentY + 32);
            doc.text(`${data.tomador?.endereco || 'Consumidor Final'}`, 60, currentY + 44);

            // SERVIÇOS
            currentY += 70;
            drawBox(currentY, 200, 'DISCRIMINAÇÃO DOS SERVIÇOS');
            const discriminacao = data.servico?.discriminacao || data.discriminacao || data.servico_nome || 'Serviços Prestados';
            doc.fontSize(10).text(discriminacao, 60, currentY + 25, { width: 480, align: 'left' });

            // RODAPÉ / TOTAL
            const bottomY = currentY + 200;
            doc.rect(50, bottomY, 500, 40).stroke();
            const valor = data.servico?.valorServicos || data.valorTotal || data.valor || 0;
            doc.fontSize(12).text(`VALOR TOTAL DA NOTA: R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 60, bottomY + 15, { align: 'right', width: 480 });

            doc.fontSize(7).text('Este documento é uma representação simplificada da NFS-e.', 50, bottomY + 45, { align: 'center', width: 500 });

            doc.end();
        });
    }
}

export default new PdfService();
