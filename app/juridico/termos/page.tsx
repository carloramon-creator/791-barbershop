
export default function TermsPage() {
    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="container mx-auto max-w-4xl space-y-6">
                <h1 className="text-3xl font-black text-slate-100 mb-6">Termos de Uso</h1>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-slate-300 space-y-6 leading-relaxed text-sm text-justify">
                    <section className="space-y-2">
                        <p><strong>1. ACEITAÇÃO DOS TERMOS</strong></p>
                        <p>Ao utilizar o sistema <strong>791 Barber</strong>, de titularidade da <strong>791 SOLUÇÕES EMPRESARIAIS LTDA</strong>, inscrita no CNPJ sob o nº <strong>61.887.941/0001-83</strong>, com sede em São José/SC, o usuário declara ter lido, compreendido e aceitado integralmente as condições deste documento.</p>
                        <p>O uso do sistema implica adesão automática a estes Termos de Uso e à Política de Privacidade correspondente. O serviço é fornecido "no estado em que se encontra" (as is), podendo sofrer alterações, suspensões ou encerramento sem aviso prévio.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>2. USO DO SISTEMA</strong></p>
                        <p>O 791 Barber destina-se exclusivamente ao gerenciamento de barbearias e salões de beleza, incluindo funcionalidades de agendamento, controle financeiro, cadastro de clientes e relatórios.</p>
                        <p>O usuário é responsável por manter a confidencialidade de suas credenciais de acesso (login e senha), bem como por todas as atividades realizadas sob sua conta. O compartilhamento de credenciais é expressamente proibido.</p>
                        <p>É vedado o uso do sistema para fins ilícitos, abusivos, fraudulentos ou que violem direitos de terceiros, sob pena de suspensão ou exclusão da conta.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>3. PLANOS E PAGAMENTOS</strong></p>
                        <p>O acesso ao sistema é concedido mediante assinatura nos planos disponibilizados (mensal, semestral ou anual).</p>
                        <p>O pagamento é processado por meio das plataformas integradas ao sistema (como Stripe, Pix ou outros métodos disponíveis).</p>
                        <p>A ausência de pagamento ou atraso poderá resultar na suspensão automática do acesso até a regularização.</p>
                        <p>Valores pagos não são reembolsáveis, exceto em casos previstos em lei ou falhas comprovadas da plataforma.</p>
                        <p>Alterações de preço ou de planos poderão ocorrer, com comunicação prévia ao usuário por e-mail ou dentro da plataforma.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>4. RESPONSABILIDADES DO USUÁRIO E DA 791 SOLUÇÕES</strong></p>
                        <p>O usuário é integralmente responsável pelas informações inseridas no sistema, incluindo dados de clientes, produtos e registros financeiros.</p>
                        <p>A 791 Soluções Empresariais LTDA não se responsabiliza por:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Dados inseridos incorretamente pelo usuário;</li>
                            <li>Interrupções, falhas ou instabilidades decorrentes de problemas na conexão de internet do cliente;</li>
                            <li>Danos indiretos, lucros cessantes ou perda de informações decorrentes do uso indevido da plataforma.</li>
                        </ul>
                        <p>Embora adote medidas de segurança e backup, a empresa não garante disponibilidade contínua do serviço nem isenção total de erros.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>5. SUPORTE E ATENDIMENTO</strong></p>
                        <p>O suporte técnico é oferecido nos canais oficiais da 791 Barber, nos horários e prazos informados na plataforma. Dúvidas relacionadas ao uso, cobrança ou funcionalidades devem ser encaminhadas pelos meios indicados.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>6. CANCELAMENTO E EXCLUSÃO DE CONTA</strong></p>
                        <p>O usuário pode solicitar o cancelamento da assinatura a qualquer momento, diretamente pelo painel ou via suporte. O cancelamento não gera direito a reembolso de períodos já pagos e não utilizados.</p>
                        <p>Em caso de inatividade prolongada ou violação destes termos, a 791 Soluções poderá, a seu critério, suspender ou excluir o acesso do usuário, preservando os dados conforme a legislação vigente.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>7. PRIVACIDADE E PROTEÇÃO DE DADOS</strong></p>
                        <p>A coleta, armazenamento e tratamento de dados pessoais seguem a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018). As informações são utilizadas exclusivamente para fins operacionais e de melhoria do sistema, conforme descrito na Política de Privacidade.</p>
                        <p>O usuário poderá solicitar, a qualquer momento, a exclusão definitiva de seus dados, sujeito aos prazos e limitações legais.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>8. ALTERAÇÕES DESTES TERMOS</strong></p>
                        <p>A 791 Soluções poderá alterar estes Termos a qualquer momento. As versões atualizadas estarão sempre disponíveis no site oficial e passam a valer a partir da data de publicação. O uso contínuo do sistema após a atualização implica aceitação automática das novas condições.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>9. FORO E LEGISLAÇÃO APLICÁVEL</strong></p>
                        <p>Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de Florianópolis – SC como competente para resolver quaisquer disputas oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
                    </section>

                    <p className="pt-6 text-xs text-slate-500 font-bold">Última atualização: 18 de janeiro de 2026.</p>
                </div>
            </div>
        </div>
    );
}
