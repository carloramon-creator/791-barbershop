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
        id: 'dashboard',
        title: 'Dashboard & Métricas',
        icon: LayoutDashboard,
        image: '/tutorials/dashboard.png',
        description: 'Sua visão 360º do negócio. Acompanhe faturamento, volume de atendimentos e crescimento em tempo real.',
        steps: [
            'Acesse o Dashboard logo após o login para ver o resumo executivo do seu negócio.',
            'Visualize o faturamento total do dia, semana ou mês com gráficos interativos de evolução.',
            'Acompanhe métricas-chave: ticket médio, taxa de ocupação, serviços mais vendidos e produtos em destaque.',
            'Identifique os horários de pico e dias mais lucrativos para otimizar a escala da equipe.',
            'Use os filtros de período para comparar performance atual vs. mês anterior ou mesmo período do ano passado.',
            'Monitore o ROI de campanhas de marketing se você tiver o módulo de Analytics ativo.'
        ],
        tip: 'Mantenha o Dashboard aberto em um tablet ou tela secundária na recepção. Assim você monitora o ritmo da loja em tempo real sem interromper o atendimento.'
    },
    {
        id: 'queue',
        title: 'Fila de Espera',
        icon: UserCheck,
        image: '/tutorials/queue.png',
        description: 'Gestão ágil para clientes sem agendamento. Controle o fluxo de entrada e saída com um clique.',
        steps: [
            'Acesse "Fila de Espera" no menu lateral para visualizar todos os profissionais e suas filas.',
            'Adicione clientes à fila clicando em "Novo Atendimento" e selecionando o profissional desejado.',
            'Os clientes aparecem em ordem de chegada. O tempo de espera é calculado automaticamente.',
            'Clique em "Iniciar" quando o profissional estiver pronto para começar o atendimento.',
            'Durante o atendimento, selecione os serviços realizados e produtos vendidos.',
            'Clique em "Finalizar" para registrar a venda, liberar o profissional e calcular a comissão automaticamente.',
            'Arraste e solte para reordenar clientes ou transferir para outro profissional se necessário.'
        ],
        tip: 'Use a fila para walk-ins e o calendário para agendamentos. Essa combinação garante que você aproveite 100% da capacidade da equipe sem conflitos.'
    },
    {
        id: 'appointments',
        title: 'Calendário de Agendamentos',
        icon: Calendar,
        image: '/tutorials/appointments.png',
        description: 'Organize sua agenda com precisão. Evite conflitos de horário e garanta pontualidade.',
        steps: [
            'Acesse "Agendamentos" para visualizar a agenda completa em formato de calendário.',
            'Alterne entre as visões: Dia (detalhada), Semana (panorâmica) ou Individual (por profissional).',
            'Crie novos agendamentos clicando em um horário vazio e preenchendo cliente, serviço e profissional.',
            'Arraste e solte agendamentos para mover de horário ou transferir para outro profissional.',
            'Bloqueie horários específicos para folgas, almoço, treinamentos ou manutenção da loja.',
            'O sistema envia notificação automática ao cliente na confirmação (se WhatsApp Add-on estiver ativo).',
            'Use a visão "Lista" para ter um resumo rápido de todos os serviços do dia com status de confirmação.'
        ],
        tip: 'Configure intervalos entre atendimentos nas configurações de cada serviço. Isso evita atrasos em cascata e melhora a experiência do cliente.'
    },
    {
        id: 'staff',
        title: 'Gestão da Equipe',
        icon: Users,
        image: '/tutorials/staff.png',
        description: 'Configure seus profissionais, defina comissões personalizadas e controle horários de trabalho.',
        steps: [
            'Acesse "Equipe" no menu e clique em "Adicionar Profissional" para cadastrar novos membros.',
            'Preencha nome, e-mail, telefone e adicione uma foto profissional de alta qualidade.',
            'Defina a porcentagem de comissão individual por serviço e por produto vendido.',
            'Configure os dias da semana e horários em que cada profissional está disponível para atendimento.',
            'Defina permissões de acesso: "Colaborador" vê apenas sua agenda, "Gerente" vê tudo, "Admin" tem controle total.',
            'Envie o convite de acesso para que o profissional baixe o app e gerencie sua própria agenda.',
            'Acompanhe o desempenho individual: total de atendimentos, faturamento gerado e comissões acumuladas.'
        ],
        tip: 'Incentive os profissionais a manterem fotos atualizadas e perfis completos. Clientes preferem agendar com profissionais que transmitem confiança visual.'
    },
    {
        id: 'finance',
        title: 'Controle Financeiro',
        icon: BarChart3,
        image: '/tutorials/finance.png',
        description: 'Gestão profissional completa. Acompanhe receitas, despesas, DRE e lucro líquido em tempo real.',
        steps: [
            'Acesse "Financeiro" no menu lateral para visualizar o resumo de receitas e despesas do período.',
            'Registre despesas fixas (aluguel, luz, água) e variáveis (produtos, manutenção) clicando em "Nova Despesa".',
            'Consulte o DRE (Demonstrativo de Resultado) para ver receita bruta, custos operacionais e lucro líquido.',
            'Acompanhe suas faturas do SaaS em "Configurações > Plano" para garantir que o sistema esteja sempre ativo.',
            'Exporte relatórios mensais em PDF para enviar ao contador ou para análise gerencial.',
            'Separe o faturamento de serviços do faturamento de produtos para identificar sua principal fonte de receita.'
        ],
        tip: 'Configure alertas de despesas recorrentes para nunca esquecer de registrar contas fixas. Um DRE preciso é fundamental para decisões estratégicas.'
    },
    {
        id: 'whatsapp',
        title: 'WhatsApp Automático',
        icon: MessageSquare,
        image: '/tutorials/whatsapp.png',
        description: 'Reduza faltas em até 80% com lembretes inteligentes. Comunicação automatizada que aumenta a taxa de comparecimento.',
        steps: [
            'Ative o Add-on de WhatsApp em "Configurações > Planos & Add-ons" para liberar as automações.',
            'Configure os templates de mensagem personalizados com o nome do cliente, profissional, data e horário.',
            'Confirmação automática é enviada imediatamente após o cliente agendar pelo app ou site.',
            'Lembrete 24h antes do horário marcado para que o cliente confirme ou remarque com antecedência.',
            'Lembrete 1 hora antes do serviço para garantir pontualidade e reduzir no-shows.',
            'Notificação "Próximo da Fila" avisa clientes em espera quando estão perto de serem atendidos.',
            'Mensagem de agradecimento pós-atendimento incentiva avaliações e fidelização.'
        ],
        tip: 'Personalize as mensagens com o nome da sua barbearia e um tom de voz que reflita a identidade do seu negócio. Clientes valorizam comunicação profissional.'
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
