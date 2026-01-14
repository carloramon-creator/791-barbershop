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
            'Visualize o faturamento total do dia, semana ou mês.',
            'Acompanhe o ROI e a performance de campanhas (se ativo).',
            'Identifique os horários de pico e dias mais lucrativos.',
            'Use os filtros rápidos para comparar períodos passados.'
        ],
        tip: 'Mantenha o Dashboard aberto em um tablet ou tela secundária para monitorar o ritmo da loja sem sair da recepção.'
    },
    {
        id: 'queue',
        title: 'Fila de Espera',
        icon: UserCheck,
        image: '/tutorials/queue.png',
        description: 'Gestão ágil para clientes sem agendamento. Controle o fluxo de entrada e saída com um clique.',
        steps: [
            'Adicione clientes à fila clicando em "Novo Atendimento".',
            'Os clientes aparecem em ordem de chegada para cada profissional.',
            'O tempo de espera é calculado automaticamente pelo sistema.',
            'Clique no botão "Iniciar" para começar o serviço e "Finalizar" para liberar o profissional.'
        ],
        tip: 'Você pode reordenar clientes na fila ou trocar o profissional se houver desistência ou mudança de última hora.'
    },
    {
        id: 'appointments',
        title: 'Calendário de Agendamentos',
        icon: Calendar,
        image: '/tutorials/appointments.png',
        description: 'Organize sua agenda com precisão. Evite conflitos de horário e garanta pontualidade.',
        steps: [
            'Visualize a agenda por Dia, Semana ou Individual por profissional.',
            'Arraste e solte para mover agendamentos de horário ou de barbeiro.',
            'Bloqueie horários específicos para folgas ou manutenção da loja.',
            'O sistema notifica o cliente automaticamente na confirmação do horário.'
        ],
        tip: 'Utilize a visão "Lista" para ter um resumo rápido de todos os serviços agendados para o dia de hoje.'
    },
    {
        id: 'staff',
        title: 'Gestão da Equipe',
        icon: Users,
        image: '/tutorials/staff.png',
        description: 'Configure seus profissionais, defina comissões personalizadas e controle horários de trabalho.',
        steps: [
            'Cadastre e-mail e foto para que o cliente identifique o profissional.',
            'Defina a porcentagem de comissão por serviço ou produto de forma individual.',
            'Configure os dias e horários em que cada membro da equipe está disponível.',
            'O acesso "Colaborador" permite que o barbeiro veja apenas sua própria agenda e faturamento.'
        ],
        tip: 'Sempre peça para os profissionais baixarem o App e manterem sua foto atualizada, isso aumenta a confiança do cliente final.'
    },
    {
        id: 'finance',
        title: 'Controle Financeiro',
        icon: BarChart3,
        image: '/tutorials/finance.png',
        description: 'Gestão profissional para donos de negócio. Fluxo de caixa, DRE e controle de despesas.',
        steps: [
            'Registre despesas fixas e variáveis para calcular seu lucro real.',
            'Consulte o DRE automático para ver se a empresa está operando com lucro.',
            'Separe o faturamento de serviços do faturamento de produtos.',
            'Gere relatórios de fechamento para conferir o caixa no fim do dia.'
        ],
        tip: 'Acompanhe as faturas do sistema na aba de Planos para garantir que seu SaaS esteja sempre em dia e com todos os recursos liberados.'
    },
    {
        id: 'whatsapp',
        title: 'WhatsApp Automático',
        icon: MessageSquare,
        image: '/tutorials/whatsapp.png',
        description: 'O segredo para reduzir faltas em até 80%. Lembretes inteligentes enviados direto para o cliente.',
        steps: [
            'Confirmação imediata assim que o agendamento é realizado.',
            'Lembrete automático 24 horas e 1 hora antes do serviço.',
            'Notificação de "Próximo da Fila" para quem está aguardando.',
            'Acompanhamento pós-venda para incentivar o retorno do cliente.'
        ],
        tip: 'Este recurso é um Add-on. Se você ainda não tem, pode ativar em Configurações > Planos & Add-ons para automatizar sua comunicação.'
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

                    {/* Quick Start Guide */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-slate-900/30 border-slate-800/50 p-6 rounded-[2rem] hover:bg-slate-900/50 transition-colors group cursor-default">
                            <CardHeader className="p-0 mb-4">
                                <CardTitle className="text-sm font-black text-slate-100 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/20" />
                                    Adição de Profissionais
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 text-xs text-slate-400 font-medium leading-relaxed">
                                Cadastre sua equipe completa para que seu salão apareça disponível para agendamentos online.
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900/30 border-slate-800/50 p-6 rounded-[2rem] hover:bg-slate-900/50 transition-colors group cursor-default">
                            <CardHeader className="p-0 mb-4">
                                <CardTitle className="text-sm font-black text-slate-100 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/20" />
                                    Categorias & Serviços
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 text-xs text-slate-400 font-medium leading-relaxed">
                                Organize seus serviços em categorias (ex: Cabelo, Barba, Unhas) para facilitar a escolha do cliente.
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900/30 border-slate-800/50 p-6 rounded-[2rem] hover:bg-slate-900/50 transition-colors group cursor-default">
                            <CardHeader className="p-0 mb-4">
                                <CardTitle className="text-sm font-black text-slate-100 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-purple-500 shadow-lg shadow-purple-500/20" />
                                    Configuração de Horários
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 text-xs text-slate-400 font-medium leading-relaxed">
                                Defina seu horário de funcionamento global e os horários alternativos de cada colaborador.
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
