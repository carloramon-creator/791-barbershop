import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import path from 'path';
import fs from 'fs';

export class PdfService {
    /**
     * Gera um PDF (DANFSE) simplificado e retorna como Buffer.
     */
    public async generateDanfseBuffer(data: any): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                // Tenta encontrar a fonte em caminhos comuns no Next.js / Railway
                const fontFallbacks = [
                    path.join(process.cwd(), 'public', 'noto-sans.ttf'),
                    path.join(process.cwd(), '..', 'public', 'noto-sans.ttf'),
                    path.join(process.cwd(), 'frontend-owner', 'public', 'noto-sans.ttf'),
                    path.join(__dirname, '..', '..', '..', 'public', 'noto-sans.ttf')
                ];

                let fontBuffer: Buffer | null = null;
                let usedPath = '';

                for (const fPath of fontFallbacks) {
                    try {
                        if (fs.existsSync(fPath)) {
                            fontBuffer = fs.readFileSync(fPath);
                            usedPath = fPath;
                            break;
                        }
                    } catch (e) { }
                }

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

                // Garantir fonte via Buffer (mais robusto no Next.js que passar o path direto)
                let usingCustomFont = false;
                if (fontBuffer) {
                    try {
                        doc.font(fontBuffer);
                        usingCustomFont = true;
                        console.log(`[PDF-SERVICE] Loaded font from buffer: ${usedPath}`);
                    } catch (e) {
                        console.error('[PDF-SERVICE] Failed to set font from buffer:', e);
                    }
                }

                if (!usingCustomFont) {
                    console.warn('[PDF-SERVICE] Custom font not available, using default Helvetica');
                    try {
                        doc.font('Helvetica');
                    } catch (e) {
                        console.error('[PDF-SERVICE] CRITICAL: Helvetica font loading failed as well!');
                        throw new Error('Falha crítica ao carregar fontes do PDF.');
                    }
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
                            if (logoBuffer.length > 0) {
                                doc.image(logoBuffer, 50, 40, { width: 60 });
                            }
                        }
                    } catch (e) {
                        console.error('[PDF-SERVICE] Skip logo due to error:', e instanceof Error ? e.message : 'Unknown');
                    }
                }

                // Determinamos as fontes a serem usadas (TTF embutido ou Helvetica default)
                // Se usingCustomFont for true, usamos o fontBuffer (já setado no doc.font)
                // Se usingCustomFont for false, o doc já está com Helvetica.
                // Mas PDFKit permite carregar novamente se necessário.

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
                    doc.fillColor('#000000'); // Volta para preto
                };

                // SEÇÃO 1: PRESTADOR DE SERVIÇOS
                let currentY = 100;
                drawBox(currentY, 65, 'PRESTADOR DE SERVIÇOS');

                const prestador = data.prestador || {};
                doc.fontSize(10).text(prestador.razaoSocial || prestador.name || 'EMISSOR NÃO IDENTIFICADO', 60, currentY + 18);
                doc.fontSize(9);
                doc.text(`CNPJ: ${prestador.cnpj || 'Não informado'}`, 60, currentY + 34);
                doc.text(`Endereço: ${prestador.endereco || 'Não informado'}`, 60, currentY + 46);

                // SEÇÃO 2: TOMADOR DE SERVIÇOS
                currentY += 75;
                drawBox(currentY, 65, 'TOMADOR DE SERVIÇOS');

                const tomador = data.tomador || {};
                doc.fontSize(10).text(tomador.razaoSocial || tomador.nome || 'CONSUMIDOR NÃO IDENTIFICADO', 60, currentY + 18);
                doc.fontSize(9);
                doc.text(`CPF/CNPJ: ${tomador.cnpj || tomador.cpf || 'Não informado'}`, 60, currentY + 34);
                doc.text(`Endereço: ${tomador.endereco || 'Não informado'}`, 60, currentY + 46);

                // SEÇÃO 3: DISCRIMINAÇÃO DOS SERVIÇOS
                currentY += 75;
                drawBox(currentY, 250, 'DISCRIMINAÇÃO DOS SERVIÇOS');

                const servico = data.servico || {};
                const discriminacao = servico.discriminacao || data.discriminacao || 'Prestação de serviços diversos.';

                doc.fontSize(10).text(discriminacao, 60, currentY + 25, {
                    width: 480,
                    align: 'left',
                    lineGap: 2
                });

                // VALOR TOTAL
                const bottomY = currentY + 250;
                doc.rect(50, bottomY, 500, 45).stroke();

                const valor = servico.valorServicos || data.valorTotal || data.valor || 0;
                doc.fontSize(14);
                doc.text(`VALOR TOTAL DA NOTA: R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 60, bottomY + 15, {
                    align: 'right',
                    width: 480
                });

                // RODAPÉ FINAL
                doc.fontSize(7).fillColor('#999999');
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
