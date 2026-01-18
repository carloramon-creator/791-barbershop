
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPage() {
    return (
        <div className="container mx-auto p-6 max-w-4xl space-y-6">
            <h1 className="text-3xl font-black text-slate-100 mb-6">Política de Privacidade</h1>
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-8 text-slate-300 space-y-6 leading-relaxed text-sm text-justify">
                    <section className="space-y-2">
                        <p><strong>1. DISPOSIÇÕES GERAIS</strong></p>
                        <p>Esta Política de Privacidade descreve como a <strong>791 SOLUÇÕES EMPRESARIAIS LTDA</strong>, inscrita no CNPJ sob o nº <strong>61.887.941/0001-83</strong>, sediada na Rua Eugênio Portela, 415, Barreiros, São José/SC (“791 Soluções”, “nós”), coleta, utiliza, armazena e protege os dados pessoais dos usuários do sistema 791 Barber e dos clientes cadastrados pelos estabelecimentos (barbearias e salões).</p>
                        <p>O tratamento de dados pessoais é realizado em conformidade com a Lei nº 13.709/2018 – Lei Geral de Proteção de Dados Pessoais (LGPD) e demais normas aplicáveis.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>2. DADOS COLETADOS</strong></p>
                        <p>Poderão ser coletados:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Dados do estabelecimento e responsáveis:</strong> nome, razão social, CNPJ, CPF, e-mail, telefone, endereço, dados de cobrança e faturamento.</li>
                            <li><strong>Dados de usuários do sistema:</strong> nome, e-mail, telefone, função no estabelecimento e dados de acesso (login).</li>
                            <li><strong>Dados dos clientes do estabelecimento:</strong> nome, telefone, e-mail, histórico de agendamentos e serviços realizados.</li>
                            <li><strong>Dados de uso:</strong> endereço IP, data e hora de acesso, tipo de dispositivo, navegador e interações com o sistema, para fins de segurança e melhoria da plataforma.</li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <p><strong>3. FINALIDADES DO TRATAMENTO</strong></p>
                        <p>Os dados são utilizados para:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Permitir o funcionamento do 791 Barber (cadastro, login, agendamentos, controle financeiro, relatórios).</li>
                            <li>Executar o contrato de prestação de serviços firmado com o estabelecimento assinante.</li>
                            <li>Enviar comunicações operacionais, avisos sobre o serviço, cobranças, notas fiscais e informações de suporte.</li>
                            <li>Cumprir obrigações legais e regulatórias, inclusive fiscais e de guarda de registros de acesso.</li>
                            <li>Melhorar a experiência de uso, prevenir fraudes e garantir a segurança da aplicação e dos dados.</li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <p><strong>4. BASES LEGAIS UTILIZADAS</strong></p>
                        <p>O tratamento de dados pessoais se fundamenta principalmente em:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Execução de contrato ou de procedimentos preliminares relacionados a contrato do qual o titular seja parte.</li>
                            <li>Cumprimento de obrigação legal ou regulatória, quando aplicável (por exemplo, obrigações fiscais e de registros de acesso).</li>
                            <li>Legítimo interesse, para atividades de segurança, prevenção a fraudes, melhoria de serviços e comunicação com clientes, respeitados os direitos dos titulares.</li>
                            <li>Consentimento, quando exigido pela LGPD, especialmente para comunicações de marketing direto, podendo ser revogado a qualquer momento pelo titular.</li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <p><strong>5. COMPARTILHAMENTO DE DADOS</strong></p>
                        <p>Os dados poderão ser compartilhados:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Com provedores de serviços de tecnologia (hospedagem, e-mail, gateways de pagamento, ferramentas de análise), estritamente na medida necessária para operação do sistema.</li>
                            <li>Com autoridades públicas, quando houver obrigação legal, ordem judicial ou requisição de autoridade competente.</li>
                            <li>Em casos de operações societárias (fusão, aquisição ou incorporação), condicionadas à continuidade das garantias desta Política.</li>
                        </ul>
                        <p>Não há venda de dados pessoais a terceiros para fins comerciais alheios ao serviço prestado.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>6. ARMAZENAMENTO E SEGURANÇA DOS DADOS</strong></p>
                        <p>Os dados são armazenados em ambientes controlados e de acesso restrito, com uso de medidas técnicas e organizacionais de segurança razoáveis para proteger contra acessos não autorizados, perda, alteração ou destruição.</p>
                        <p>Apesar dos esforços de segurança, nenhum sistema é totalmente imune a incidentes, motivo pelo qual não é possível garantir segurança absoluta das informações.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>7. PRAZO DE CONSERVAÇÃO</strong></p>
                        <p>Os dados são mantidos pelo tempo necessário para:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Cumprir as finalidades indicadas nesta Política e no contrato de prestação de serviços.</li>
                            <li>Atender exigências legais, regulatórias e de defesa em processos judiciais, administrativos ou arbitrais.</li>
                        </ul>
                        <p>Após o término das finalidades, os dados poderão ser eliminados ou anonimizados, salvo nas hipóteses legais de guarda obrigatória.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>8. DIREITOS DOS TITULARES</strong></p>
                        <p>O titular de dados pessoais poderá, mediante requisição:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Confirmar a existência de tratamento e obter acesso aos seus dados.</li>
                            <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
                            <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD.</li>
                            <li>Solicitar a portabilidade dos dados a outro fornecedor de serviço ou produto, respeitadas as normas da autoridade nacional.</li>
                            <li>Revogar o consentimento, quando o tratamento se basear nesta hipótese, observados os efeitos dessa revogação.</li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <p><strong>9. RESPONSABILIDADES DO ESTABELECIMENTO (CONTROLADOR)</strong></p>
                        <p>Em relação aos dados dos clientes cadastrados na plataforma (por exemplo, clientes da barbearia), o estabelecimento é, em regra, o controlador e a 791 Soluções atua como operadora em diversas operações de tratamento.</p>
                        <p>Cabe ao estabelecimento garantir que possui base legal adequada para cadastrar dados de seus clientes no sistema e para utilizar tais dados para agendamentos, comunicações e registros.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>10. COOKIES E TECNOLOGIAS DE RASTREAMENTO</strong></p>
                        <p>O sistema poderá utilizar cookies e tecnologias similares para: lembrar preferências, manter a sessão ativa, gerar estatísticas de uso e melhorar a experiência do usuário.</p>
                        <p>O usuário poderá ajustar as configurações de cookies no navegador, ciente de que algumas funcionalidades podem ser afetadas caso determinados cookies sejam desativados.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>11. ATUALIZAÇÕES DESTA POLÍTICA</strong></p>
                        <p>Esta Política de Privacidade poderá ser alterada periodicamente para refletir ajustes legais, regulatórios ou melhorias nos processos de tratamento de dados.</p>
                        <p>A versão atualizada estará sempre disponível no site ou no painel do 791 Barber, indicando a data de última atualização, e o uso continuado do serviço após as alterações implica ciência das novas condições.</p>
                    </section>

                    <section className="space-y-2">
                        <p><strong>12. ENCARREGADO (DPO) E CONTATO</strong></p>
                        <p>A 791 Soluções indicará um Encarregado pelo Tratamento de Dados Pessoais (DPO), responsável por receber reclamações e comunicações dos titulares e da Autoridade Nacional de Proteção de Dados (ANPD), além de orientar internamente sobre proteção de dados.</p>
                        <p>Para exercer seus direitos ou esclarecer dúvidas sobre esta Política, o titular poderá entrar em contato pelo e-mail: <strong>contato@791solucoes.com.br</strong>.</p>
                    </section>

                    <p className="pt-6 text-xs text-slate-500 font-bold">Última atualização: 18 de janeiro de 2026.</p>
                </CardContent>
            </Card>
        </div>
    );
}
