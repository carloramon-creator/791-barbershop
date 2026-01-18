
import { Card, CardContent } from "@/components/ui/card";

export default function ContractPage() {
    return (
        <div className="container mx-auto p-6 max-w-4xl space-y-6">
            <h1 className="text-3xl font-black text-slate-100 mb-6">Contrato de Assinatura</h1>
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-8 text-slate-300 space-y-4 leading-relaxed text-sm text-justify">
                    <p><strong>CONTRATO DE LICENÇA DE USO DE SOFTWARE (SaaS)</strong></p>

                    <p><strong>CONTRATADA:</strong> 791 SOLUÇÕES DIGITAIS, detentora do software 791 Barber.</p>
                    <p><strong>CONTRATANTE:</strong> A Pessoa Jurídica ou Física identificada no cadastro do sistema.</p>

                    <p><strong>1. O OBJETO</strong></p>
                    <p>Licença de uso não exclusiva do software 791 Barber para gestão de barbearias.</p>

                    <p><strong>2. DO PREÇO</strong></p>
                    <p>O preço é definido pelo plano escolhido no momento da assinatura (Basic, Complete ou Premium).</p>

                    <p><strong>3. VIGÊNCIA</strong></p>
                    <p>Este contrato entra em vigor no aceite digital e permanece válido enquanto a assinatura estiver ativa.</p>

                    <p><strong>4. SUPORTE</strong></p>
                    <p>O suporte é fornecido via WhatsApp e Email em horário comercial.</p>

                    <p className="pt-4 text-xs text-slate-500">Versão 1.0 - Janeiro/2026</p>
                </CardContent>
            </Card>
        </div>
    );
}
