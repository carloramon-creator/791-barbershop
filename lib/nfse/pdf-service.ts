import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { notoSansBase64 } from './noto-sans-base64';

export class PdfService {
    /**
     * Deduplica palavras repetidas em uma string (ex: "Plano Plano" -> "Plano")
     */
    private deduplicateText(text: string): string {
        if (!text) return '';
        const words = text.split(/\s+/);
        const result: string[] = [];
        for (let i = 0; i < words.length; i++) {
            if (i === 0 || words[i].toLowerCase() !== words[i - 1].toLowerCase()) {
                result.push(words[i]);
            }
        }
        return result.join(' ');
    }

    /**
     * Gera um PDF (DANFSE) simplificado e retorna como Buffer.
     */
    public async generateDanfseBuffer(data: any): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                const fontBuffer = Buffer.from(notoSansBase64, 'base64');
                const doc = new PDFDocument({
                    margin: 40,
                    size: 'A4',
                    font: fontBuffer as any,
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

                // --- HEADER DESIGN ---
                // Logo (opcional)
                const logoUrl = data.logoUrl || data.prestador?.logoUrl;
                if (logoUrl && logoUrl.startsWith('http')) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 3000);
                        const response = await fetch(logoUrl, { signal: controller.signal });
                        clearTimeout(timeoutId);
                        if (response.ok) {
                            const arrayBuffer = await response.arrayBuffer();
                            const logoBuffer = Buffer.from(arrayBuffer);
                            if (logoBuffer.length > 0) {
                                doc.image(logoBuffer, 40, 40, { width: 50 });
                            }
                        }
                    } catch (e) {
                        console.error('[PDF-SERVICE] Logo error skipped');
                    }
                }

                // Título e Identificação à Direita (Separados para não sobrepor)
                doc.fillColor('#000000').fontSize(16).text('DANFSE', 0, 40, { align: 'center' });
                doc.fontSize(10).text('Doc. Auxiliar da NFS-e', 0, 58, { align: 'center' });

                doc.fontSize(8);
                doc.text(`Nº Nota: ${data.numero || data.nfe_id || 'PROVISÓRIO'}`, 400, 40, { width: 155, align: 'right' });
                const dataEmissao = data.dataEmissao ? new Date(data.dataEmissao).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
                doc.text(`Emissão: ${dataEmissao}`, 400, 52, { width: 155, align: 'right' });

                const drawSectionHeader = (y: number, label: string) => {
                    doc.rect(40, y, 515, 15).fill('#f5f5f5');
                    doc.fillColor('#333333').fontSize(7).text(label.toUpperCase(), 45, y + 4);
                    doc.fillColor('#000000');
                };

                const drawBox = (y: number, height: number, label: string) => {
                    doc.rect(40, y, 515, height).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
                    drawSectionHeader(y, label);
                };

                // --- SEÇÃO 1: PRESTADOR ---
                let currentY = 90;
                drawBox(currentY, 65, 'Identificação do Prestador de Serviços');
                const prestador = data.prestador || {};
                doc.fontSize(10).text(prestador.razaoSocial || prestador.name || '791 SOLUÇÕES TECNOLÓGICAS LTDA', 50, currentY + 22);
                doc.fontSize(9);
                doc.text(`CNPJ: ${prestador.cnpj || '61.887.941/0001-83'}`, 50, currentY + 36);
                doc.text(`Endereço: ${prestador.endereco || 'Rua João Pio Duarte Silva, 1221 - Florianópolis/SC'}`, 50, currentY + 48, { width: 490 });

                // --- SEÇÃO 2: TOMADOR ---
                currentY += 75;
                drawBox(currentY, 65, 'Identificação do Tomador de Serviços');
                const tomador = data.tomador || {};
                doc.fontSize(10).text(tomador.razaoSocial || tomador.nome || 'CONSUMIDOR NÃO IDENTIFICADO', 50, currentY + 22);
                doc.fontSize(9);
                doc.text(`CPF/CNPJ: ${tomador.cnpj || tomador.cpf || 'Não informado'}`, 50, currentY + 36);
                doc.text(`Endereço: ${tomador.endereco || 'Não informado'}`, 50, currentY + 48, { width: 490 });

                // --- SEÇÃO 3: SERVIÇOS ---
                currentY += 75;
                drawBox(currentY, 200, 'Discriminação dos Serviços');
                const servico = data.servico || {};
                const discriminacaoOriginal = servico.discriminacao || data.discriminacao || 'Prestação de serviços diversos.';
                const discriminacao = this.deduplicateText(discriminacaoOriginal);

                doc.fontSize(10).text(discriminacao, 50, currentY + 30, {
                    width: 490,
                    align: 'left',
                    lineGap: 4
                });

                // --- VALORES ---
                const bottomY = currentY + 200;
                doc.rect(40, bottomY, 515, 45).strokeColor('#e5e7eb').stroke();

                const valor = servico.valorServicos || data.valorTotal || data.valor || 0;
                doc.fontSize(12).text('VALOR TOTAL DA NOTA', 50, bottomY + 15);
                doc.fontSize(16).text(`R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 40, bottomY + 12, {
                    align: 'right',
                    width: 500
                });

                // Rodapé
                doc.fontSize(7).fillColor('#9b9b9b');
                doc.text('Este documento é uma representação simplificada da NFS-e (DANFSE) gerada automaticamente pelo sistema 791 Barber.', 40, bottomY + 55, {
                    align: 'center',
                    width: 515
                });

                doc.end();
            } catch (err) {
                console.error('[PDF-SERVICE] Error:', err);
                reject(err);
            }
        });
    }
}

export default new PdfService();
