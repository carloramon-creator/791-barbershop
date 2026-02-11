import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import path from 'path';

export class PdfService {
    /**
     * Gera um PDF (DANFSE) simplificado e retorna como Buffer.
     */
    public async generateDanfseBuffer(data: any): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const fontPath = path.join(process.cwd(), 'public', 'noto-sans.ttf');
            const doc = new PDFDocument({
                margin: 50,
                font: fontPath
            });
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

            const tomadorNome = data.tomador?.razaoSocial || data.tomador?.nome || data.tomadorNominal || 'Não Informado';
            const tomadorDoc = data.tomador?.cnpj || data.tomador?.cpf || data.tomadorDocumento || 'Não Informado';

            doc.fontSize(10).text(`Nome/Razão Social: ${tomadorNome}`, 60, currentY + 22);
            doc.text(`CNPJ/CPF: ${tomadorDoc}`, 60, currentY + 34);
            doc.moveDown(5);

            // Serviços
            const serviceY = doc.y;
            doc.rect(50, serviceY, 500, 100).stroke();
            doc.fontSize(8).text('DISCRIMINAÇÃO DOS SERVIÇOS', 60, serviceY + 10);

            const discriminacao = data.servico?.discriminacao || data.discriminacao || 'Serviços Prestados';
            const valor = data.servico?.valorServicos || data.valorTotal || 0;

            doc.fontSize(10).text(discriminacao, 60, serviceY + 25, { width: 480 });
            doc.moveDown(8);

            // Valores
            doc.fontSize(12).text(`VALOR TOTAL: R$ ${Number(valor).toFixed(2).replace('.', ',')}`, { align: 'right' });

            doc.end();
        });
    }
}

export default new PdfService();
