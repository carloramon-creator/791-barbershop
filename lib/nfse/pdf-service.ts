import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import path from 'path';

export class PdfService {
    /**
     * Gera um PDF (DANFSE) simplificado e retorna como Buffer.
     */
    public async generateDanfseBuffer(data: any): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                const fontPath = path.join(process.cwd(), 'public', 'noto-sans.ttf');
                const doc = new PDFDocument({
                    margin: 30,
                    size: 'A4',
                    info: {
                        Title: 'DANFSE - Documento Auxiliar da NFS-e',
                        Author: '791 Barber System'
                    }
                });
                const chunks: Buffer[] = [];
                const stream = new PassThrough();

                stream.on('data', (chunk) => chunks.push(chunk));
                stream.on('end', () => resolve(Buffer.concat(chunks)));
                stream.on('error', (err) => reject(err));

                doc.pipe(stream);

                // Garantir fonte (segurança extra contra ENOENT se o path mudar)
                let usingCustomFont = false;
                try {
                    doc.font(fontPath);
                    usingCustomFont = true;
                } catch (e) {
                    console.warn('[PDF-SERVICE] Custom font not found, using default Helvetica');
                    doc.font('Helvetica');
                    usingCustomFont = false;
                }

                // Carregamento de Logo com Timeout e Robustez
                const logoUrl = data.logoUrl || data.prestador?.logoUrl;
                if (logoUrl && logoUrl.startsWith('http')) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

                        const response = await fetch(logoUrl, { signal: controller.signal });
                        clearTimeout(timeoutId);

                        if (response.ok) {
                            const arrayBuffer = await response.arrayBuffer();
                            const logoBuffer = Buffer.from(arrayBuffer);
                            // Se a logo for detectada mas o buffer for vazio/inválido, o PDFKIT pode crashar.
                            if (logoBuffer.length > 0) {
                                doc.image(logoBuffer, 50, 40, { width: 60 });
                            }
                        }
                    } catch (e) {
                        console.error('[PDF-SERVICE] Skip logo due to error:', e instanceof Error ? e.message : 'Unknown');
                    }
                }

                const boldFont = usingCustomFont ? fontPath : 'Helvetica-Bold';
                const normalFont = usingCustomFont ? fontPath : 'Helvetica';

                // Header Principal
                doc.fontSize(14).font(boldFont).text('DANFSE - Documento Auxiliar da NFS-e', 0, 45, { align: 'center' });
                doc.fontSize(8).font(normalFont);
                doc.text(`Número da Nota: ${data.numero || data.nfe_id || 'PROVISÓRIO'}`, 400, 40, { width: 150, align: 'right' });

                const dataEmissao = data.dataEmissao ? new Date(data.dataEmissao).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
                doc.text(`Data de Emissão: ${dataEmissao}`, 400, 52, { width: 150, align: 'right' });

                doc.moveDown(3);

                const drawBox = (y: number, height: number, label: string) => {
                    doc.rect(50, y, 500, height).strokeColor('#333333').lineWidth(1).stroke();
                    doc.fillColor('#666666').fontSize(7).text(label.toUpperCase(), 55, y + 5);
                    doc.fillColor('#000000'); // Volta para preto
                };

                // SEÇÃO 1: PRESTADOR DE SERVIÇOS
                let currentY = 100;
                drawBox(currentY, 65, 'PRESTADOR DE SERVIÇOS');

                const prestador = data.prestador || {};
                doc.fontSize(10).font(boldFont).text(prestador.razaoSocial || prestador.name || 'EMISSOR NÃO IDENTIFICADO', 60, currentY + 18);
                doc.fontSize(9).font(normalFont);
                doc.text(`CNPJ: ${prestador.cnpj || 'Não informado'}`, 60, currentY + 34);
                doc.text(`Endereço: ${prestador.endereco || 'Não informado'}`, 60, currentY + 46);

                // SEÇÃO 2: TOMADOR DE SERVIÇOS
                currentY += 75;
                drawBox(currentY, 65, 'TOMADOR DE SERVIÇOS');

                const tomador = data.tomador || {};
                doc.fontSize(10).font(boldFont).text(tomador.razaoSocial || tomador.nome || 'CONSUMIDOR NÃO IDENTIFICADO', 60, currentY + 18);
                doc.fontSize(9).font(normalFont);
                doc.text(`CPF/CNPJ: ${tomador.cnpj || tomador.cpf || 'Não informado'}`, 60, currentY + 34);
                doc.text(`Endereço: ${tomador.endereco || 'Não informado'}`, 60, currentY + 46);

                // SEÇÃO 3: DISCRIMINAÇÃO DOS SERVIÇOS
                currentY += 75;
                drawBox(currentY, 250, 'DISCRIMINAÇÃO DOS SERVIÇOS');

                const servico = data.servico || {};
                const discriminacao = servico.discriminacao || data.discriminacao || 'Prestação de serviços diversos.';

                doc.fontSize(10).font(normalFont).text(discriminacao, 60, currentY + 25, {
                    width: 480,
                    align: 'left',
                    lineGap: 2
                });

                // VALOR TOTAL
                const bottomY = currentY + 250;
                doc.rect(50, bottomY, 500, 45).stroke();

                const valor = servico.valorServicos || data.valorTotal || data.valor || 0;
                doc.fontSize(14).font(boldFont);
                doc.text(`VALOR TOTAL DA NOTA: R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 60, bottomY + 15, {
                    align: 'right',
                    width: 480
                });

                // RODAPÉ FINAL
                doc.fontSize(7).font(normalFont).fillColor('#999999');
                doc.text('Este documento é uma representação simplificada da NFS-e (DANFSE). Reservado ao uso administrativo internamente pela plataforma.', 50, bottomY + 55, {
                    align: 'center',
                    width: 500
                });

                doc.end();
            } catch (err) {
                console.error('[PDF-SERVICE] Critical Failure:', err);
                reject(err);
            }
        });
    }
}

export default new PdfService();
