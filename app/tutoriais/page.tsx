'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    UserCheck,
    Calendar,
    Users,
    BarChart3,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    CheckCircle2,
    Lightbulb,
    Zap,
    Search,
    SearchX,
    Maximize2,
    ShoppingBag,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-provider';
import { getBusinessTexts } from '@/lib/business-dictionary';

const getTutorialContent = (texts: any, tenant: any) => [
    {
        id: 'dashboard',
        title: '2 - Dashboard: Visão Geral',
        icon: LayoutDashboard,
        images: ['/tutorials/dashboard-1.png'],
        description: 'Seu centro de comando. Acompanhe os principais números do seu negócio em tempo real.',
        steps: [
            {
                title: 'Métricas de Performance',
                content: 'Visualize o faturamento total do período, a quantidade de atendimentos concluídos e a média de espera real dos seus clientes.',
                imageIndex: 0
            },
            {
                title: 'Filtros Inteligentes',
                content: 'Alterne entre as visões de "Semana", "Quinzena" ou "Mês" para analisar o crescimento e as tendências do seu negócio.',
                imageIndex: 0
            },
            {
                title: 'Monitoramento da Fila',
                content: 'Veja quantos clientes estão aguardando agora, quantos profissionais estão online e qual a previsão de espera para novos clientes.',
                imageIndex: 0
            },
            {
                title: 'Status da Equipe',
                content: `Acompanhe em tempo real quem está "Livre", "Em Atendimento" ou "Offline". Essencial para gerir a escala do dia.`,
                imageIndex: 0
            }
        ],
        tip: 'O Dashboard é a bússola do seu negócio. Consulte-o diariamente para entender os horários de pico e otimizar sua equipe.'
    },
    {
        id: 'config-geral',
        title: '1.1 - Configurações: Geral',
        icon: LayoutDashboard,
        images: [
            '/tutorials/config-geral-1.png',
            '/tutorials/config-geral-2.png',
            '/tutorials/config-geral-3.png',
            '/tutorials/config-geral-4.png',
            '/tutorials/config-geral-step5.png',
            '/tutorials/config-geral-step6.png'
        ],
        description: `Aqui você define a identidade da sua ${texts.businessName}. É o primeiro passo para o sucesso da sua operação.`,
        steps: [
            {
                title: 'Logo e Branding',
                content: 'Faça o upload do seu logotipo (Recomendado: 500x500px). Esta imagem será o ícone que seus clientes verão no App do Cliente para identificar sua marca.',
                imageIndex: 0
            },
            {
                title: 'Dados Básicos e Identificação',
                content: 'Preencha o Nome e E-mail comercial. O campo CNPJ é importante para formalização, mas você pode marcar "Não tenho CNPJ" se for autônomo.',
                imageIndex: 0
            },
            {
                title: 'O que é o SLUG?',
                content: 'O SLUG é o identificador único da sua página (ex: 791barber.com/nome-da-loja). Ele é o link que você enviará para seus clientes agendarem. Escolha um nome curto e fácil de lembrar!',
                imageIndex: 0
            },
            {
                title: 'Tipo de Negócio',
                content: `Selecione se você é uma Barbearia ou Salão de Beleza. Isso ajusta automaticamente todos os termos do sistema (ex: ${texts.professional} ou Barbeiro).`,
                imageIndex: 1
            },
            {
                title: 'Divulgação e QR Code',
                content: 'Aproveite o QR Code gerado automaticamente. Clique em "Imprimir QR Code" para colocar na sua recepção ou vitrine, facilitando o agendamento rápido pelos clientes.',
                imageIndex: 4
            },
            {
                title: 'Horário de Funcionamento',
                content: 'Defina os dias de abertura, horários de início e fim. Você também pode configurar o Intervalo de Almoço, a Tolerância de Atraso e o tempo de antecedência do Lembrete de WhatsApp.',
                imageIndex: 5
            },
            {
                title: 'Endereço Simplificado',
                content: 'Basta digitar o CEP e o sistema preencherá a rua e o bairro. Você só precisa adicionar o número e o complemento (ex: Sala 2).',
                imageIndex: 3
            },
            {
                title: 'Dados Bancários e PIX',
                content: 'Configure sua chave PIX. Isso é fundamental para que o sistema gere QR Codes de pagamento automáticos no momento da venda, agilizando seu caixa.',
                imageIndex: 3
            },
            {
                title: 'Módulos do Sistema',
                content: 'Ative ou desative os módulos de "Fila" e "Agendamento" conforme a necessidade do seu modelo de negócio.',
                imageIndex: 3
            }
        ],
        tip: 'Um perfil completo com logo e endereço correto transmite muito mais profissionalismo e aumenta a confiança do cliente no primeiro agendamento.'
    },
    {
        id: 'config-usuarios',
        title: '1.2 - Configurações: Usuários',
        icon: Users,
        images: [
            '/tutorials/config-usuarios-1.png',
            '/tutorials/config-usuarios-2.png',
            '/tutorials/config-usuarios-3.png',
            '/tutorials/config-usuarios-step5.png',
            '/tutorials/config-usuarios-step6.png',
            '/tutorials/config-usuarios-step7.png',
            '/tutorials/config-usuarios-step8.png',
            '/tutorials/config-usuarios-step9.png'
        ],
        description: 'Gerencie sua equipe, defina comissões e controle quem pode acessar o sistema.',
        steps: [
            {
                title: 'Listagem de Usuários',
                content: 'Visualize todos os colaboradores cadastrados, seus e-mails e cargos atuais. Use o "Modo Auditoria" para ver detalhes de login.',
                imageIndex: 0
            },
            {
                title: 'Adicionar Colaborador',
                content: 'Clique em "+ Adicionar Usuário". Preencha dados básicos, apelido e telefone. Uma foto profissional ajuda na identificação rápida.',
                imageIndex: 1
            },
            {
                title: 'Perfil e Cargos',
                content: 'Defina se o usuário é Proprietário, Barbeiro ou Funcionário. Você pode selecionar múltiplos cargos se necessário.',
                imageIndex: 1
            },
            {
                title: 'Comissões e Serviços',
                content: 'Para Barbeiros, defina a porcentagem ou valor fixo de comissão. Esta configuração é fundamental para que o sistema gere automaticamente seus relatórios de fechamento com base nesses percentuais.',
                imageIndex: 2
            },
            {
                title: 'Identificação Fiscal',
                content: 'O campo CNPJ MEI é obrigatório para profissionais que precisam emitir Notas Fiscais (NFS-e) pelo sistema.',
                imageIndex: 3
            },
            {
                title: 'Menu de Ações',
                content: 'Ao clicar nos três pontos (...) em qualquer usuário, você abre o menu de ações rápidas para editar dados, gerenciar arquivos ou inativar o acesso.',
                imageIndex: 4
            },
            {
                title: 'Gestão de Documentos',
                content: 'Mantenha todos os documentos dos seus colaboradores organizados (como RG, CPF ou Contratos assinados) através do menu "Arquivos / Upload".',
                imageIndex: 5
            },
            {
                title: 'Contrato de Parceria',
                content: 'Gere automaticamente contratos de prestação de serviços baseados na "Lei do Salão Parceiro" para formalizar a relação com seus profissionais em segundos.',
                imageIndex: 6
            },
            {
                title: 'Ativação de Conta',
                content: 'Gere um link direto de convite para que o novo colaborador cadastre sua própria senha e acesse o sistema imediatamente via WhatsApp ou E-mail.',
                imageIndex: 7
            }
        ],
        tip: 'Mantenha os e-mails sempre atualizados para que os colaboradores recebam o link de ativação e consigam acessar suas agendas individuais.'
    },
    {
        id: 'config-permissoes',
        title: '1.3 - Configurações: Permissões',
        icon: UserCheck,
        images: ['/tutorials/config-permissoes-1.png'],
        description: `Personalize exatamente o que cada nível de acesso pode visualizar ou gerenciar no seu negócio.`,
        steps: [
            {
                title: 'Níveis de Acesso',
                content: `O sistema divide os acessos em: Proprietário (acesso total), Funcionário (Staff de recepção) e ${texts.professional}.`,
                imageIndex: 0
            },
            {
                title: 'Personalização por Cargo',
                content: 'Marque ou desmarque as caixas para conceder permissões em módulos sensíveis como o "Financeiro" ou "Configurações da Barbearia".',
                imageIndex: 0
            },
            {
                title: 'Gestão de Fila',
                content: `Você pode definir se um ${texts.professional} pode ver apenas a própria fila ou a fila de todos os colegas da equipe.`,
                imageIndex: 0
            },
            {
                title: 'Aplicando Mudanças',
                content: 'Sempre que alterar uma regra, clique em "Salvar Alterações". As novas permissões entram em vigor no próximo acesso do colaborador.',
                imageIndex: 0
            }
        ],
        tip: 'Por segurança, recomendamos que apenas Proprietários e Gerentes de confiança tenham acesso aos módulos "Financeiro" e "Alterar Plano".'
    },
    {
        id: 'config-planos',
        title: '1.4 - Configurações: Planos',
        icon: BarChart3,
        images: ['/tutorials/config-planos-1.png', '/tutorials/config-planos-2.png'],
        description: 'Gerencie sua assinatura, escolha o plano ideal para seu crescimento e acompanhe seu histórico de faturas.',
        steps: [
            {
                title: 'Planos Disponíveis',
                content: 'Oferecemos 3 níveis gratuitos: Básico (até 3 usuários), Completo (Gestão Financeira e Relatórios) e Premium (Estoque e Suporte Prioritário).',
                imageIndex: 0
            },
            {
                title: 'Add-ons (Turbinar Pacote)',
                content: 'Você pode adicionar recursos extras individualmente (como WhatsApp ou Agendamentos Ilimitados) sem precisar mudar de plano.',
                imageIndex: 0
            },
            {
                title: 'Histórico de Faturas',
                content: 'Acesse "Meu Histórico de Faturas" para baixar boletos, ver comprovantes de cartão e emitir suas Notas Fiscais (NFS-e).',
                imageIndex: 1
            },
            {
                title: 'Upgrade Simples',
                content: 'Clique em "Fazer Upgrade Agora" em qualquer plano. O sistema calcula o valor proporcional e libera os recursos na hora.',
                imageIndex: 0
            }
        ],
        tip: 'O Plano Premium é o preferido das barbearias que buscam automação total e controle rígido de estoque.'
    },
    {
        id: 'produtos',
        title: '3 - Gestão de Produtos',
        icon: ShoppingBag,
        images: ['/tutorials/produtos-1.png', '/tutorials/produtos-2.png'],
        description: 'Controle seu catálogo de produtos, organize por categorias e venda com agilidade na recepção.',
        steps: [
            {
                title: 'Mix de Produtos',
                content: 'Visualize todos os seus itens (como Pomadas, Cervejas ou Shampoos) organizados por categorias customizáveis.',
                imageIndex: 0
            },
            {
                title: 'Cadastro Ágil',
                content: 'Clique em "+ Novo Produto". Informe o nome, preço de venda e selecione a categoria correspondente.',
                imageIndex: 1
            },
            {
                title: 'Organização em Categorias',
                content: 'Crie categorias como "Bebidas" ou "Cosméticos" para facilitar a localização dos itens no momento da venda.',
                imageIndex: 0
            },
            {
                title: 'Ações e Edição',
                content: 'Você pode editar preços ou remover produtos obsoletos a qualquer momento usando os ícones de ação à direita de cada item.',
                imageIndex: 0
            }
        ],
        tip: 'Produtos por impulso na bancada aumentam o faturamento médio em até 25%.'
    },
    {
        id: 'servicos',
        title: '4 - Gestão de Serviços',
        icon: Zap,
        images: ['/tutorials/servicos-1.png', '/tutorials/servicos-2.png'],
        description: 'Configure seu cardápio de serviços com preços, duração e vincule os produtos necessários.',
        steps: [
            {
                title: 'Catálogo de Serviços',
                content: 'Visualize sua lista completa de serviços, tempos de execução e preços configurados.',
                imageIndex: 0
            },
            {
                title: 'Importância da Ordem',
                content: 'Cadastre seus PRODUTOS antes dos serviços. No sistema, você vincula quais itens (como tintas ou pomadas) são usados em cada atendimento.',
                imageIndex: 1
            },
            {
                title: 'Cadastro de Novo Serviço',
                content: 'Clique em "Novo Serviço". Defina o nome, valor de venda e a duração exata para que sua agenda seja calculada corretamente.',
                imageIndex: 1
            },
            {
                title: 'Consumo de Insumos',
                content: 'Selecione os produtos que serão "baixados" do estoque sempre que esse serviço for realizado. Isso gera um controle preciso de custos.',
                imageIndex: 1
            }
        ],
        tip: 'Vincular produtos aos serviços ajuda a calcular a lucratividade real de cada procedimento, descontando o custo dos insumos.'
    },
    {
        id: 'clientes',
        title: '5 - Gestão de Clientes',
        icon: UserCheck,
        images: [
            '/tutorials/clientes-step1.png',
            '/tutorials/clientes-step2.png',
            '/tutorials/clientes-step3.png',
            '/tutorials/clientes-step4.png',
            '/tutorials/clientes-step5.png'
        ],
        description: 'Mantenha sua base de contatos organizada, acompanhe o histórico de cada cliente e facilite o agendamento recorrente.',
        steps: [
            {
                title: 'Base de Clientes',
                content: 'Visualize sua lista completa de clientes cadastrados, com status da última visita e dados de contato rápidos.',
                imageIndex: 0
            },
            {
                title: 'Novo Cadastro',
                content: 'Ao clicar em "+ Novo Cliente", você pode registrar nome, telefone, CPF (opcional) e adicionar uma foto para identificação fácil na fila.',
                imageIndex: 1
            },
            {
                title: 'Busca Inteligente',
                content: 'Encontre rapidamente qualquer cliente pelo nome, telefone ou CPF usando a barra de pesquisa no topo da página.',
                imageIndex: 2
            },
            {
                title: 'Link do App (Convite)',
                content: 'Envie o link exclusivo da sua barbearia via WhatsApp. Com ele, o cliente acessa seu App (PWA) para entrar na fila remotamente ou agendar horários em segundos, sem precisar baixar nada na loja de aplicativos.',
                imageIndex: 3
            },
            {
                title: 'Fidelização',
                content: 'O sistema registra automaticamente a data do último atendimento, ajudando você a identificar clientes sumidos para ações de retorno.',
                imageIndex: 4
            }
        ],
        tip: 'Clientes cadastrados com telefone correto permitem que o sistema envie lembretes automáticos, reduzindo faltas drasticamente.'
    },
    {
        id: 'profissionais',
        title: `6 - Equipe de ${texts.professionals}`,
        icon: Users,
        images: [
            '/tutorials/profissionais-1.png',
            '/tutorials/profissionais-2.png',
            '/tutorials/profissionais-step3.png',
            '/tutorials/profissionais-4.png',
            '/tutorials/profissionais-step5.png',
            '/tutorials/profissionais-6.png'
        ],
        description: `Gerencie sua equipe, configure o perfil público dos ${texts.professionals} e realize o fechamento de caixa individual com relatórios detalhados.`,
        steps: [
            {
                title: 'Equipe e Visibilidade',
                content: `Visualize todos os ${texts.professionals} cadastrados e o status em tempo real (Online/Offline) no painel central.`,
                imageIndex: 0
            },
            {
                title: 'Perfil Público (App do Cliente)',
                content: `No botão de edição, defina o Nome de Exibição, foto de perfil e quais serviços cada ${texts.professional} está habilitado a realizar no app de agendamento.`,
                imageIndex: 1
            },
            {
                title: 'Iniciando Fechamento',
                content: 'Use o botão "Fechar Caixa" para abrir o resumo rápido do dia, conferindo faturamento bruto e comissões calculadas.',
                imageIndex: 2
            },
            {
                title: 'Relatório de Movimentação',
                content: 'Filtre por profissional e período para gerar relatórios específicos de produção antes de efetuar o fechamento final.',
                imageIndex: 3
            },
            {
                title: 'Documento de Conferência',
                content: 'Gere a via impressa ou PDF do fechamento de caixa para auditoria, contendo o resumo final de entradas e saída de comissão.',
                imageIndex: 4
            },
            {
                title: 'Relatório Geral de Produção',
                content: 'Tenha uma visão macro de toda a equipe, com subtotais de vendas, comissões individuais e valores líquidos a pagar para cada profissional.',
                imageIndex: 5
            }
        ],
        tip: 'Realizar o fechamento diário evita erros de contabilidade e garante que seus profissionais recebam exatamente o que produziram.'
    },
    {
        id: 'fila',
        title: '7 - Sala de Atendimento (Fila)',
        icon: UserCheck,
        images: [
            '/tutorials/fila-1.png',
            '/tutorials/fila-2.png',
            '/tutorials/fila-3.png',
            '/tutorials/fila-4.png',
            '/tutorials/fila-5.png',
            '/tutorials/fila-6.png',
            '/tutorials/fila-7.png',
            '/tutorials/fila-8.png',
            '/tutorials/fila-9.png',
            '/tutorials/fila-step4.png',
            '/tutorials/fila-step9.png'
        ],
        description: 'Gerencie o fluxo de clientes que chegam para atendimento imediato, controle a sala de espera e realize vendas rápidas.',
        steps: [
            {
                title: 'Visão Geral da Sala',
                content: 'Acompanhe em tempo real quem está na lista de espera e quem já está em atendimento nas bancadas.',
                imageIndex: 0
            },
            {
                title: 'Fila Vazia',
                content: 'Quando não há clientes aguardando, o sistema exibe um estado limpo. Prepare-se para o próximo atendimento!',
                imageIndex: 1
            },
            {
                title: 'Controle de Chamada',
                content: 'Use o botão "Chamar Próximo" para mover o cliente do topo da lista diretamente para o seu atendimento.',
                imageIndex: 0
            },
            {
                title: 'Atendimento em Curso',
                content: 'Uma vez iniciado, você verá o cronômetro de tempo decorrido e a foto do cliente sendo atendido.',
                imageIndex: 9
            },
            {
                title: 'Registrando a Venda',
                content: 'Ao finalizar, selecione todos os serviços realizados e adicione produtos consumidos (como bebidas) para compor o valor total.',
                imageIndex: 3
            },
            {
                title: 'O que foi feito?',
                content: 'Confira a lista de itens selecionados e o valor total antes de prosseguir para o pagamento.',
                imageIndex: 5
            },
            {
                title: 'Formas de Pagamento',
                content: 'Escolha entre PIX, Dinheiro ou Cartão. O sistema já calcula o valor total automaticamente.',
                imageIndex: 6
            },
            {
                title: 'Pagamento PIX Dinâmico',
                content: 'Se escolher PIX, o sistema gera na hora o QR Code com o valor exato da venda para o cliente escanear.',
                imageIndex: 7
            },
            {
                title: 'Finalização',
                content: 'Após confirmar o recebimento, o atendimento é concluído e o profissional fica livre para o próximo da fila.',
                imageIndex: 10
            }
        ],
        tip: 'Usar o "Atendimento Direto" permite registrar vendas rápidas para clientes que não passaram pela lista de espera.'
    },
    {
        id: 'agendamento',
        title: '8 - Calendário & Agendamento',
        icon: Calendar,
        images: [
            '/tutorials/agendamento-1.png',
            '/tutorials/agendamento-2.png',
            '/tutorials/agendamento-3.png',
            '/tutorials/agendamento-4.png',
            '/tutorials/agendamento-5.png',
            '/tutorials/agendamento-6.png',
            '/tutorials/agendamento-7.png',
            '/tutorials/agendamento-8.png'
        ],
        description: 'Sua agenda completa. Marque horários, evite furos e tenha controle total sobre a produtividade da sua equipe.',
        steps: [
            {
                title: 'Visão da Agenda',
                content: 'Visualize todos os compromissos do dia de forma organizada. Use as setas laterais para navegar entre as datas ou o botão "Hoje" para retornar ao dia atual.',
                imageIndex: 0
            },
            {
                title: 'Novo Agendamento: Serviços',
                content: 'Ao clicar em "Novo Agendamento", o primeiro passo é selecionar os serviços desejados. O sistema calcula automaticamente a duração total e o valor.',
                imageIndex: 1
            },
            {
                title: 'Escolha do Profissional',
                content: 'Selecione qual profissional realizará o atendimento. O sistema mostra apenas aqueles habilitados para os serviços escolhidos no passo anterior.',
                imageIndex: 2
            },
            {
                title: 'Data e Horário',
                content: 'Escolha o dia no calendário e o horário disponível. O sistema cruza as agendas para garantir que não haja conflitos de horário.',
                imageIndex: 3
            },
            {
                title: 'Confirmação e Cliente',
                content: 'Revise o resumo do agendamento e insira os dados do cliente. O telefone é essencial para que o sistema envie lembretes automáticos via WhatsApp.',
                imageIndex: 4
            },
            {
                title: 'Gestão de Compromissos',
                content: 'Após criado, o agendamento aparece em destaque. Você pode "Notificar" o cliente manualmente ou "Iniciar" o atendimento assim que ele chegar.',
                imageIndex: 5
            },
            {
                title: 'Atendimento em Curso',
                content: 'Durante o atendimento, o status muda para "Em Atendimento", permitindo que você acompanhe quem está na cadeira em tempo real.',
                imageIndex: 6
            },
            {
                title: 'Finalização e Venda',
                content: 'Ao "Finalizar", o sistema abre o caixa para você confirmar os serviços realizados e adicionar produtos extras (como bebidas) antes de receber o pagamento.',
                imageIndex: 7
            }
        ],
        tip: 'Sempre peça o WhatsApp do cliente. Lembretes automáticos reduzem em até 40% a taxa de desistência e esquecimento.'
    },
    {
        id: 'financeiro',
        title: '9 - Controle Financeiro',
        icon: BarChart3,
        images: [
            '/tutorials/financeiro-extrato.png',
            '/tutorials/financeiro-pendentes.png',
            '/tutorials/financeiro-despesa.png',
            '/tutorials/financeiro-dre.png'
        ],
        description: 'Tenha total clareza sobre a saúde financeira do seu negócio. Acompanhe entradas, saídas e lucro real.',
        steps: [
            {
                title: 'Fluxo de Caixa (Extrato)',
                content: 'Consulte o histórico completo de todas as vendas e pagamentos realizados. Veja o método de pagamento, status de cada transação e o saldo líquido disponível.',
                imageIndex: 0
            },
            {
                title: 'Contas a Pagar (Pendentes)',
                content: 'Acompanhe as despesas agendadas e os fechamentos de profissionais que ainda não foram pagos. O sistema destaca visualmente o que está pendente no dia.',
                imageIndex: 1
            },
            {
                title: 'Lançamento de Despesas',
                content: 'Registre custos fixos (aluguel, luz) ou variáveis (suprimentos). Você pode configurar despesas recorrentes para aparecerem automaticamente todo mês.',
                imageIndex: 2
            },
            {
                title: 'Visão DRE (Lucro e Perda)',
                content: 'Gere relatórios detalhados demonstrando o resultado do exercício. Visualize o total de receitas, detalhamento de despesas e seu lucro líquido final.',
                imageIndex: 3
            }
        ],
        tip: 'Alimente o sistema com todas as suas despesas. Só assim o cálculo de "Lucro Líquido" será 100% fiel à realidade do seu bolso.'
    },
    {
        id: 'estoque',
        title: '10 - Controle de Estoque',
        icon: ShoppingBag,
        images: [
            '/tutorials/estoque-1.png',
            '/tutorials/estoque-2.png',
            '/tutorials/estoque-3.png',
            '/tutorials/estoque-4.png',
            '/tutorials/estoque-5.png'
        ],
        description: 'Gestão inteligente de suprimentos e produtos de revenda. Controle seu patrimônio e nunca perca uma venda por falta de produto.',
        steps: [
            {
                title: 'Painel de Estoque',
                content: 'Tenha uma visão geral do seu patrimônio: Total de itens, valor total em custo e potencial de venda. O sistema alerta automaticamente quais produtos estão com "Estoque Baixo".',
                imageIndex: 0
            },
            {
                title: 'Resumo de Vendas',
                content: 'Monitore quais produtos são mais vendidos e o faturamento gerado por cada um. Isso ajuda a decidir quais itens merecem mais destaque ou recompra.',
                imageIndex: 1
            },
            {
                title: 'Entrada de Mercadoria',
                content: 'Ao repor seu estoque, registre a entrada informando o custo unitário. Isso é vital para que o sistema calcule sua margem de lucro real corretamente.',
                imageIndex: 2
            },
            {
                title: 'Relatório de Movimentações',
                content: 'Acompanhe cada saída (venda) ou entrada de forma detalhada. O relatório mostra o horário exato e quem realizou a operação, garantindo total segurança.',
                imageIndex: 3
            },
            {
                title: 'Inventário e Patrimônio',
                content: 'Gere relatórios de conferência para Auditoria. Saiba exatamente quanto dinheiro você tem "parado" em prateleira em valor de custo e de venda.',
                imageIndex: 4
            }
        ],
        tip: 'Produtos parados são dinheiro parado. Use os relatórios de movimentação para identificar itens de baixa saída e crie promoções para girar seu estoque.'
    },
    {
        id: 'pwa',
        title: '11 - App do Cliente (PWA)',
        icon: Zap,
        images: ['/tutorials/pwa-1.png', '/tutorials/pwa-2.png', '/tutorials/pwa-3.png'],
        description: 'Ofereça uma experiência premium. Seus clientes agendam em segundos, sem precisar baixar nada na App Store ou Play Store.',
        steps: [
            {
                title: 'O que é um PWA?',
                content: 'Diferente de apps comuns, o PWA funciona direto no navegador mas se comporta como um app instalado, ocupando pouco espaço e enviando notificações reais.',
                imageIndex: 0
            },
            {
                title: 'Vantagens do App',
                content: 'Histórico de agendamentos, ticket virtual da fila em tempo real, lembretes push e facilidade de agendamento recorrente sem login burocrático.',
                imageIndex: 1
            },
            {
                title: 'Notificações Push',
                content: 'O cliente recebe avisos diretamente na tela de bloqueio quando sua vez está chegando ou quando um agendamento é confirmado.',
                imageIndex: 2
            }
        ],
        tip: 'Incentive seus clientes a instalarem o App. Isso aumenta a taxa de retorno em até 35%.'
    },
    {
        id: 'pwa-ios',
        title: '12 - Instalando no iPhone (iOS)',
        icon: Zap,
        images: [
            '/tutorials/pwa-ios-1.png',
            '/tutorials/pwa-ios-2.png',
            '/tutorials/pwa-ios-3.png',
            '/tutorials/pwa-ios-4.png'
        ],
        description: 'Guia para orientar usuários de iPhone a instalarem o link da barbearia como um aplicativo na tela de início.',
        steps: [
            {
                title: 'Abrir no Safari',
                content: 'O cliente deve abrir o link da barbearia usando o navegador Safari (ícone da bússola).',
                imageIndex: 0
            },
            {
                title: 'Menu Compartilhar',
                content: 'Toque no ícone de "Compartilhar" (o quadrado com uma seta para cima) na barra inferior do navegador.',
                imageIndex: 1
            },
            {
                title: 'Adicionar à Tela de Início',
                content: 'Role a lista de opções para baixo e procure por "Adicionar à Tela de Início".',
                imageIndex: 2
            },
            {
                title: 'Confirmar e Abrir',
                content: 'Toque em "Adicionar" no canto superior direito. Agora o ícone da barbearia aparecerá junto com seus outros aplicativos.',
                imageIndex: 3
            }
        ],
        tip: 'No iPhone, as notificações Push só funcionam se o cliente adicionar o site à Tela de Início.'
    },
    {
        id: 'fila-cliente',
        title: '13 - Como Entrar na Fila (Cliente)',
        icon: UserCheck,
        images: [
            '/tutorials/queue-client-1.png',
            '/tutorials/queue-client-2.png',
            '/tutorials/queue-client-3.png',
            '/tutorials/queue-client-4.png',
            '/tutorials/queue-client-5.png'
        ],
        description: 'Passo a passo do cliente para entrar na lista de espera digital pelo celular.',
        steps: [
            {
                title: 'Tela Inicial',
                content: 'O cliente clica no botão principal "Entrar na Fila" para iniciar o processo.',
                imageIndex: 0
            },
            {
                title: 'Seleção de Barbeiro',
                content: 'Ele pode escolher um profissional específico ou selecionar "Qualquer Barbeiro" para ser atendido por quem liberar primeiro.',
                imageIndex: 1
            },
            {
                title: 'Detalhes e Espera',
                content: 'Ao selecionar o profissional, o sistema mostra o tempo estimado e quantas pessoas estão na frente.',
                imageIndex: 2
            },
            {
                title: 'Confirmação na Fila',
                content: 'O cliente agora vê sua posição exata e pode acompanhar o cronômetro de qualquer lugar.',
                imageIndex: 3
            },
            {
                title: 'Aviso de Chamada',
                content: 'Quando o barbeiro o chama, o celular vibra e mostra o aviso: "Sua vez chegou!".',
                imageIndex: 4
            }
        ],
        tip: 'Explique aos clientes que eles podem sair para tomar um café e acompanhar a fila pelo celular sem perder a vez.'
    },
    {
        id: 'agendamento-cliente',
        title: '14 - Como Agendar (Cliente)',
        icon: Calendar,
        images: [
            '/tutorials/appt-client-1.png',
            '/tutorials/appt-client-2.png',
            '/tutorials/appt-client-3.png',
            '/tutorials/appt-client-4.png',
            '/tutorials/appt-client-5.png'
        ],
        description: 'Guia para o cliente realizar um agendamento futuro de forma autônoma pelo App.',
        steps: [
            {
                title: 'Escolha de Serviços',
                content: 'O cliente seleciona um ou mais serviços que deseja realizar. O valor e o tempo total são atualizados.',
                imageIndex: 0
            },
            {
                title: 'Seleção do Profissional',
                content: 'Ele escolhe o profissional de sua preferência ou "Qualquer um" para maior disponibilidade.',
                imageIndex: 1
            },
            {
                title: 'Data e Horário',
                content: 'O cliente navega pelo calendário e escolhe um dos horários livres mostrados pelo sistema.',
                imageIndex: 2
            },
            {
                title: 'Revisão e Confirmar',
                content: 'Uma tela de resumo aparece com todos os detalhes. Basta clicar em "Confirmar" para reservar o horário.',
                imageIndex: 3
            },
            {
                title: 'Agendamento Realizado',
                content: 'Tudo pronto! O agendamento é registrado e o cliente pode visualizá-lo em "Meus Agendamentos".',
                imageIndex: 4
            }
        ],
        tip: 'O sistema evita "conflito de horários" e garante que nenhum serviço seja marcado em horários já ocupados.'
    }
];

