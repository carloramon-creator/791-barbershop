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
        images: [
            '/tutorials/config-usuarios-1.png',
            '/tutorials/config-usuarios-2.png',
            '/tutorials/config-usuarios-3.png'
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
                imageIndex: 2
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
        title: '2 - Gestão de Produtos',
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
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isConfigExpanded, setIsConfigExpanded] = useState(true);

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
            tutorial.steps.forEach((step) => {
                if (step.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    step.content.toLowerCase().includes(searchQuery.toLowerCase())) {
                    matches.push({
                        type: 'step',
                        id: tutorial.id,
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
    };

    const handleSelectResult = (result: any) => {
        setActiveTab(result.id);
        setSearchQuery('');
        setShowResults(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12 overflow-x-hidden relative">

            {/* Image Modal (Lightbox) */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[100] bg-slate-950/95 flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300 cursor-pointer"
                    onClick={() => setSelectedImage(null)}
                >
                    <button className="absolute top-8 right-8 p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-100 hover:bg-slate-800 transition-all z-[110]">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="relative w-full h-full">
                        <Image
                            src={selectedImage}
                            alt="Visualização ampliada"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>
            )}

            {/* COMPACT Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-blue-500 font-black uppercase tracking-widest text-[9px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Guia de Utilização
                    </div>
                    <h1 className="text-2xl font-black text-slate-100 tracking-tight leading-none">
                        MANUAL DO <span className="text-blue-600">SISTEMA</span>
                    </h1>
                </div>

                {/* Search Bar */}
                <div className="relative w-full lg:w-80 group">
                    <div className="relative flex items-center">
                        <Search className="absolute left-3.5 w-3.5 h-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="O que você deseja saber hoje?"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowResults(true);
                            }}
                            onFocus={() => setShowResults(true)}
                            className="w-full bg-slate-900/40 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 p-1 rounded-full hover:bg-slate-800 transition-colors">
                                <X className="w-2.5 h-2.5 text-slate-400" />
                            </button>
                        )}
                    </div>

                    {/* Search Results Overlay */}
                    {showResults && searchQuery.length > 2 && (
                        <Card className="absolute top-full mt-1.5 w-full bg-slate-900 border-slate-800 shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/50 animate-in slide-in-from-top-1 duration-200">
                            {searchResults.length > 0 ? (
                                searchResults.map((result, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSelectResult(result)}
                                        className="w-full text-left p-3 hover:bg-blue-600/10 transition-colors flex items-center gap-3 group"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors">
                                            {result.type === 'tutorial' ? <LayoutDashboard className="w-3.5 h-3.5 text-blue-400 group-hover:text-white" /> : <Zap className="w-3.5 h-3.5 text-orange-400 group-hover:text-white" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-slate-200 truncate group-hover:text-blue-400 transition-colors">{result.title}</p>
                                            <p className="text-[9px] text-slate-500 truncate group-hover:text-slate-400 transition-colors">{result.subtitle}</p>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-6 text-center text-slate-500/50">
                                    <SearchX className="w-6 h-6 mx-auto mb-1 opacity-20" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum resultado</p>
                                </div>
                            )}
                        </Card>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Tree Navigation Sidebar */}
                <div className="lg:col-span-3 space-y-1.5 lg:sticky lg:top-6">

                    {/* Configurações Group (Tree) */}
                    <div className="space-y-1 mb-3">
                        <button
                            onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                            className={cn(
                                "w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black transition-all bg-slate-950/60 border border-slate-800/50 text-slate-100 uppercase tracking-tighter",
                                isConfigExpanded ? "border-blue-500/30 bg-blue-600/5" : "hover:border-slate-600"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <LayoutDashboard className="w-4 h-4 text-blue-500" />
                                1 - CONFIGURAÇÕES
                            </div>
                            {isConfigExpanded ? <ChevronDown className="w-4 h-4 text-blue-500" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
                        </button>

                        {isConfigExpanded && (
                            <div className="pl-4 space-y-1 border-l-2 border-slate-800/30 ml-6 mt-1 animate-in slide-in-from-left-2 duration-300">
                                {configItems.map((tutorial) => (
                                    <button
                                        key={tutorial.id}
                                        onClick={() => handleTabChange(tutorial.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black transition-all text-left uppercase tracking-tighter",
                                            activeTab === tutorial.id
                                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/40"
                                        )}
                                    >
                                        <span className="truncate">{tutorial.title.split(': ')[1] || tutorial.title}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Main Items */}
                    {mainItems.map((tutorial) => (
                        <button
                            key={tutorial.id}
                            onClick={() => handleTabChange(tutorial.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all text-left uppercase tracking-tighter",
                                activeTab === tutorial.id
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 translate-x-1"
                                    : "bg-slate-950/40 border border-slate-800/30 text-slate-500 hover:text-slate-100 hover:border-slate-700 hover:translate-x-1"
                            )}
                        >
                            <tutorial.icon className={cn("w-4 h-4 shrink-0", activeTab === tutorial.id ? "text-white" : "text-blue-500/50")} />
                            <span className="truncate uppercase tracking-tight">{tutorial.title}</span>
                        </button>
                    ))}

                    <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-blue-600/5 to-purple-600/5 border border-white/5">
                        <div className="flex items-center gap-2 text-blue-400 font-black text-[9px] uppercase mb-2">
                            <Lightbulb className="w-3.5 h-3.5" />
                            Importante
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase">
                            "{activeTutorial.tip}"
                        </p>
                    </div>
                </div>

                {/* Content Area - Detailed Manual List */}
                <div className="lg:col-span-9 space-y-6">
                    {/* Tutorial Description & Images */}
                    <Card className="bg-slate-900/40 border-slate-800/50 overflow-hidden rounded-2xl p-6">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-600/10 rounded-xl text-blue-500">
                                        <activeTutorial.icon className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-xl font-black text-slate-100 uppercase tracking-tighter">
                                        {activeTutorial.title}
                                    </h2>
                                </div>
                                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                    {activeTutorial.description}
                                </p>
                            </div>

                            {/* Image Gallery With Lightbox Trigger */}
                            <div className="flex flex-wrap gap-2 shrink-0 md:max-w-[320px]">
                                {activeTutorial.images.map((img, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedImage(img)}
                                        className="relative w-20 h-20 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 hover:border-blue-500/50 transition-all group cursor-zoom-in"
                                    >
                                        <Image
                                            src={img}
                                            alt={`Referência ${i + 1}`}
                                            fill
                                            className="object-contain p-1 opacity-70 group-hover:opacity-100 transition-opacity"
                                        />
                                        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                            <Maximize2 className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* Step-by-Step Detailed List */}
                    <div className="space-y-3">
                        {activeTutorial.steps.map((step, i) => (
                            <div key={i} className="group relative pl-12">
                                {/* Connector Line */}
                                {i !== activeTutorial.steps.length - 1 && (
                                    <div className="absolute left-5 top-10 bottom-0 w-px bg-slate-800" />
                                )}

                                {/* Step Number Indicator */}
                                <div className="absolute left-0 top-0 w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 font-black text-sm group-hover:border-blue-500 group-hover:text-blue-500 transition-all">
                                    {i + 1}
                                </div>

                                <Card className="bg-slate-900/20 border-slate-800/30 p-5 group-hover:bg-slate-900/40 transition-all rounded-xl">
                                    <h4 className="text-sm font-black text-slate-100 uppercase tracking-tight mb-1.5 flex items-center gap-2">
                                        {step.title}
                                        {step.imageIndex !== undefined && (
                                            <button
                                                onClick={() => setSelectedImage(activeTutorial.images[step.imageIndex])}
                                                className="text-[10px] text-slate-500 font-bold border border-slate-800 px-1.5 rounded uppercase hover:border-blue-500 hover:text-blue-500 transition-all flex items-center gap-1"
                                            >
                                                VER IMAGEM {step.imageIndex + 1}
                                                <Maximize2 className="w-2.5 h-2.5" />
                                            </button>
                                        )}
                                    </h4>
                                    <p className="text-[13px] text-slate-400 font-medium leading-relaxed group-hover:text-slate-300">
                                        {step.content}
                                    </p>
                                </Card>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Quick Access */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
                        {[
                            { step: 'A', title: 'Configurar', icon: LayoutDashboard },
                            { step: 'B', title: texts.professionals, icon: Users },
                            { step: 'C', title: 'Agendar', icon: Calendar },
                            { step: 'D', title: 'Financeiro', icon: BarChart3 }
                        ].map((item, i) => (
                            <div key={i} className="p-3 px-4 rounded-xl bg-slate-950/40 border border-slate-800/50 hover:bg-slate-900/50 transition-all cursor-default flex items-center gap-3">
                                <item.icon className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{item.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
