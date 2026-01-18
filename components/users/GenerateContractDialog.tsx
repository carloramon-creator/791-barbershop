
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Printer, FileText, Download } from "lucide-react";
import { User } from "@/lib/types";
import { useAuth } from "@/lib/auth-provider";

interface GenerateContractDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User | null;
}

export function GenerateContractDialog({ open, onOpenChange, user }: GenerateContractDialogProps) {
    const { tenant } = useAuth();
    const [contractText, setContractText] = useState("");

    // Auto-fill template on open
    useEffect(() => {
        if (open && user && tenant) {
            const today = new Date();
            const dateStr = today.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

            const template = `CONTRATO DE PARCERIA COMERCIAL - SALÃO PARCEIRO E PROFISSIONAL PARCEIRO

Pelo presente instrumento particular, as partes:

SALÃO PARCEIRO: ${tenant.name}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${tenant.cnpj || "[CNPJ DA BARBEARIA]"}, com sede em ${[tenant.street, tenant.number, tenant.complement, tenant.neighborhood, tenant.city, tenant.state].filter(Boolean).join(', ') || "[ENDEREÇO DA BARBEARIA]"}, neste ato representada por seu sócio administrador.

PROFISSIONAL PARCEIRO: ${user.name}, inscrito(a) no CPF/CNPJ sob o nº ${user.cpf || user.cnpj_mei || "[CPF/CNPJ DO BARBEIRO]"}, residente e domiciliado(a) em ${user.street || "[ENDEREÇO DO BARBEIRO]"}, doravante denominado(a) simplesmente PARCEIRO(A).

Têm entre si, justo e contratado, nos termos das Leis nº 12.592/2012 e 13.352/2016, o presente CONTRATO DE PARCERIA, que se regerá pelas seguintes cláusulas e condições:

CLÁUSULA PRIMEIRA - DO OBJETO
1.1. O presente contrato tem por objeto a formalização de parceria comercial entre o SALÃO PARCEIRO e o(a) PROFISSIONAL PARCEIRO(A) para o desempenho de atividades de prestação de serviços de beleza e estética aos clientes do SALÃO PARCEIRO.

CLÁUSULA SEGUNDA - DA INEXISTÊNCIA DE VÍNCULO EMPREGATÍCIO
2.1. As partes declaram expressamente que a presente relação jurídica não configura vínculo empregatício de qualquer natureza, sendo regida pela legislação civil e pelas Leis nº 12.592/2012 e 13.352/2016 (Lei do Salão Parceiro).
2.2. O(A) PROFISSIONAL PARCEIRO(A) atuará com autonomia profissional, sem subordinação hierárquica e cumprimento de horário fixo, organizando sua própria agenda em comum acordo com o SALÃO PARCEIRO.

CLÁUSULA TERCEIRA - DA COTA-PARTE (COMISSÃO)
3.1. O SALÃO PARCEIRO será responsável pela centralização dos pagamentos e recebimentos decorrentes das atividades de prestação de serviços de beleza feitas pelo(a) PROFISSIONAL PARCEIRO(A).
3.2. A título de aluguel de bens móveis e de utensílios para o desempenho das atividades de serviços de beleza e/ou a título de serviços de gestão, apoio administrativo, de escritório, de cobrança e de recebimentos de valores transitórios recebidos de clientes das atividades de serviços de beleza, o SALÃO PARCEIRO reterá a porcentagem acordada sobre o valor bruto dos serviços executados.
3.3. Caberá ao(à) PROFISSIONAL PARCEIRO(A) a cota-parte de ${user.commission_type === 'percentage' ? user.commission_value + '%' : 'R$ ' + user.commission_value} sobre o valor dos serviços prestados.
3.4. O pagamento da cota-parte será realizado mensalmente, preferencialmente até o dia 10 (dez) do mês subsequente à prestação dos serviços.

CLÁUSULA QUARTA - DAS OBRIGAÇÕES
4.1. Compete ao SALÃO PARCEIRO:
a) Preservar e manter as condições adequadas de funcionamento do local;
b) Emitir nota fiscal única ao consumidor final, discriminando a sua cota-parte e a cota-parte do(a) PROFISSIONAL PARCEIRO(A);
c) Realizar a retenção e recolhimento dos tributos e contribuições sociais e previdenciárias devidos pelo(a) PROFISSIONAL PARCEIRO(A) incidentes sobre a cota-parte deste(a).

4.2. Compete ao(à) PROFISSIONAL PARCEIRO(A):
a) Exercer suas atividades com zelo, qualidade e técnica profissional;
b) Manter a regularidade de sua inscrição perante os órgãos fazendários e fiscalizatórios;
c) Emitir documento fiscal destinado ao SALÃO PARCEIRO referente ao valor de sua cota-parte.

CLÁUSULA QUINTA - DA VIGÊNCIA E RESCISÃO
5.1. O presente contrato é celebrado por prazo indeterminado.
5.2. Qualquer das partes poderá rescindir o presente contrato mediante aviso prévio por escrito com antecedência mínima de 30 (trinta) dias.

E, por estarem assim justos e contratados, assinam o presente instrumento em 02 (duas) vias de igual teor e forma.

${tenant.city || "Cidade"}, ${dateStr}.

_________________________________________________
${tenant.name.toUpperCase()}
(Salão Parceiro)

_________________________________________________
${user.name.toUpperCase()}
(Profissional Parceiro)
`;
            setContractText(template);
        }
    }, [open, user, tenant]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Contrato de Parceria - ${user?.name}</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; font-size: 12px; }
                            h1 { text-align: center; font-size: 16px; margin-bottom: 20px; }
                            p { margin-bottom: 15px; text-align: justify; }
                            .signature-area { margin-top: 50px; display: flex; justify-content: space-between; gap: 40px; }
                            .signature-line { border-top: 1px solid #000; width: 45%; text-align: center; padding-top: 10px; margin-top: 40px; }
                        </style>
                    </head>
                    <body>
                        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${contractText}</pre>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-800 sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-slate-100 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        Gerar Contrato de Parceria
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    <Label className="text-slate-400 mb-2 block">Texto do Contrato (Editável)</Label>
                    <Textarea
                        value={contractText}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContractText(e.target.value)}
                        className="min-h-[400px] bg-slate-950 border-slate-700 font-mono text-sm leading-relaxed"
                    />
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-800 text-slate-400">
                        Cancelar
                    </Button>
                    <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                        <Printer size={16} /> Imprimir / Salvar PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
