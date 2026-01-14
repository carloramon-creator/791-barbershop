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
                content: 'Faça o upload do seu logotipo (Recomendado: 500x500px). Esta imagem será o ícone que seus clientes verão no App do Cliente para identificar sua marca.'
            },
            {
                title: 'Dados Básicos e Identificação',
                content: 'Preencha o Nome e E-mail comercial. O campo CNPJ é importante para formalização, mas você pode marcar "Não tenho CNPJ" se for autônomo.'
            },
            {
                title: 'O que é o SLUG?',
                content: 'O SLUG é o identificador único da sua página (ex: 791barber.com/nome-da-loja). Ele é o link que você enviará para seus clientes agendarem. Escolha um nome curto e fácil de lembrar!'
            },
            {
                title: 'Tipo de Negócio',
                content: `Selecione se você é uma Barbearia ou Salão de Beleza. Isso ajusta automaticamente todos os termos do sistema (ex: ${texts.professional} ou Barbeiro).`
            },
            {
                title: 'Divulgação e QR Code',
                content: 'Aproveite o QR Code gerado automaticamente. Clique em "Imprimir QR Code" para colocar na sua recepção ou vitrine, facilitando o agendamento rápido pelos clientes.'
            },
            {
                title: 'Horário de Funcionamento',
                content: 'Defina os dias de abertura, horários de início e fim. Você também pode configurar o Intervalo de Almoço, a Tolerância de Atraso e o tempo de antecedência do Lembrete de WhatsApp.'
            },
            {
                title: 'Endereço Simplificado',
                content: 'Basta digitar o CEP e o sistema preencherá a rua e o bairro. Você só precisa adicionar o número e o complemento (ex: Sala 2).'
            },
            {
                title: 'Dados Bancários e PIX',
                content: 'Configure sua chave PIX. Isso é fundamental para que o sistema gere QR Codes de pagamento automáticos no momento da venda, agilizando seu caixa.'
            },
            {
                title: 'Módulos do Sistema',
                content: 'Ative ou desative os módulos de "Fila" e "Agendamento" conforme a necessidade do seu modelo de negócio.'
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
            { title: 'Acesso', content: 'Navegue até Configurações > Usuários para ver quem administra o sistema.' },
            { title: 'Adição', content: 'Adicione novos usuários preenchendo o e-mail e definindo o perfil de acesso.' },
            { title: 'Gestão', content: 'Remova ou edite usuários antigos para manter a segurança do seu negócio.' }
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
            { title: 'Configuração', content: 'Selecione o cargo e marque ou desmarque as permissões específicas.' },
            { title: 'Aplicação', content: 'As alterações são aplicadas instantaneamente para todos os usuários daquele cargo.' }
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
            { title: 'Status', content: 'Veja o status da sua assinatura atual e histórico de faturas.' },
            { title: 'Upgrade', content: 'Use o botão "Turbinar Pacote" para adicionar módulos extras como Estoque ou WhatsApp Automático.' }
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
            { title: 'Cadastro', content: 'Clique em "Novo Produto" para adicionar itens como Pomadas ou Shampoos.' },
            { title: 'Lucratividade', content: 'Defina o preço de venda e o preço de custo para calcular seu lucro.' }
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
            { title: 'Organização', content: 'Crie categorias como "Cabelo", "Barba" ou "Combos".' },
            { title: 'Precisão', content: 'Defina a duração exata de cada serviço para que sua agenda seja calculada corretamente.' }
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
            { title: 'Equipe', content: `Defina a comissão individual de cada ${texts.professional} para serviços e produtos.` },
            { title: 'Agenda', content: `Configure os horários de trabalho e dias de folga de cada um.` }
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
            { title: 'Fluxo', content: 'Adicione o cliente, selecione o profissional e o serviço desejado.' },
            { title: 'Controle', content: 'O sistema calcula o tempo estimado de espera automaticamente.' }
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
            { title: 'Agilidade', content: 'Clique em qualquer espaço vazio para criar um novo agendamento rápido.' },
            { title: 'Flexibilidade', content: 'Arraste um compromisso para outro horário ou profissional se precisar realocar.' }
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
            { title: 'Gestão', content: 'Registre despesas como aluguel, luz e compras de suprimentos diariamente.' },
            { title: 'Comissões', content: 'Consulte o fechamento de cada profissional para pagar as comissões corretamente.' }
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
            { title: 'Entradas', content: 'Dê entrada em mercadorias informando a quantidade e valor pago.' },
            { title: 'Alertas', content: 'Receba avisos quando um item atingir a quantidade mínima de segurança.' }
        ],
        tip: 'Produtos parados em estoque são dinheiro parado.'
    }
];

