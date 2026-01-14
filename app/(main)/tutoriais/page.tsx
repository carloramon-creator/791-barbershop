'use client';

import { useState } from 'react';
import {
    LayoutDashboard,
    UserCheck,
    Calendar,
    Users,
    BarChart3,
    MessageSquare,
    ChevronRight,
    CheckCircle2,
    Lightbulb,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-provider';
import { getBusinessTexts } from '@/lib/business-dictionary';

const TUTORIALS = [
    {
        id: 'config-geral',
        title: '1.1 - Configurações: Geral',
        icon: LayoutDashboard,
        image: '/tutorials/config-geral.png',
        description: 'Configure as informações básicas da sua barbearia, como nome, endereço, contatos e redes sociais.',
        steps: [
            'Acesse o menu Configurações > Geral.',
            'Preencha o nome da sua barbearia e escolha uma imagem de logo atraente.',
            'Defina o tipo de negócio (Barbearia ou Salão de Beleza) para ajustar os textos do sistema.',
            'Insira o endereço completo para que seus clientes possam te encontrar no mapa.',
            'Atualize seus links de redes sociais e WhatsApp para facilitar o contato.',
            'Não esqueça de clicar em "Salvar Alterações" no final da página.'
        ],
        tip: 'Mantenha seu endereço e contatos sempre atualizados. Isso é fundamental para que novos clientes cheguem até você sem dificuldades.'
    },
    {
        id: 'config-usuarios',
        title: '1.2 - Configurações: Usuários',
        icon: Users,
        image: '/tutorials/config-usuarios.png',
        description: 'Gerencie quem tem acesso ao painel administrativo e quais são seus níveis de acesso.',
        steps: [
            'Navegue até Configurações > Usuários.',
            'Veja a lista de todos os administradores atuais do sistema.',
            'Adicione novos usuários preenchendo o e-mail e definindo o perfil de acesso.',
            'Remova ou edite usuários antigos para manter a segurança do seu negócio.',
            'Lembre-se: Usuários Admin têm controle total, enquanto outros perfis podem ter restrições.'
        ],
        tip: 'Evite compartilhar a mesma senha de administrador. Crie uma conta individual para cada pessoa que precise gerenciar o sistema.'
    },
    {
        id: 'config-permissoes',
        title: '1.3 - Configurações: Permissões',
        icon: UserCheck,
        image: '/tutorials/config-permissoes.png',
        description: 'Defina exatamente o que cada cargo (Barbeiro, Gerente, etc.) pode ver ou fazer no sistema.',
        steps: [
            'Acesse Configurações > Permissões.',
            'Selecione o cargo que deseja configurar no menu lateral.',
            'Marque ou desmarque as permissões específicas (vender, excluir agendamento, ver financeiro, etc.).',
            'As alterações são aplicadas instantaneamente para todos os usuários daquele cargo.',
            'Garanta que cada profissional tenha acesso apenas ao que é necessário para o trabalho dele.'
        ],
        tip: 'Limite o acesso ao módulo "Financeiro" apenas para gerentes ou donos para manter a privacidade dos dados da sua empresa.'
    },
    {
        id: 'config-planos',
        title: '1.4 - Configurações: Planos',
        icon: BarChart3,
        image: '/tutorials/config-planos.png',
        description: 'Gerencie sua assinatura do 791 Barber, veja faturas e adicione novos recursos (Add-ons).',
        steps: [
            'Vá em Configurações > Plano para ver o status da sua assinatura atual.',
            'Acompanhe o histórico de faturas e baixe os recibos/notas fiscais (NFS-e).',
            'Descubra o botão "Turbinar Pacote" para adicionar módulos extras como Estoque ou WhatsApp Automático.',
            'Verifique data de vencimento e métodos de pagamento cadastrados.',
            'Faça o upgrade do seu plano clicando em "Mudar Plano" para liberar mais recursos.'
        ],
        tip: 'Ative o "WhatsApp Automático" para reduzir faltas em até 80% através de lembretes inteligentes enviados direto para o cliente.'
    },
    {
        id: 'produtos',
        title: '2 - Gestão de Produtos',
        icon: Lightbulb,
        image: '/tutorials/produtos.png',
        description: 'Controle seu catálogo de produtos para venda rápida na recepção.',
        steps: [
            'Acesse o menu "Produtos" para ver todos os itens cadastrados.',
            'Clique em "Novo Produto" para adicionar itens como Pomadas, Shampoos ou Bebidas.',
            'Defina o preço de venda e o preço de custo para calcular seu lucro.',
            'Organize por categorias para facilitar a busca na hora da venda.',
            'Mantenha as fotos dos produtos atualizadas para facilitar a identificação da equipe.'
        ],
        tip: 'Produtos por impulso na bancada aumentam o faturamento médio em até 25%. Registre tudo no sistema para não perder o controle.'
    },
    {
        id: 'servicos',
        title: '3 - Gestão de Serviços',
        icon: Zap,
        image: '/tutorials/servicos.png',
        description: 'Configure seu cardápio de serviços com preços e duração personalizados.',
        steps: [
            'Vá em "Serviços" para gerenciar o que sua barbearia oferece.',
            'Crie categorias como "Cabelo", "Barba" ou "Combos".',
            'Defina a duração exata de cada serviço para que sua agenda seja calculada com precisão.',
            'Coloque descrições claras para que o cliente saiba exatamente o que está agendando.',
            'Ative ou desative serviços sazonalmente conforme a demanda.'
        ],
        tip: 'Crie serviços do tipo "Combo" com um pequeno desconto. Isso incentiva o cliente a fazer mais procedimentos em uma única visita.'
    },
    {
        id: 'profissionais',
        title: '4 - Profissionais (Equipe)',
        icon: Users,
        image: '/tutorials/staff.png',
        description: 'Cadastre seus barbeiros e profissionais, configure comissões e horários.',
        steps: [
            'Acesse "Equipe" para cadastrar novos profissionais.',
            'Defina a comissão individual de cada um para serviços e produtos.',
            'Configure os horários de trabalho e dias de folga de cada profissional.',
            'Vincule quais serviços cada profissional está apto a realizar.',
            'Envie o link de acesso para que eles vejam suas próprias agendas pelo celular.'
        ],
        tip: 'Uma foto profissional e amigável de cada colaborador no sistema aumenta a taxa de agendamento online, transmitindo mais confiança.'
    },
    {
        id: 'fila',
        title: '5 - Fila de Espera',
        icon: UserCheck,
        image: '/tutorials/queue.png',
        description: 'Gerencie clientes que chegam sem horário marcado com agilidade.',
        steps: [
            'Abra a tela de "Fila de Espera" para gerenciar o fluxo do dia.',
            'Adicione o cliente, selecione o profissional e o serviço desejado.',
            'O sistema calcula o tempo estimado de espera automaticamente.',
            'Mova ou reordene os clientes na fila conforme a necessidade do momento.',
            'Inicie o atendimento com um clique para contar o tempo real de serviço.'
        ],
        tip: 'Mantenha um tablet na recepção com a fila aberta. Isso dá transparência e organização extra para quem está esperando.'
    },
    {
        id: 'agendamento',
        title: '6 - Calendário & Agendamento',
        icon: Calendar,
        image: '/tutorials/appointments.png',
        description: 'Sua agenda completa. Marque horários, arraste e solte atendimentos e evite furos.',
        steps: [
            'Acesse "Agendamentos" para ver a visão geral da semana ou do dia.',
            'Clique em qualquer espaço vazio para criar um novo agendamento rápido.',
            'Arraste um compromisso para outro horário ou profissional se precisar realocar.',
            'Bloqueie horários para almoço ou compromissos pessoais clicando no ícone de "Bloqueio".',
            'Acompanhe o status (confirmado, em espera, finalizado) por cores intuitivas.'
        ],
        tip: 'Sempre que possível, agende a próxima visita do cliente logo após o pagamento. Isso garante a retenção e previsibilidade de caixa.'
    },
    {
        id: 'financeiro',
        title: '7 - Controle Financeiro',
        icon: BarChart3,
        image: '/tutorials/finance.png',
        description: 'Acompanhe seu fluxo de caixa, comissões e lucro líquido.',
        steps: [
            'Vá em "Financeiro" para ver o resumo de entradas e saídas.',
            'Registre despesas como aluguel, luz e compras de suprimentos.',
            'Consulte o fechamento de cada profissional para pagar as comissões corretamente.',
            'Visualize gráficos de faturamento por período para entender o crescimento do negócio.',
            'Use o filtro por método de pagamento para conciliar suas máquinas de cartão.'
        ],
        tip: 'Lançar as despesas diariamente evita surpresas no fim do mês. Um financeiro organizado é o segredo para expandir sua barbearia.'
    },
    {
        id: 'estoque',
        title: '8 - Controle de Estoque',
        icon: Lightbulb,
        image: '/tutorials/finance.png',
        description: 'Nunca fique sem produtos. Controle entradas, saídas e alertas de estoque baixo.',
        steps: [
            'Acesse o módulo de "Estoque" (disponível como Add-on).',
            'Dê entrada em novas mercadorias informando a quantidade e valor pago ao fornecedor.',
            'O sistema abate automaticamente os itens quando uma venda de produto é finalizada.',
            'Receba alertas quando um item atingir a "Quantidade Mínima" de segurança.',
            'Realize inventários periódicos para ajustar quebras ou perdas.'
        ],
        tip: 'Produtos parados em estoque são dinheiro parado. Use os relatórios para identificar o que não vende e fazer promoções.'
    }
];

export default function TutoriaisPage() {
    const { tenant } = useAuth();
    const texts = getBusinessTexts(tenant?.business_type);
    const [activeTab, setActiveTab] = useState(TUTORIALS[0].id);

    const activeTutorial = TUTORIALS.find(t => t.id === activeTab) || TUTORIALS[0];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Header Section */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-blue-500 font-black uppercase tracking-widest text-[10px]">
                    <CheckCircle2 className="w-4 h-4" />
                    Guia Visual de Utilização
                </div>
                <h1 className="text-4xl font-black text-slate-100 tracking-tight italic">
                    MANUAL DO <span className="text-blue-600">SISTEMA</span>
                </h1>
                <p className="text-slate-400 font-medium max-w-2xl leading-relaxed">
                    Bem-vindo ao centro de ajuda da 791 {tenant?.business_type === 'beauty_salon' ? 'Beauty' : 'Barber'}.
                    Explore cada módulo abaixo para extrair 100% do potencial da sua plataforma de gestão.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-3 space-y-2">
                    {TUTORIALS.map((tutorial) => (
                        <button
                            key={tutorial.id}
                            onClick={() => setActiveTab(tutorial.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-black transition-all transition-all duration-300",
                                activeTab === tutorial.id
                                    ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20 translate-x-2"
                                    : "bg-slate-900/40 border border-slate-800/50 text-slate-400 hover:text-slate-100 hover:border-slate-700 hover:translate-x-1"
                            )}
                        >
                            <tutorial.icon className={cn("w-5 h-5", activeTab === tutorial.id ? "text-white" : "text-blue-500")} />
                            {tutorial.title}
                            {activeTab === tutorial.id && <ChevronRight className="ml-auto w-4 h-4 opacity-50" />}
                        </button>
                    ))}

                    <div className="mt-8 p-6 rounded-3xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20">
                        <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase mb-3">
                            <Lightbulb className="w-4 h-4" />
                            Dica Pro
                        </div>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed italic">
                            "A configuração completa da sua equipe e serviços é o primeiro passo para o sucesso."
                        </p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-9 space-y-6">
                    <Card className="bg-slate-900/60 border-slate-800 overflow-hidden backdrop-blur-md rounded-[2.5rem] shadow-2xl">
                        <div className="grid grid-cols-1 xl:grid-cols-2">
                            {/* Illustration Side */}
                            <div className="relative h-[300px] xl:h-auto overflow-hidden bg-slate-950/40">
                                <Image
                                    src={activeTutorial.image}
                                    alt={activeTutorial.title}
                                    fill
                                    className="object-cover opacity-90 transition-transform duration-700 hover:scale-105"
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent hidden xl:block border-r border-slate-800/50" />
                            </div>

                            {/* Info Side */}
                            <div className="p-8 xl:p-12 space-y-8 bg-slate-900/40">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-500">
                                            <activeTutorial.icon className="w-6 h-6" />
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-100 uppercase italic tracking-tighter">
                                            {activeTutorial.title}
                                        </h2>
                                    </div>
                                    <p className="text-slate-300 font-bold leading-relaxed">
                                        {activeTutorial.description}
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                        <Zap className="w-4 h-4 fill-current" />
                                        Como utilizar (Passo a Passo)
                                    </h3>
                                    <ul className="space-y-4">
                                        {activeTutorial.steps.map((step, idx) => (
                                            <li key={idx} className="flex gap-4 group">
                                                <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-blue-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-colors">
                                                    {idx + 1}
                                                </div>
                                                <p className="text-sm font-medium text-slate-400 leading-snug group-hover:text-slate-200 transition-colors">
                                                    {step}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/50 border-l-4 border-l-blue-600">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Segredo de Especialista</div>
                                    <p className="text-sm text-slate-300 font-bold italic">
                                        {activeTutorial.tip}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Getting Started Guide */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Primeiros Passos</h3>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="bg-slate-900/30 border-slate-800/50 p-5 rounded-[1.5rem] hover:bg-slate-900/50 hover:border-blue-500/30 transition-all group cursor-default">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-green-500/20">
                                        1
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-black text-slate-100">Configure sua Equipe</h4>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                            Adicione profissionais, fotos e horários de trabalho. Sem equipe cadastrada, o sistema não aceita agendamentos.
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="bg-slate-900/30 border-slate-800/50 p-5 rounded-[1.5rem] hover:bg-slate-900/50 hover:border-blue-500/30 transition-all group cursor-default">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-500/20">
                                        2
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-black text-slate-100">Crie Serviços & Categorias</h4>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                            Organize serviços em categorias (Cabelo, Barba, Estética). Defina preços e duração de cada um.
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="bg-slate-900/30 border-slate-800/50 p-5 rounded-[1.5rem] hover:bg-slate-900/50 hover:border-purple-500/30 transition-all group cursor-default">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-purple-500/20">
                                        3
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-black text-slate-100">Defina Horários de Funcionamento</h4>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                            Configure dias e horários globais. Ajuste exceções individuais por profissional se necessário.
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="bg-slate-900/30 border-slate-800/50 p-5 rounded-[1.5rem] hover:bg-slate-900/50 hover:border-orange-500/30 transition-all group cursor-default">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-500/20">
                                        4
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-black text-slate-100">Comece a Atender!</h4>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                            Use a Fila para walk-ins e o Calendário para agendamentos. Seu sistema está pronto para operar!
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
