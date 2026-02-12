import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { notoSansBase64 } from './noto-sans-base64';

export class PdfService {
    /**
     * Gera um PDF (DANFSE) simplificado e retorna como Buffer.
     */
    public async generateDanfseBuffer(data: any): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                // Decodifica a fonte embutida (Base64 -> Buffer)
                const fontBuffer = Buffer.from(notoSansBase64, 'base64');

                // IMPORTANTE: Passamos a fonte diretamente no construtor.
                // Isso evita que o PDFKit tente carregar "Helvetica" (que depende de arquivos no disco)
                // como fonte padrão durante a inicialização.
                const doc = new PDFDocument({
                    margin: 30,
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

                // NUNCA chamar doc.font() com nomes de fontes padrão (Helvetica, Times, etc)
                // Usamos sempre a nossa fonte já carregada.
                // doc.font(fontBuffer); // Nem precisa mais pois já foi no construtor

                // Carregamento de Logo com Timeout e Robustez
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
                                doc.image(logoBuffer, 50, 40, { width: 60 });
                            }
                        }
                    } catch (e) {
                        console.error('[PDF-SERVICE] Skip logo due to error:', e instanceof Error ? e.message : 'Unknown');
                    }
                }

                // Header Principal
                doc.fontSize(14).text('DANFSE - Documento Auxiliar da NFS-e', 0, 45, { align: 'center' });

                doc.fontSize(8);
                doc.text(`Número da Nota: ${data.numero || data.nfe_id || 'PROVISÓRIO'}`, 400, 40, { width: 150, align: 'right' });

                const dataEmissao = data.dataEmissao ? new Date(data.dataEmissao).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
                doc.text(`Data de Emissão: ${dataEmissao}`, 400, 52, { width: 150, align: 'right' });

                doc.moveDown(3);

                const drawBox = (y: number, height: number, label: string) => {
                    doc.rect(50, y, 500, height).strokeColor('#333333').lineWidth(1).stroke();
                    doc.fillColor('#666666').fontSize(7).text(label.toUpperCase(), 55, y + 5);
                    doc.fillColor('#000000');
                };

                // SEÇÃO 1: PRESTADOR DE SERVIÇOS
                let currentY = 100;
                drawBox(currentY, 65, 'PRESTADOR DE SERVIÇOS');
                const prestador = data.prestador || {};
                doc.fontSize(10).text(prestador.razaoSocial || prestador.name || 'EMISSOR NÃO IDENTIFICADO', 60, currentY + 18);
                doc.fontSize(9).text(`CNPJ: ${prestador.cnpj || 'Não informado'}`, 60, currentY + 34);
                doc.text(`Endereço: ${prestador.endereco || 'Não informado'}`, 60, currentY + 46);

                // SEÇÃO 2: TOMADOR DE SERVIÇOS
                currentY += 75;
                drawBox(currentY, 65, 'TOMADOR DE SERVIÇOS');
                const tomador = data.tomador || {};
                doc.fontSize(10).text(tomador.razaoSocial || tomador.nome || 'CONSUMIDOR NÃO IDENTIFICADO', 60, currentY + 18);
                doc.fontSize(9).text(`CPF/CNPJ: ${tomador.cnpj || tomador.cpf || 'Não informado'}`, 60, currentY + 34);
                doc.text(`Endereço: ${tomador.endereco || 'Não informado'}`, 60, currentY + 46);

                // SEÇÃO 3: DISCRIMINAÇÃO DOS SERVIÇOS
                currentY += 75;
                drawBox(currentY, 250, 'DISCRIMINAÇÃO DOS SERVIÇOS');
                const servico = data.servico || {};
                const discriminacao = servico.discriminacao || data.discriminacao || 'Prestação de serviços diversos.';
                doc.fontSize(10).text(discriminacao, 60, currentY + 25, { width: 480, align: 'left', lineGap: 2 });

                // VALOR TOTAL
                const bottomY = currentY + 250;
                doc.rect(50, bottomY, 500, 45).stroke();
                const valor = servico.valorServicos || data.valorTotal || data.valor || 0;
                doc.fontSize(14).text(`VALOR TOTAL DA NOTA: R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 60, bottomY + 15, { align: 'right', width: 480 });

                // RODAPÉ FINAL
                doc.fontSize(7).fillColor('#999999').text('Este documento é uma representação simplificada da NFS-e (DANFSE). Reservado ao uso administrativo internamente pela plataforma.', 50, bottomY + 55, { align: 'center', width: 500 });

                doc.end();
            } catch (err) {
                console.error('[PDF-SERVICE] Critical Failure:', err);
                reject(err);
            }
        });
    }
}

export default new PdfService();
