
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPage() {
    return (
        <div className="container mx-auto p-6 max-w-4xl space-y-6">
            <h1 className="text-3xl font-black text-slate-100 mb-6">Política de Privacidade</h1>
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-8 text-slate-300 space-y-4 leading-relaxed text-sm text-justify">
                    <p><strong>1. COLETA DE DADOS</strong></p>
                    <p>Coletamos dados necessários para o funcionamento do sistema: Nome, Email, Telefone e dados do estabelecimento.</p>

                    <p><strong>2. USO DAS INFORMAÇÕES</strong></p>
                    <p>Seus dados são usados exclusivamente para prover o serviço, processar pagamentos e comunicação de suporte.</p>

                    <p><strong>3. COMPARTILHAMENTO</strong></p>
                    <p>Não vendemos seus dados. Compartilhamos apenas com parceiros essenciais (ex: processadores de pagamento como Stripe e Banco Inter).</p>

                    <p><strong>4. SEGURANÇA</strong></p>
                    <p>Adotamos medidas de segurança padrão da indústria para proteger suas informações.</p>

                    <p className="pt-4 text-xs text-slate-500">Última atualização: Janeiro/2026</p>
                </CardContent>
            </Card>
        </div>
    );
}
