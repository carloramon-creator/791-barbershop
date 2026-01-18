
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Api } from '@/lib/api';
import { Loader2, FileText, CheckCircle } from 'lucide-react';

export default function ContractPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [addons, setAddons] = useState<any[]>([]);
    const [tenant, setTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isFixed, setIsFixed] = useState(false);

    useEffect(() => {
        async function loadData() {
            try {
                // Tentar carregar dados do tenant (caso logado)
                const tenantData = await Api.getBarbershop();
                setTenant(tenantData);

                if (tenantData?.contract_snapshot) {
                    // Se já existir um snapshot, usar os dados fixados
                    setPlans(tenantData.contract_snapshot.plans || []);
                    setAddons(tenantData.contract_snapshot.addons || []);
                    setIsFixed(true);
                } else {
                    // Se não houver snapshot (Wizard ou sem aceite), buscar planos dinâmicos
                    const [plansData, addonsData] = await Promise.all([
                        Api.getSystemPlans(),
                        Api.getSystemAddons()
                    ]);
                    setPlans(plansData || []);
                    setAddons(addonsData || []);
                }
            } catch (error) {
                console.error('Erro ao carregar dados para o contrato:', error);
                // Fallback: tentar buscar planos mesmo se não houver tenant logado (Wizard)
                try {
                    const [plansData, addonsData] = await Promise.all([
                        Api.getSystemPlans(),
                        Api.getSystemAddons()
                    ]);
                    setPlans(plansData || []);
                    setAddons(addonsData || []);
                } catch (e) {
                    console.error('Fallback failed:', e);
                }
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Formatar endereço do CONTRATANTE
    const formatAddress = (t: any) => {
        if (!t) return "[ENDEREÇO NÃO CADASTRADO]";
        const parts = [t.street, t.number, t.complement, t.neighborhood, t.city, t.state].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : "[ENDEREÇO NÃO CADASTRADO]";
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-100 tracking-tighter uppercase flex items-center gap-3">
                        <FileText className="text-blue-500" size={32} />
                        Contrato de Assinatura
                    </h1>
                    <p className="text-slate-500 font-medium">Contrato de Licença de Uso de Software (SaaS).</p>
                </div>
                {isFixed && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 flex items-center gap-2">
                        <CheckCircle size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Contrato Aceito e Firmado</span>
                    </div>
                )}
            </div>

            <Card className="bg-slate-900 border-slate-800 shadow-2xl">
                <CardContent className="p-8 text-slate-300 space-y-6 leading-relaxed text-sm text-justify">
                    <div className="text-center space-y-1 mb-8">
                        <h2 className="text-lg font-black text-slate-100 uppercase">CONTRATO DE LICENÇA DE USO DE SOFTWARE (SaaS)</h2>
                        <p className="text-blue-500 font-bold">791 BARBER</p>
                    </div>

                    <section className="space-y-4">
                        <p>
                            <strong>CONTRATADA:</strong> 791 SOLUÇÕES EMPRESARIAIS LTDA, inscrita no CNPJ sob o nº 61.887.941/0001-83, com sede na Rua Eugênio Portela, 415, Barreiros, São José/SC, neste ato representada por seu Diretor, Carlos Ramon Pinto.
                        </p>
                        <p>
                            <strong>CONTRATANTE:</strong> {tenant ? (
                                <>
                                    <span className="text-slate-100 font-bold">{tenant.name.toUpperCase()}</span>,
                                    {tenant.cnpj ? ` inscrita no CNPJ sob o nº ${tenant.cnpj}` : ' (CNPJ não informado)'},
                                    com sede em {formatAddress(tenant)}.
                                </>
                            ) : (
                                "A Pessoa Jurídica ou Física identificada no ato de cadastro no sistema 791 Barber, neste ato denominada \"CLIENTE\"."
                            )}
                        </p>
                    </section>

                    <section className="space-y-4">
                        <p className="font-bold text-slate-100 uppercase text-xs tracking-widest">CONSIDERANDOS:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Considerando que a CONTRATADA é desenvolvedora do software 791 Barber, voltado para gestão e agendamento de barbearias e salões de beleza;</li>
                            <li>Considerando que o CLIENTE deseja contratar a licença de uso deste software na modalidade de Software as a Service (SaaS);</li>
                        </ul>
                        <p>As partes acordam nos seguintes termos e condições:</p>
                    </section>

                    <section className="space-y-3">
                        <p><strong>1. DO OBJETO</strong></p>
                        <p>1.1. A CONTRATADA concede ao CLIENTE uma licença de uso não exclusiva, não transmissível e revogável do software 791 Barber, disponibilizado na modalidade SaaS (Software as a Service), para utilização em plataforma web e/ou aplicativo mobile, destinado exclusivamente ao gerenciamento operacional de barbearias e salões de beleza.</p>
                        <p>1.2. A licença autoriza o uso do software conforme as funcionalidades e limites definidos no plano escolhido pelo CLIENTE, não conferindo direito de propriedade, cessão, aluguel, venda ou transferência a terceiros.</p>
                    </section>

                    <section className="space-y-3">
                        <p><strong>2. DOS PLANOS E PREÇOS</strong></p>
                        <p>2.1. O acesso ao 791 Barber é oferecido mediante assinatura aos planos vigentes. {isFixed ? "Na data de aceitação deste contrato, os planos e valores acordados são:" : "Na data desta última atualização, os planos disponíveis são:"}</p>

                        {loading ? (
                            <div className="flex items-center gap-2 text-slate-500 py-2">
                                <Loader2 size={14} className="animate-spin" /> Carregando valores...
                            </div>
                        ) : (
                            <ul className="list-disc pl-5 space-y-2">
                                {plans.filter(p => p.slug !== 'trial').map(plan => (
                                    <li key={plan.id}>
                                        <strong className="capitalize">{plan.name}:</strong> {plan.description}, no valor de R$ {Number(plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mensal;
                                    </li>
                                ))}
                            </ul>
                        )}

                        <p>2.2. Os valores poderão ser cobrados em ciclos mensais, semestrais ou anuais, conforme escolha do CLIENTE no cadastro.</p>
                        <p>2.3. O CLIENTE terá direito a uma avaliação gratuita (período trial) conforme indicado na plataforma, findo o qual a cobrança será automaticamente ativada, exceto se o cancelamento for solicitado antes do término do período.</p>

                        <p><strong>2.4. DOS MÓDULOS ADICIONAIS (ADD-ONS)</strong></p>
                        <p>O CLIENTE poderá, a qualquer momento, contratar módulos extras ("Add-ons") para turbinar as funcionalidades de seu plano. {isFixed ? "Módulos disponíveis no momento da firma:" : "Atualmente, os módulos disponíveis são:"}</p>
                        {loading ? (
                            <div className="flex items-center gap-2 text-slate-500 py-2">
                                <Loader2 size={14} className="animate-spin" /> Carregando módulos...
                            </div>
                        ) : (
                            <ul className="list-disc pl-5 space-y-1">
                                {addons.map(addon => (
                                    <li key={addon.id}>
                                        <strong>{addon.name}:</strong> R$ {Number(addon.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês.
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-blue-400 font-bold">
                            Importante: Após a contratação de qualquer módulo extra, o valor do respectivo add-on será somado ao valor do plano atual, passando o valor total da fatura a ser a soma de todos os serviços contratados.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <p><strong>3. DA VIGÊNCIA E RENOVAÇÃO</strong></p>
                        <p>3.1. Este Contrato entra em vigor na data de aceite digital dos Termos de Uso e Política de Privacidade do 791 Barber e permanece válido enquanto a assinatura estiver ativa.</p>
                        {tenant?.terms_accepted_at && (
                            <p className="text-emerald-500 font-bold">Aceite digital realizado em: {new Date(tenant.terms_accepted_at).toLocaleString('pt-BR')}.</p>
                        )}
                        <p>3.2. Após o término do primeiro ciclo de cobrança (mensal, semestral ou anual), o Contrato será automaticamente renovado pelos mesmos termos, salvo cancelamento solicitado pelo CLIENTE com antecedência mínima de 5 (cinco) dias úteis antes do vencimento.</p>
                        <p>3.3. A CONTRATADA poderá modificar os preços ou planos com notificação de 30 (trinta) dias via e-mail ou avisos na plataforma, tendo o CLIENTE direito a cancelar sem penalidades caso discorde da alteração.</p>
                    </section>

                    <section className="space-y-3">
                        <p><strong>4. DAS CONDIÇÕES DE PAGAMENTO</strong></p>
                        <p>4.1. Os pagamentos serão processados através de gateways de pagamento integrados ao sistema (Stripe, Pix, transferência bancária ou outros métodos disponibilizados).</p>
                        <p>4.2. O faturamento ocorrerá automaticamente na data de cobrança ou será enviada notificação com boleto/link de pagamento.</p>
                        <p>4.3. O não pagamento dentro de 10 (dez) dias úteis do vencimento implicará suspensão automática do acesso até a regularização, sem prejuízo de cobranças de juros e multa conforme legislação aplicável.</p>
                        <p>4.4. Não há reembolso por períodos já pagos, exceto nos casos previstos neste Contrato ou em lei.</p>
                    </section>

                    <section className="space-y-3">
                        <p><strong>5. DO SUPORTE TÉCNICO</strong></p>
                        <p>5.1. A CONTRATADA oferece suporte técnico através dos seguintes canais:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>E-mail:</strong> contato@791solucoes.com.br</li>
                            <li><strong>WhatsApp:</strong> (48) 99180-3379</li>
                        </ul>
                        <p>5.2. O suporte é fornecido em horário comercial (segunda a sexta-feira, das 09h às 18h, horário de Brasília), exceto feriados nacionais e estaduais.</p>
                        <p>5.3. O tempo de resposta estimado é de até 24 (vinte e quatro) horas úteis para suporte técnico básico.</p>
                    </section>

                    <section className="space-y-3">
                        <p><strong>10. DO NÍVEL DE SERVIÇO (SLA)</strong></p>
                        <p>10.1. A CONTRATADA se compromete a manter uma disponibilidade de 99,5% (noventa e nove vírgula cinco por cento) do serviço, medida mensalmente, excluindo manutenções programadas e força maior.</p>
                    </section>

                    <section className="space-y-3">
                        <p><strong>12. DO CANCELAMENTO</strong></p>
                        <p>12.1. O CLIENTE poderá solicitar o cancelamento da assinatura a qualquer momento. O cancelamento entra em vigor no final do ciclo de cobrança atual. Dados do CLIENTE serão mantidos por 30 (trinta) dias após cancelamento para fins de exportação.</p>
                    </section>

                    <section className="space-y-3">
                        <p><strong>15. DADOS E CONFORMIDADE COM LGPD</strong></p>
                        <p>15.1. Os dados pessoais são tratados conforme a LGPD. Para exercer direitos ou dúvidas, contate o Encarregado (DPO) em: <strong>contato@791solucoes.com.br</strong>.</p>
                    </section>

                    <section className="space-y-3">
                        <p><strong>17. DA LEGISLAÇÃO E FORO COMPETENTE</strong></p>
                        <p>17.1. Fica eleito o foro da Comarca de Florianópolis – SC para dirimir controvérsias oriundas deste Contrato.</p>
                    </section>

                    <div className="pt-10 border-t border-slate-800 text-center space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Assinado eletronicamente por aceite do CLIENTE no ato de cadastro/assinatura no 791 Barber.
                        </p>
                        <p className="text-blue-500 font-black text-xs">
                            Última atualização: 18 de janeiro de 2026
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
