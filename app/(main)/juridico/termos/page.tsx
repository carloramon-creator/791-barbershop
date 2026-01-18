
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
    return (
        <div className="container mx-auto p-6 max-w-4xl space-y-6">
            <h1 className="text-3xl font-black text-slate-100 mb-6">Termos de Uso</h1>
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-8 text-slate-300 space-y-4 leading-relaxed text-sm text-justify">
                    <p><strong>1. ACEITAÇÃO</strong></p>
                    <p>Ao utilizar o sistema 791 Barber, você concorda com estes termos. O serviço é fornecido "como está".</p>

                    <p><strong>2. USO DO SISTEMA</strong></p>
                    <p>Você é responsável por manter a confidencialidade de sua conta e senha. O sistema destina-se ao gerenciamento de barbearias e salões.</p>

                    <p><strong>3. PLANOS E PAGAMENTOS</strong></p>
                    <p>O acesso é cobrado via assinatura (mensal, semestral ou anual). O não pagamento pode resultar na suspensão do serviço.</p>

                    <p><strong>4. RESPONSABILIDADES</strong></p>
                    <p>A 791 Soluções não se responsabiliza por dados inseridos incorretamente ou por eventuais falhas de conexão de internet do usuário.</p>

                    <p><strong>5. CANCELAMENTO</strong></p>
                    <p>Você pode cancelar a qualquer momento. Não há reembolso para períodos já pagos e não utilizados.</p>

                    <p className="pt-4 text-xs text-slate-500">Última atualização: Janeiro/2026</p>
                </CardContent>
            </Card>
        </div>
    );
}