export default function TutoriaisPage() {
    const { session, loading, tenant } = useAuth();
    const router = useRouter();

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !session) {
            router.push('/login');
        }
    }, [session, loading, router]);

    const texts = getBusinessTexts(tenant?.business_type);
    const tutorials = getTutorialContent(texts, tenant);

    const [activeTab, setActiveTab] = useState(tutorials[0].id);
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const [isConfigExpanded, setIsConfigExpanded] = useState(true);

    if (loading || !session) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const activeTutorial = tutorials.find(t => t.id === activeTab) || tutorials[0];

    // Groups logic for the sidebar
    const configItems = tutorials.filter(t => t.id.startsWith('config-'));
    const mainItems = tutorials.filter(t => !t.id.startsWith('config-'));

    // Search Logic
    const searchResults = searchQuery.length > 2
        ? tutorials.flatMap(tutorial => {
            const matches: any[] = [];

            // Match tutorial title/desc
            if (tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tutorial.description.toLowerCase().includes(searchQuery.toLowerCase())) {
                matches.push({
                    type: 'tutorial',
                    id: tutorial.id,
                    title: tutorial.title,
                    subtitle: tutorial.description
                });
            }

            // Match steps
            tutorial.steps.forEach((step, index) => {
                if (step.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    step.content.toLowerCase().includes(searchQuery.toLowerCase())) {
                    matches.push({
                        type: 'step',
                        id: tutorial.id,
                        stepIndex: index,
                        title: step.title,
                        subtitle: tutorial.title
                    });
                }
            });

            return matches;
        }).slice(0, 6)
        : [];

    const handleTabChange = (newId: string) => {
        setActiveTab(newId);
        setSearchQuery('');
        setShowResults(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSelectResult = (result: any) => {
        setActiveTab(result.id);
        setSearchQuery('');
        setShowResults(false);

        // Se for um passo, esperar a tab mudar e scrollar
        if (result.type === 'step') {
            setTimeout(() => {
                const element = document.getElementById(`step-${result.stepIndex}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Adicionar uma breve animação de destaque
                    element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-4', 'ring-offset-slate-950');
                    setTimeout(() => {
                        element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-4', 'ring-offset-slate-950');
                    }, 2000);
                }
            }, 100);
        } else {
            // Se for tutorial, scrollar para o topo do conteúdo
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30">
            <div className="max-w-[1600px] mx-auto px-4 md:px-10 py-8 lg:py-12">
                <div className="space-y-10 animate-in fade-in duration-500 pb-24 relative">

                    {/* Image Modal (Lightbox) */}
                    {selectedImageIndex !== null && (
                        <div
                            className="fixed inset-0 z-[100] bg-slate-950/95 flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300 backdrop-blur-xl"
                            onClick={() => setSelectedImageIndex(null)}
                        >
                            <button className="absolute top-8 right-8 p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-100 hover:bg-slate-800 transition-all z-[110] shadow-2xl">
                                <X className="w-6 h-6" />
                            </button>

                            {/* Navigation Arrows */}
                            {activeTutorial.images.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedImageIndex((prev) => (prev === 0 ? activeTutorial.images.length - 1 : prev! - 1));
                                        }}
                                        className="absolute left-4 md:left-8 p-4 rounded-full bg-slate-900/80 border border-slate-800 text-slate-100 hover:bg-blue-600 transition-all z-[110] shadow-2xl"
                                    >
                                        <ChevronLeft className="w-8 h-8" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedImageIndex((prev) => (prev === activeTutorial.images.length - 1 ? 0 : prev! + 1));
                                        }}
                                        className="absolute right-4 md:right-8 p-4 rounded-full bg-slate-900/80 border border-slate-800 text-slate-100 hover:bg-blue-600 transition-all z-[110] shadow-2xl"
                                    >
                                        <ChevronRight className="w-8 h-8" />
                                    </button>
                                </>
                            )}

                            <div className="relative w-full h-full" onClick={(e) => e.stopPropagation()}>
                                <Image
                                    src={activeTutorial.images[selectedImageIndex]}
                                    alt="Visualização ampliada"
                                    fill
                                    className="object-contain shadow-2xl"
                                    priority
                                />
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 border border-slate-800 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest text-slate-100">
                                    Foto {selectedImageIndex + 1} de {activeTutorial.images.length}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/5 pb-8">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-blue-500 font-black uppercase tracking-[0.2em] text-[10px]">
                                <CheckCircle2 className="w-4 h-4" />
                                Centro de Treinamento
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-100 tracking-tight leading-none uppercase">
                                Manual do <span className="text-blue-600">Sistema</span>
                            </h1>
                            <p className="text-slate-500 font-medium text-sm mt-2 max-w-xl">
                                Aprenda a dominar todas as ferramentas do 791 Barber com nosso guia passo a passo detalhado e visual.
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full lg:w-96 group">
                            <div className="relative flex items-center">
                                <Search className="absolute left-4 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="O que você deseja saber hoje?"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowResults(true);
                                    }}
                                    onFocus={() => setShowResults(true)}
                                    className="w-full bg-slate-900/60 border-2 border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all font-bold shadow-xl shadow-black/20"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-4 p-1 rounded-full hover:bg-slate-800 transition-colors">
                                        <X className="w-3 h-3 text-slate-400" />
                                    </button>
                                )}
                            </div>

                            {/* Search Results Overlay */}
                            {showResults && searchQuery.length > 2 && (
                                <Card className="absolute top-full mt-2 w-full bg-slate-900 border-2 border-slate-800 shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/50 animate-in slide-in-from-top-2 duration-300 rounded-2xl">
                                    {searchResults.length > 0 ? (
                                        searchResults.map((result, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSelectResult(result)}
                                                className="w-full text-left p-4 hover:bg-blue-600/10 transition-colors flex items-center gap-4 group"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-all">
                                                    {result.type === 'tutorial' ? <LayoutDashboard className="w-5 h-5 text-blue-400 group-hover:text-white" /> : <Zap className="w-5 h-5 text-orange-400 group-hover:text-white" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-slate-200 truncate group-hover:text-blue-400 transition-colors uppercase tracking-tight">{result.title}</p>
                                                    <p className="text-xs text-slate-500 truncate group-hover:text-slate-400 transition-colors">{result.subtitle}</p>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-slate-500/50">
                                            <SearchX className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            <p className="text-xs font-black uppercase tracking-widest">Nenhum resultado encontrado</p>
                                        </div>
                                    )}
                                </Card>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                        {/* Tree Navigation Sidebar */}
                        <div className="lg:col-span-3 space-y-2 lg:sticky lg:top-8">

                            {/* Configurações Group (Tree) */}
                            <div className="space-y-1.5 mb-6">
                                <button
                                    onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-5 py-4 rounded-2xl text-[11px] font-black transition-all bg-slate-900/60 border border-slate-800/50 text-slate-100 uppercase tracking-widest shadow-lg",
                                        isConfigExpanded ? "border-blue-500/40 bg-blue-600/10 ring-1 ring-blue-500/20" : "hover:border-slate-600"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn("p-2 rounded-lg transition-colors", isConfigExpanded ? "bg-blue-600 text-white" : "bg-slate-800 text-blue-500")}>
                                            <LayoutDashboard className="w-4 h-4" />
                                        </div>
                                        1 - CONFIGURAÇÕES
                                    </div>
                                    {isConfigExpanded ? <ChevronDown className="w-4 h-4 text-blue-500" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
                                </button>

                                {isConfigExpanded && (
                                    <div className="pl-6 space-y-1.5 border-l-2 border-slate-800/50 ml-7 mt-2 animate-in slide-in-from-left-4 duration-500">
                                        {configItems.map((tutorial) => (
                                            <button
                                                key={tutorial.id}
                                                onClick={() => handleTabChange(tutorial.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-4 px-5 py-3 rounded-xl text-xs font-black transition-all text-left uppercase tracking-tight",
                                                    activeTab === tutorial.id
                                                        ? "bg-blue-600 text-white shadow-xl shadow-blue-600/30 translate-x-1"
                                                        : "text-slate-500 hover:text-slate-200 hover:bg-slate-900/60"
                                                )}
                                            >
                                                <span className="truncate">{tutorial.title.split(': ')[1] || tutorial.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Main Items */}
                            <div className="space-y-1.5">
                                {mainItems.map((tutorial) => (
                                    <button
                                        key={tutorial.id}
                                        onClick={() => handleTabChange(tutorial.id)}
                                        className={cn(
                                            "w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black transition-all text-left uppercase tracking-widest shadow-lg",
                                            activeTab === tutorial.id
                                                ? "bg-blue-600 text-white shadow-2xl shadow-blue-600/30 translate-x-2 ring-1 ring-blue-500/50"
                                                : "bg-slate-950/60 border border-slate-800/40 text-slate-500 hover:text-slate-100 hover:border-slate-600 hover:bg-slate-900/40"
                                        )}
                                    >
                                        <div className={cn("p-2 rounded-lg transition-colors", activeTab === tutorial.id ? "bg-white/10 text-white" : "bg-slate-800/50 text-blue-500/80")}>
                                            <tutorial.icon className="w-4 h-4 shrink-0" />
                                        </div>
                                        <span className="truncate">{tutorial.title}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="mt-8 p-6 rounded-3xl bg-gradient-to-br from-blue-600/10 via-slate-900 to-purple-600/10 border border-white/5 relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-600/20 transition-all duration-700" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 text-blue-400 font-black text-[10px] uppercase mb-3 tracking-widest">
                                        <Zap className="w-4 h-4 fill-blue-400/20" />
                                        Dica de Especialista
                                    </div>
                                    <p className="text-xs text-slate-300 font-bold leading-relaxed uppercase italic">
                                        "{activeTutorial.tip}"
                                    </p>
                                </div>
                            </div>

                            <footer className="pt-12 pb-4 text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">
                                    Developed by <span className="text-slate-600">791 Barber</span>
                                </p>
                            </footer>
                        </div>

                        {/* Content Area - Detailed Manual List */}
                        <div className="lg:col-span-9 space-y-8 pb-32">
                            {/* Tutorial Description & Images */}
                            <Card className="bg-slate-900/50 border-white/5 overflow-hidden rounded-[2rem] p-8 md:p-10 shadow-3xl backdrop-blur-xl relative">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                                <div className="relative z-10 flex flex-col xl:flex-row gap-10 items-start">
                                    <div className="flex-1 space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20">
                                                <activeTutorial.icon className="w-7 h-7" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-blue-500 font-black text-[10px] uppercase tracking-[0.2em] mb-1">Módulo Selecionado</span>
                                                <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tighter leading-tight">
                                                    {activeTutorial.title}
                                                </h2>
                                            </div>
                                        </div>
                                        <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-2xl">
                                            {activeTutorial.description}
                                        </p>
                                    </div>

                                    {/* Image Gallery With Lightbox Trigger */}
                                    {/* Image Gallery - ALBUM STYLE */}
                                    <div className="flex gap-4 overflow-x-auto pb-4 shrink-0 w-full lg:max-w-md xl:max-w-[420px] bg-slate-900/40 p-4 rounded-3xl border border-white/5 snap-x scrollbar-hide">
                                        {activeTutorial.images.map((img, i) => (
                                            <div
                                                key={i}
                                                onClick={() => {
                                                    setSelectedImageIndex(i);
                                                    document.getElementById(`step-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }}
                                                className="relative w-32 h-32 md:w-40 md:h-40 bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-800 hover:border-blue-500 hover:scale-[1.02] transition-all group cursor-zoom-in shadow-xl shadow-black/40 shrink-0 snap-center"
                                            >
                                                <Image
                                                    src={img}
                                                    alt={`Referência ${i + 1}`}
                                                    fill
                                                    className="object-contain p-2 transition-all duration-700 opacity-80 group-hover:opacity-100"
                                                />

                                                <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                    <Maximize2 className="w-8 h-8 text-white/50" />
                                                </div>
                                                <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-slate-950/90 border border-white/10 text-[8px] font-black text-white/60 uppercase tracking-widest">
                                                    FOTO {i + 1}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>

                            {/* Step-by-Step Detailed List */}
                            <div className="space-y-6">
                                {activeTutorial.steps.map((step, i) => (
                                    <div key={i} id={`step-${i}`} className="group relative pl-16 transition-all duration-500 rounded-[2.5rem]">
                                        {/* Connector Line */}
                                        {i !== activeTutorial.steps.length - 1 && (
                                            <div className="absolute left-[31px] top-12 bottom-0 w-1 bg-gradient-to-b from-slate-800 to-transparent rounded-full" />
                                        )}

                                        {/* Step Number Indicator */}
                                        <div className="absolute left-0 top-0 w-16 h-16 rounded-[1.5rem] bg-slate-900 border-2 border-slate-800 flex flex-col items-center justify-center transition-all group-hover:border-blue-600 group-hover:bg-blue-600/5 group-hover:shadow-2xl group-hover:shadow-blue-600/20 group-hover:scale-105">
                                            <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest group-hover:text-blue-400">Passo</span>
                                            <span className="text-2xl font-black text-slate-100 group-hover:text-white leading-none mt-1">
                                                {String(i + 1).padStart(2, '0')}
                                            </span>
                                        </div>

                                        <Card className="bg-slate-900/30 border-2 border-slate-800/30 p-8 group-hover:bg-slate-900/50 group-hover:border-slate-700/50 transition-all rounded-[2rem] shadow-xl group-hover:shadow-2xl">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                                                <h4 className="text-xl font-black text-white uppercase tracking-tight leading-none">
                                                    {step.title}
                                                </h4>
                                                {step.imageIndex !== undefined && (
                                                    <button
                                                        onClick={() => setSelectedImageIndex(step.imageIndex!)}
                                                        className="self-start md:self-auto text-[10px] font-black text-slate-400 border-2 border-slate-800 px-4 py-2 rounded-xl uppercase hover:border-blue-600 hover:text-white hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg"
                                                    >
                                                        Visualizar Guia Visual {step.imageIndex + 1}
                                                        <Maximize2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-base text-slate-400 font-bold leading-relaxed group-hover:text-slate-200">
                                                {step.content}
                                            </p>
                                        </Card>
                                    </div>
                                ))}
                            </div>

                            {/* Bottom Quick Access */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-12">
                                {[
                                    { title: 'Configurar Identidade', icon: LayoutDashboard, color: 'text-blue-500' },
                                    { title: `Gerir ${texts.professionals}`, icon: Users, color: 'text-purple-500' },
                                    { title: 'Otimizar Agenda', icon: Calendar, color: 'text-emerald-500' },
                                    { title: 'Monitorar Lucro', icon: BarChart3, color: 'text-orange-500' }
                                ].map((item, i) => (
                                    <div key={i} className="p-6 rounded-3xl bg-slate-950/60 border border-slate-800 hover:border-blue-600/50 hover:bg-slate-900/60 transition-all cursor-default flex flex-col gap-4 shadow-xl">
                                        <div className={cn("p-3 rounded-2xl bg-slate-900/80 w-fit", item.color)}>
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-black text-slate-300 uppercase tracking-widest">{item.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