export default function TutoriaisPage() {
    const { tenant } = useAuth();
    const texts = getBusinessTexts(tenant?.business_type);
    const tutorials = getTutorialContent(texts, tenant);
    const [activeTab, setActiveTab] = useState(tutorials[0].id);

    const activeTutorial = tutorials.find(t => t.id === activeTab) || tutorials[0];

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
                    {tutorials.map((tutorial) => (
                        <button
                            key={tutorial.id}
                            onClick={() => setActiveTab(tutorial.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-black transition-all transition-all duration-300 text-left",
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
                        <div className="flex flex-col xl:flex-row">
                            {/* Illustration Side */}
                            <div className="w-full xl:w-1/2 bg-slate-950/40 border-r border-slate-800/50 overflow-y-auto max-h-[600px] xl:max-h-full">
                                <div className="p-4 space-y-4">
                                    {activeTutorial.images.map((img, idx) => (
                                        <div key={idx} className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
                                            <Image
                                                src={img}
                                                alt={`${activeTutorial.title} - Imagem ${idx + 1}`}
                                                fill
                                                className="object-cover opacity-90 hover:scale-105 transition-transform duration-500"
                                                priority={idx === 0}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Info Side */}
                            <div className="w-full xl:w-1/2 p-8 xl:p-12 space-y-8 bg-slate-900/40">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-500">
                                            <activeTutorial.icon className="w-6 h-6" />
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-100 uppercase italic tracking-tighter">
                                            {activeTutorial.title}
                                        </h2>
                                    </div>
                                    <p className="text-slate-300 font-bold leading-relaxed text-sm">
                                        {activeTutorial.description}
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Zap className="w-4 h-4 fill-current" />
                                        Guia Detalhado Passo a Passo
                                    </h3>
                                    <div className="space-y-6">
                                        {activeTutorial.steps.map((step, idx) => (
                                            <div key={idx} className="flex gap-4 group">
                                                <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-blue-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-colors">
                                                    {idx + 1}
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-black text-slate-100 group-hover:text-blue-400 transition-colors uppercase italic">
                                                        {step.title}
                                                    </h4>
                                                    <p className="text-xs font-medium text-slate-400 leading-relaxed group-hover:text-slate-200 transition-colors">
                                                        {step.content}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/50 border-l-4 border-l-blue-600">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Segredo de Especialista</div>
                                    <p className="text-xs text-slate-300 font-bold italic">
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
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Onde começar primeiro?</h3>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { step: 1, title: 'Configurações', desc: 'Preencha seus dados de logo, slug e endereço.' },
                                { step: 2, title: texts.professionals, desc: `Cadastre quem trabalha com fotos e horários.` },
                                { step: 3, title: 'Serviços', desc: 'Defina seu cardápio com preços e duração.' },
                                { step: 4, title: 'Módulos', desc: 'Ative a Fila ou Agenda e comece a lucrar.' }
                            ].map((item, i) => (
                                <Card key={i} className="bg-slate-900/30 border-slate-800/50 p-5 rounded-[1.5rem] hover:bg-slate-900/50 hover:border-blue-500/30 transition-all group cursor-default">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                                            {item.step}
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-black text-slate-100 group-hover:text-blue-400 transition-colors italic">{item.title}</h4>
                                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed group-hover:text-slate-300">
                                                {item.desc}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
