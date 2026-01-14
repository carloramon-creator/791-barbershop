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
    Zap,
    Search,
    SearchX,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-provider';
import { getBusinessTexts } from '@/lib/business-dictionary';

const getTutorialContent = (texts: any, tenant: any) => [
    {
        id: 'config-geral',
        title: '1.1 - Configurações: Geral',
        icon: LayoutDashboard,
        images: [
            '/tutorials/config-geral-1.png',
            '/tutorials/config-geral-2.png',
            '/tutorials/config-geral-3.png',
            '/tutorials/config-geral-4.png'
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
                imageIndex: 2
            },
            {
                title: 'Horário de Funcionamento',
                content: 'Defina os dias de abertura, horários de início e fim. Você também pode configurar o Intervalo de Almoço, a Tolerância de Atraso e o tempo de antecedência do Lembrete de WhatsApp.',
                imageIndex: 2
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
        images: ['/tutorials/config-usuarios.png'],
        description: 'Gerencie quem tem acesso ao painel administrativo e quais são seus níveis de acesso.',
        steps: [
            { title: 'Acesso', content: 'Navegue até Configurações > Usuários para ver quem administra o sistema.', imageIndex: 0 },
            { title: 'Adição', content: 'Adicione novos usuários preenchendo o e-mail e definindo o perfil de acesso.', imageIndex: 0 },
            { title: 'Gestão', content: 'Remova ou edite usuários antigos para manter a segurança do seu negócio.', imageIndex: 0 }
        ],
        tip: 'Evite compartilhar a mesma senha de administrador. Crie uma conta individual para cada pessoa.'
    },
    {
        id: 'config-permissoes',
        title: '1.3 - Configurações: Permissões',
        icon: UserCheck,
        images: ['/tutorials/config-permissoes.png'],
        description: `Defina exatamente o que cada cargo (${texts.professional}, Gerente, etc.) pode ver ou fazer no sistema.`,
        steps: [
            { title: 'Configuração', content: 'Selecione o cargo e marque ou desmarque as permissões específicas.', imageIndex: 0 },
            { title: 'Aplicação', content: 'As alterações são aplicadas instantaneamente para todos os usuários daquele cargo.', imageIndex: 0 }
        ],
        tip: 'Limite o acesso ao módulo "Financeiro" apenas para gerentes ou donos.'
    },
    {
        id: 'config-planos',
        title: '1.4 - Configurações: Planos',
        icon: BarChart3,
        images: ['/tutorials/config-planos.png'],
        description: 'Gerencie sua assinatura, veja faturas e adicione novos recursos (Add-ons).',
        steps: [
            { title: 'Status', content: 'Veja o status da sua assinatura atual e histórico de faturas.', imageIndex: 0 },
            { title: 'Upgrade', content: 'Use o botão "Turbinar Pacote" para adicionar módulos extras como Estoque ou WhatsApp Automático.', imageIndex: 0 }
        ],
        tip: 'Ative o "WhatsApp Automático" para reduzir faltas em até 80%.'
    },
    {
        id: 'produtos',
        title: '2 - Gestão de Produtos',
        icon: Lightbulb,
        images: ['/tutorials/produtos.png'],
        description: 'Controle seu catálogo de produtos para venda rápida na recepção.',
        steps: [
            { title: 'Cadastro', content: 'Clique em "Novo Produto" para adicionar itens como Pomadas ou Shampoos.', imageIndex: 0 },
            { title: 'Lucratividade', content: 'Defina o preço de venda e o preço de custo para calcular seu lucro.', imageIndex: 0 }
        ],
        tip: 'Produtos por impulso na bancada aumentam o faturamento médio em até 25%.'
    },
    {
        id: 'servicos',
        title: '3 - Gestão de Serviços',
        icon: Zap,
        images: ['/tutorials/servicos.png'],
        description: 'Configure seu cardápio de serviços com preços e duração personalizados.',
        steps: [
            { title: 'Organização', content: 'Crie categorias como "Cabelo", "Barba" ou "Combos".', imageIndex: 0 },
            { title: 'Precisão', content: 'Defina a duração exata de cada serviço para que sua agenda seja calculada corretamente.', imageIndex: 0 }
        ],
        tip: 'Crie serviços do tipo "Combo" com um pequeno desconto para incentivar o aumento do ticket médio.'
    },
    {
        id: 'profissionais',
        title: `4 - ${texts.professionals}`,
        icon: Users,
        images: ['/tutorials/staff.png'],
        description: `Cadastre seus ${texts.professionals}, configure comissões e horários.`,
        steps: [
            { title: 'Equipe', content: `Defina a comissão individual de cada ${texts.professional} para serviços e produtos.`, imageIndex: 0 },
            { title: 'Agenda', content: `Configure os horários de trabalho e dias de folga de cada um.`, imageIndex: 0 }
        ],
        tip: 'Uma foto profissional e amigável no perfil aumenta a taxa de agendamento online.'
    },
    {
        id: 'fila',
        title: '5 - Fila de Espera',
        icon: UserCheck,
        images: ['/tutorials/queue.png'],
        description: 'Gerencie clientes que chegam sem horário marcado com agilidade.',
        steps: [
            { title: 'Fluxo', content: 'Adicione o cliente, selecione o profissional e o serviço desejado.', imageIndex: 0 },
            { title: 'Controle', content: 'O sistema calcula o tempo estimado de espera automaticamente.', imageIndex: 0 }
        ],
        tip: 'Mantenha um tablet na recepção com a fila aberta para dar transparência aos clientes.'
    },
    {
        id: 'agendamento',
        title: '6 - Calendário & Agendamento',
        icon: Calendar,
        images: ['/tutorials/appointments.png'],
        description: 'Sua agenda completa. Marque horários e evite furos.',
        steps: [
            { title: 'Agilidade', content: 'Clique em qualquer espaço vazio para criar um novo agendamento rápido.', imageIndex: 0 },
            { title: 'Flexibilidade', content: 'Arraste um compromisso para outro horário ou profissional se precisar realocar.', imageIndex: 0 }
        ],
        tip: 'Sempre que possível, agende a próxima visita do cliente logo após o pagamento.'
    },
    {
        id: 'financeiro',
        title: '7 - Controle Financeiro',
        icon: BarChart3,
        images: ['/tutorials/finance.png'],
        description: 'Acompanhe seu fluxo de caixa, comissões e lucro líquido.',
        steps: [
            { title: 'Gestão', content: 'Registre despesas como aluguel, luz e compras de suprimentos diariamente.', imageIndex: 0 },
            { title: 'Comissões', content: 'Consulte o fechamento de cada profissional para pagar as comissões corretamente.', imageIndex: 0 }
        ],
        tip: 'Um financeiro organizado é o segredo para expandir seu negócio.'
    },
    {
        id: 'estoque',
        title: '8 - Controle de Estoque',
        icon: Lightbulb,
        images: ['/tutorials/finance.png'],
        description: 'Nunca fique sem produtos. Controle entradas, saídas e alertas.',
        steps: [
            { title: 'Entradas', content: 'Dê entrada em mercadorias informando a quantidade e valor pago.', imageIndex: 0 },
            { title: 'Alertas', content: 'Receba avisos quando um item atingir a quantidade mínima de segurança.', imageIndex: 0 }
        ],
        tip: 'Produtos parados em estoque são dinheiro parado.'
    }
];

export default function TutoriaisPage() {
    const { tenant } = useAuth();
    const texts = getBusinessTexts(tenant?.business_type);
    const tutorials = getTutorialContent(texts, tenant);

    const [activeTab, setActiveTab] = useState(tutorials[0].id);
    const [currentStep, setCurrentStep] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);

    const activeTutorial = tutorials.find(t => t.id === activeTab) || tutorials[0];
    const activeStep = activeTutorial.steps[currentStep] || activeTutorial.steps[0];
    const totalSteps = activeTutorial.steps.length;

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
                    subtitle: tutorial.description,
                    stepIndex: 0
                });
            }

            // Match steps
            tutorial.steps.forEach((step, index) => {
                if (step.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    step.content.toLowerCase().includes(searchQuery.toLowerCase())) {
                    matches.push({
                        type: 'step',
                        id: tutorial.id,
                        title: step.title,
                        subtitle: tutorial.title,
                        stepIndex: index
                    });
                }
            });

            return matches;
        }).slice(0, 6)
        : [];

    const handleTabChange = (newId: string) => {
        setActiveTab(newId);
        setCurrentStep(0);
        setSearchQuery('');
        setShowResults(false);
    };

    const handleSelectResult = (result: any) => {
        setActiveTab(result.id);
        setCurrentStep(result.stepIndex);
        setSearchQuery('');
        setShowResults(false);
    };

    const nextStep = () => {
        if (currentStep < totalSteps - 1) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-blue-500 font-black uppercase tracking-widest text-[10px]">
                        <CheckCircle2 className="w-4 h-4" />
                        Guia Visual Interativo
                    </div>
                    <h1 className="text-4xl font-black text-slate-100 tracking-tight">
                        MANUAL DO <span className="text-blue-600">SISTEMA</span>
                    </h1>
                    <p className="text-slate-400 font-medium max-w-2xl leading-relaxed">
                        Bem-vindo ao centro de ajuda da 791 {tenant?.business_type === 'beauty_salon' ? 'Beauty' : 'Barber'}.
                        Siga o passo a passo interativo para dominar cada recurso da plataforma.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full lg:w-96 group">
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="O que você deseja saber hoje? (ex: Pix, Slug...)"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowResults(true);
                            }}
                            onFocus={() => setShowResults(true)}
                            className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 p-1 rounded-full hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-3 h-3 text-slate-400" />
                            </button>
                        )}
                    </div>

                    {/* Search Results Overlay */}
                    {showResults && searchQuery.length > 2 && (
                        <Card className="absolute top-full mt-2 w-full bg-slate-900 border-slate-800 shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/50 animate-in slide-in-from-top-2 duration-200">
                            {searchResults.length > 0 ? (
                                searchResults.map((result, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSelectResult(result)}
                                        className="w-full text-left p-4 hover:bg-blue-600/10 transition-colors flex items-center gap-4 group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors">
                                            {result.type === 'tutorial' ? <LayoutDashboard className="w-4 h-4 text-blue-400 group-hover:text-white" /> : <Zap className="w-4 h-4 text-orange-400 group-hover:text-white" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-slate-200 truncate group-hover:text-blue-400 transition-colors">
                                                {result.title}
                                            </p>
                                            <p className="text-[10px] text-slate-500 truncate group-hover:text-slate-400 transition-colors">
                                                {result.subtitle}
                                            </p>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-500/50">
                                    <SearchX className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Nenhum resultado encontrado</p>
                                </div>
                            )}
                        </Card>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-3 space-y-2">
                    {tutorials.map((tutorial) => (
                        <button
                            key={tutorial.id}
                            onClick={() => handleTabChange(tutorial.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-black transition-all duration-300 text-left",
                                activeTab === tutorial.id
                                    ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20 translate-x-2"
                                    : "bg-slate-900/40 border border-slate-800/50 text-slate-400 hover:text-slate-100 hover:border-slate-700 hover:translate-x-1"
                            )}
                        >
                            <tutorial.icon className={cn("w-5 h-5 shrink-0", activeTab === tutorial.id ? "text-white" : "text-blue-500")} />
                            <span className="truncate">{tutorial.title}</span>
                            {activeTab === tutorial.id && <ChevronRight className="ml-auto w-4 h-4 opacity-50 shrink-0" />}
                        </button>
                    ))}

                    <div className="mt-8 p-6 rounded-3xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20">
                        <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase mb-3 text-white">
                            <Lightbulb className="w-4 h-4" />
                            Dica Pro
                        </div>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed uppercase">
                            "A configuração completa é o primeiro passo para o sucesso."
                        </p>
                    </div>
                </div>

                {/* Content Area - Interactive Step-by-Step */}
                <div className="lg:col-span-9 space-y-6">
                    <Card className="bg-slate-900/60 border-slate-800 overflow-hidden backdrop-blur-md rounded-[2.5rem] shadow-2xl flex flex-col">

                        {/* Image Viewer (Top) */}
                        <div className="relative w-full aspect-[16/9] lg:aspect-[21/9] bg-slate-950/60 overflow-hidden group">
                            <Image
                                src={activeTutorial.images[activeStep.imageIndex || 0]}
                                alt={`${activeTutorial.title} - Passo ${currentStep + 1}`}
                                fill
                                className="object-contain p-4 transition-all duration-700"
                                priority
                            />

                            {/* Overlay Navigation */}
                            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
                                <div className="flex items-center justify-between gap-6 max-w-5xl mx-auto">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-blue-600 rounded text-[10px] font-black text-white uppercase tracking-tighter">
                                                Passo {currentStep + 1} de {totalSteps}
                                            </span>
                                            <h3 className="text-xl font-black text-white uppercase tracking-tight">
                                                {activeStep.title}
                                            </h3>
                                        </div>
                                        <p className="text-base text-slate-300 font-medium leading-relaxed max-w-3xl">
                                            {activeStep.content}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        <button
                                            onClick={prevStep}
                                            disabled={currentStep === 0}
                                            className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronRight className="w-6 h-6 rotate-180" />
                                        </button>
                                        <button
                                            onClick={nextStep}
                                            disabled={currentStep === totalSteps - 1}
                                            className="flex items-center gap-3 px-8 py-4 rounded-xl bg-blue-600 text-white font-black text-base hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-blue-600/30"
                                        >
                                            {currentStep === totalSteps - 1 ? 'Concluído' : 'Próximo'}
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer / Tip Section (Bottom) */}
                        <div className="p-10 bg-slate-900/40 border-t border-slate-800/50">
                            <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-blue-600/20 rounded-2xl text-blue-500">
                                            <activeTutorial.icon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter">
                                                {activeTutorial.title}
                                            </h2>
                                            <p className="text-sm text-slate-400 font-medium">
                                                {activeTutorial.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="shrink-0 max-w-md p-6 rounded-3xl bg-slate-950/60 border-l-4 border-l-orange-500 border border-slate-800/50 shadow-xl">
                                    <div className="text-[11px] font-black text-orange-500 uppercase tracking-widest mb-2 leading-none">Dica de Especialista</div>
                                    <p className="text-sm text-slate-200 font-bold leading-relaxed">
                                        {activeTutorial.tip}
                                    </p>
                                </div>
                            </div>

                            {/* Progression Dots */}
                            <div className="mt-10 flex items-center justify-center gap-3">
                                {Array.from({ length: totalSteps }).map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentStep(i)}
                                        className={cn(
                                            "h-2 rounded-full transition-all duration-700",
                                            i === currentStep ? "w-12 bg-blue-600" : "w-3 bg-slate-800 hover:bg-slate-700"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* Quick Access Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
                        {[
                            { step: 1, title: 'Configurações', desc: 'Dados da barbearia, slug e endereço.' },
                            { step: 2, title: texts.professionals, desc: `Cadastre sua equipe e horários.` },
                            { step: 3, title: 'Serviços', desc: 'Preços, duração e categorias.' },
                            { step: 4, title: 'Atendimento', desc: 'Inicie a Fila ou o Agendamento.' }
                        ].map((item, i) => (
                            <div key={i} className="p-6 rounded-[2rem] bg-slate-900/30 border border-slate-800/50 hover:bg-slate-900/50 transition-all cursor-default flex items-center gap-5">
                                <span className="flex-shrink-0 w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-blue-400 font-black text-sm">
                                    {item.step}
                                </span>
                                <div>
                                    <h4 className="text-sm font-black text-slate-200 uppercase tracking-tight leading-none">{item.title}</h4>
                                    <p className="text-xs text-slate-500 font-medium mt-1">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
