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
     * Gera um PDF (DANFSE) oficial simplificado e retorna como Buffer.
     */
    public async generateDanfseBuffer(data: any): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                const fontBuffer = Buffer.from(notoSansBase64, 'base64');
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

                // Configurações Globais
                const pageWidth = 535; // Largura útil (595 - 60)
                const startX = 30;
                let y = 30;

                // --- HELPER PARA DESENHAR BOXES COM GRADES ---
                const drawTableBox = (yStart: number, height: number, title: string) => {
                    doc.rect(startX, yStart, pageWidth, height).strokeColor('#000000').lineWidth(0.5).stroke();
                    if (title) {
                        doc.fillColor('#000000').fontSize(7).text(title.toUpperCase(), startX + 5, yStart + 3, { bold: true } as any);
                        doc.moveTo(startX, yStart + 12).lineTo(startX + pageWidth, yStart + 12).stroke();
                    }
                };

                const drawLabelValue = (x: number, y: number, width: number, label: string, value: string, fontSizeVal = 8) => {
                    doc.fillColor('#444444').fontSize(6).text(label.toUpperCase(), x, y, { width, align: 'left' });
                    doc.fillColor('#000000').fontSize(fontSizeVal).text(value || '-', x, y + 8, { width: width - 2, align: 'left' });
                };

                // --- HEADER SUPERIOR ---
                doc.rect(startX, y, pageWidth, 40).stroke();
                // Logo NFS-e (Simulado)
                doc.fontSize(14).text('NFS-e', startX + 10, y + 10, { width: 100 });
                doc.fontSize(6).text('Nota Fiscal de Serviço eletrônica', startX + 10, y + 25);

                // Centro: Identificação
                doc.fontSize(10).text('DANFSe v1.0', startX, y + 10, { align: 'center', width: pageWidth });
                doc.fontSize(9).text('Documento Auxiliar da NFS-e', startX, y + 22, { align: 'center', width: pageWidth });

                // Direita: Prefeitura (Simulado)
                doc.fontSize(8).text('PREFEITURA MUNICIPAL DE', startX + 380, y + 10, { width: 150 });
                doc.fontSize(8).text(data.municipioPrefeitura || 'FLORIANÓPOLIS', startX + 380, y + 20, { width: 150 });

                y += 45;

                // --- CHAVE DE ACESSO ---
                doc.rect(startX, y, pageWidth, 55).stroke();
                drawLabelValue(startX + 5, y + 5, 400, 'Chave de Acesso da NFS-e', data.chaveAcesso || '420540722623220400018700000000000000926021489032325', 9);

                doc.moveTo(startX + 420, y).lineTo(startX + 420, y + 55).stroke(); // Divisor QR Code
                doc.rect(startX + 440, y + 5, 45, 45).stroke(); // Placeholder QR Code
                doc.fontSize(5).text('Autenticidade via QR Code', startX + 425, y + 50, { width: 80, align: 'center' });

                drawLabelValue(startX + 5, y + 30, 80, 'Número da NFS-e', data.numero || data.nfe_id || '1', 10);
                drawLabelValue(startX + 100, y + 30, 100, 'Competência da NFS-e', data.dataEmissao?.slice(0, 10) || '09/02/2026');
                drawLabelValue(startX + 220, y + 30, 150, 'Data e Hora da emissão da NFS-e', data.dataEmissao || '09/02/2026 14:01:16');

                y += 60;

                // --- SEÇÃO 1: EMITENTE ---
                drawTableBox(y, 70, 'Emitente da NFS-e / Prestador do Serviço');
                const prestador = data.prestador || {};
                drawLabelValue(startX + 5, y + 15, 200, 'Nome / Nome Empresarial', prestador.razaoSocial || prestador.name || '791 SOLUÇÕES TECNOLÓGICAS LTDA');
                drawLabelValue(startX + 250, y + 15, 120, 'CNPJ / CPF / NIF', prestador.cnpj || '61.887.941/0001-83');
                drawLabelValue(startX + 380, y + 15, 80, 'Inscrição Municipal', '-');
                drawLabelValue(startX + 470, y + 15, 60, 'Telefone', '(48) 9999-9999');

                drawLabelValue(startX + 5, y + 38, 300, 'Endereço', prestador.endereco || 'RUA JOAO PIO DUARTE SILVA, 1221');
                drawLabelValue(startX + 310, y + 38, 100, 'Município', 'Florianópolis - SC');
                drawLabelValue(startX + 420, y + 38, 50, 'CEP', '88000-000');

                y += 75;

                // --- SEÇÃO 2: TOMADOR ---
                drawTableBox(y, 60, 'Tomador do Serviço');
                const tomador = data.tomador || {};
                drawLabelValue(startX + 5, y + 15, 200, 'Nome / Nome Empresarial', tomador.razaoSocial || tomador.nome || 'Consumidor Final');
                drawLabelValue(startX + 250, y + 15, 120, 'CNPJ / CPF / NIF', tomador.cnpj || tomador.cpf || 'Não informado');
                drawLabelValue(startX + 380, y + 15, 80, 'Inscrição Municipal', '-');

                drawLabelValue(startX + 5, y + 35, 300, 'Endereço', tomador.endereco || 'Não informado');
                drawLabelValue(startX + 310, y + 35, 100, 'Município', '-');
                drawLabelValue(startX + 420, y + 35, 50, 'CEP', '-');

                y += 65;

                // --- SEÇÃO 3: SERVIÇO PRESTADO ---
                drawTableBox(y, 180, 'Serviço Prestado');
                const servico = data.servico || {};
                const discriminacao = this.deduplicateText(servico.discriminacao || data.discriminacao || 'Serviços de tecnologia.');

                drawLabelValue(startX + 5, y + 15, 200, 'Código de Tributação Nacional', '08.02.01 - Instrução, treinamento...');
                drawLabelValue(startX + 220, y + 15, 100, 'Código Tributação Municipal', '-');
                drawLabelValue(startX + 330, y + 15, 100, 'Local da Prestação', 'Florianópolis - SC');

                doc.fontSize(7).fillColor('#444444').text('DESCRIÇÃO DO SERVIÇO', startX + 5, y + 40);
                doc.fontSize(9).fillColor('#000000').text(discriminacao, startX + 5, y + 50, { width: 520, lineGap: 3 });

                y += 185;

                // --- SEÇÃO 4: TRIBUTAÇÃO MUNICIPAL ---
                drawTableBox(y, 50, 'Tributação Municipal');
                drawLabelValue(startX + 5, y + 15, 100, 'Valor do Serviço', `R$ ${Number(data.valorTotal || data.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
                drawLabelValue(startX + 110, y + 15, 80, 'BC ISSQN', '-');
                drawLabelValue(startX + 200, y + 15, 80, 'Alíquota Aplicada', '-');
                drawLabelValue(startX + 290, y + 15, 80, 'ISSQN Retido', 'Não Retido');
                drawLabelValue(startX + 380, y + 15, 80, 'ISSQN Apurado', '-');

                y += 55;

                // --- SEÇÃO 5: VALOR TOTAL ---
                drawTableBox(y, 40, 'Valor Total da NFS-e');
                doc.fontSize(10).text('VALOR LÍQUIDO DA NFS-e', startX + 350, y + 15, { width: 150, align: 'left' });
                doc.fontSize(14).text(`R$ ${Number(data.valorTotal || data.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, startX + 300, y + 12, { width: 230, align: 'right' });

                y += 45;

                // Rodapé Final
                doc.rect(startX, y, pageWidth, 50).stroke();
                doc.fontSize(7).text('INFORMAÇÕES COMPLEMENTARES', startX + 5, y + 5);
                doc.fontSize(8).text(data.infoComplementar || 'NBS: 122051100. Gerado via plataforma 791 Barber.', startX + 5, y + 15, { width: 520 });

                doc.fontSize(6).fillColor('#999999').text('Este documento é uma representação simplificada da NFS-e (DANFSE). Reservado ao uso administrativo.', startX, y + 60, { width: pageWidth, align: 'center' });

                doc.end();
            } catch (err) {
                console.error('[PDF-SERVICE] Error:', err);
                reject(err);
            }
        });
    }
}

export default new PdfService();
