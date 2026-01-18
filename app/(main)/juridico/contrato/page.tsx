
import { Card, CardContent } from "@/components/ui/card";

export default function ContractPage() {
    return (
        <div className="container mx-auto p-6 max-w-4xl space-y-6">
            <h1 className="text-3xl font-black text-slate-100 mb-6">Contrato de Assinatura</h1>
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-8 text-slate-300 space-y-6 leading-relaxed text-sm text-justify">
                    <p className="text-center font-bold text-slate-100">CONTRATO DE LICENÇA DE USO DE SOFTWARE (SaaS)</p>

                    <section className="space-y-2">
                        <p><strong>1. PARTES</strong></p>
                        <p>De um lado, <strong>791 SOLUÇÕES EMPRESARIAIS LTDA</strong>, inscrita no CNPJ sob o nº [CNPJ DA 791], com sede em Florianópolis/SC, doravante denominada <strong>CONTRATADA</strong>.</p>
                        <p>De outro lado, a pessoa física ou jurídica identificada no momento do cadastro e aceite digital, doravante denominada <strong>CONTRATANTE</strong>.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>2. OBJETO</strong></p>
                        <p>O presente contrato tem por objeto a licença de uso do software <strong>791 Barber</strong>, disponibilizado via internet (SaaS), para a gestão administrativa, operacional e financeira de barbearias e salões de beleza.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>3. PLANOS E ACESSO</strong></p>
                        <p>O CONTRATANTE terá acesso aos módulos e funcionalidades correspondentes ao plano escolhido (Basic, Complete ou Premium) no ato da contratação. A CONTRATADA reserva-se o direito de atualizar, modificar ou remover funcionalidades para a melhoria do ecossistema do software.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>4. VALORES E PAGAMENTO</strong></p>
                        <p>Pela licença de uso, o CONTRATANTE pagará os valores vigentes para o plano e ciclo escolhidos (mensal, semestral ou anual). O pagamento será realizado via cartão de crédito, Pix ou boleto através das plataformas integradas.</p>
                        <p>A inadimplência superior a 5 (cinco) dias poderá acarretar na suspensão automática do acesso ao sistema até a efetiva regularização.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>5. NÍVEL DE SERVIÇO (SLA) E SUPORTE</strong></p>
                        <p>A CONTRATADA envidará os melhores esforços para manter a plataforma disponível 24 (vinte e quatro) horas por dia, 7 (sete) dias por semana, com um índice de disponibilidade (uptime) de 99%, salvo interrupções para manutenções programadas ou falhas decorrentes de infraestrutura de terceiros (servidores, redes de internet).</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>6. PROPRIEDADE INTELECTUAL</strong></p>
                        <p>O 791 Barber, incluindo seu código-fonte, interface, marcas e metodologias, é propriedade exclusiva da 791 Soluções. A licença concedida é de uso pessoal e intransferível, sendo vedada qualquer tentativa de cópia, engenharia reversa ou sublicenciamento.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>7. VIGÊNCIA E RESCISÃO</strong></p>
                        <p>O contrato vigora por prazo indeterminado. O CONTRATANTE pode solicitar o cancelamento a qualquer momento através do painel. Em caso de cancelamento, não haverá reembolso de valores proporcionais ao período já pago e ainda não utilizado.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>8. FORO</strong></p>
                        <p>As partes elegem o Foro da Comarca de Florianópolis/SC para dirimir quaisquer dúvidas oriundas deste contrato.</p>
                    </section>

                    <p className="pt-6 text-xs text-slate-500 font-bold italic text-center">Este contrato é aceito digitalmente ao confirmar a assinatura do serviço.</p>
                    <p className="text-xs text-slate-500 font-bold text-center">Última atualização: 18 de janeiro de 2026.</p>
                </CardContent>
            </Card>
        </div>
    );
}
