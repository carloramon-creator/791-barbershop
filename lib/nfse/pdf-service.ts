import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

export class PdfService {
    /**
     * Gera um PDF (DANFSE) simplificado e retorna como Buffer.
     */
    public async generateDanfseBuffer(data: any): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const chunks: Buffer[] = [];
            const stream = new PassThrough();

            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', (err) => reject(err));

            doc.pipe(stream);

            // Cabeçalho
            doc.fontSize(16).text('DANFSE - Documento Auxiliar da NFS-e', { align: 'center' });
            doc.moveDown();
            doc.fontSize(10).text(`Número: ${data.numero}`);
            doc.text(`Data de Emissão: ${new Date(data.dataEmissao).toLocaleString('pt-BR')}`);
            doc.moveDown();

            // Prestador
            doc.rect(50, doc.y, 500, 60).stroke();
            doc.fontSize(8).text('PRESTADOR DE SERVIÇOS', 60, doc.y + 10);
            doc.fontSize(10).text(`${data.prestador?.name || '791 SOLUCOES TECNOLOGICAS LTDA'}`, 60, doc.y + 2);
            doc.text(`CNPJ: ${data.prestador?.cnpj || '61.887.941/0001-83'}`, 60, doc.y + 2);
            doc.moveDown(4);

            // Tomador
            const currentY = doc.y;
            doc.rect(50, currentY, 500, 60).stroke();
            doc.fontSize(8).text('TOMADOR DE SERVIÇOS', 60, currentY + 10);
            doc.fontSize(10).text(`Nome/Razão Social: ${data.tomador.razaoSocial}`, 60, currentY + 22);
            doc.text(`CNPJ/CPF: ${data.tomador.cnpj || data.tomador.cpf}`, 60, currentY + 34);
            doc.moveDown(5);

            // Serviços
            const serviceY = doc.y;
            doc.rect(50, serviceY, 500, 100).stroke();
            doc.fontSize(8).text('DISCRIMINAÇÃO DOS SERVIÇOS', 60, serviceY + 10);
            doc.fontSize(10).text(data.servico.discriminacao, 60, serviceY + 25, { width: 480 });
            doc.moveDown(8);

            // Valores
            doc.fontSize(12).text(`VALOR TOTAL: R$ ${Number(data.servico.valorServicos).toFixed(2).replace('.', ',')}`, { align: 'right' });

            doc.end();
        });
    }
}

export default new PdfService();
