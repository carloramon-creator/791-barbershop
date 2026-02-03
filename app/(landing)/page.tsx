'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    Calendar, DollarSign, BarChart3, MessageCircle,
    Gift, Users, CheckCircle, ArrowRight, Sparkles,
    TrendingUp, Clock, Shield, Zap, Star, ChevronDown, Mail, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabase-client';

export default function LandingPage() {
    const router = useRouter();
    const [activeFeature, setActiveFeature] = useState(0);
    const [activeFaq, setActiveFaq] = useState<number | null>(null);
    const [chatMenuOpen, setChatMenuOpen] = useState(false);
    const [stats, setStats] = useState({
        barbershops: 0,
        appointments: 0,
        revenue: 0
    });

    // Redirect if logged in
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) router.push('/dashboard');
        };
        checkSession();
    }, [router]);

    // Animated counters
    useEffect(() => {
        const duration = 2000;
        const steps = 60;
        const interval = duration / steps;

        const targets = { barbershops: 150, appointments: 50000, revenue: 2500000 };
        let current = { barbershops: 0, appointments: 0, revenue: 0 };

        const timer = setInterval(() => {
            current.barbershops = Math.min(current.barbershops + targets.barbershops / steps, targets.barbershops);
            current.appointments = Math.min(current.appointments + targets.appointments / steps, targets.appointments);
            current.revenue = Math.min(current.revenue + targets.revenue / steps, targets.revenue);

            setStats({
                barbershops: Math.floor(current.barbershops),
                appointments: Math.floor(current.appointments),
                revenue: Math.floor(current.revenue)
            });

            if (current.barbershops >= targets.barbershops) clearInterval(timer);
        }, interval);

        return () => clearInterval(timer);
    }, []);

    const features = [
        { icon: Calendar, title: 'Agendamento 24/7', desc: 'Clientes agendam online a qualquer hora, sem ligações.' },
        { icon: DollarSign, title: 'Gestão Financeira', desc: 'Controle total de vendas, despesas e lucro em tempo real.' },
        { icon: BarChart3, title: 'Relatórios Inteligentes', desc: 'Dashboards com insights para aumentar seu faturamento.' },
        { icon: MessageCircle, title: 'WhatsApp Automático', desc: 'Lembretes e confirmações enviados automaticamente.' },
        { icon: Gift, title: 'Cupons e Promoções', desc: 'Fidelize clientes com campanhas personalizadas.' },
        { icon: Users, title: 'Gestão de Equipe', desc: 'Controle de barbeiros, comissões e performance.' }
    ];

    const plans = [
        {
            name: 'Basic',
            price: 'R$ 39',
            period: '/mês',
            annual: 'R$ 468/ano',
            features: ['Até 2 barbeiros', 'Agendamento online', 'Relatórios básicos', 'Suporte por email'],
            popular: false
        },
        {
            name: 'Complete',
            price: 'R$ 79',
            period: '/mês',
            annual: 'R$ 948/ano',
            features: ['Até 5 barbeiros', 'WhatsApp automático', 'Gestão financeira', 'Cupons ilimitados', 'Suporte prioritário'],
            popular: true
        },
        {
            name: 'Premium',
            price: 'R$ 119',
            period: '/mês',
            annual: 'R$ 1.428/ano',
            features: ['Barbeiros ilimitados', 'Tudo do Complete', 'Vendas diretas', 'Multi-unidades', 'Suporte 24/7'],
            popular: false
        }
    ];

    const faqs = [
        { q: 'Preciso de cartão de crédito para testar?', a: 'Não! Os 10 dias de teste são 100% grátis, sem necessidade de cartão.' },
        { q: 'Posso cancelar a qualquer momento?', a: 'Sim, sem multas ou burocracia. Cancele quando quiser.' },
        { q: 'Os dados ficam seguros?', a: 'Totalmente. Usamos criptografia de ponta e backup diário.' },
        { q: 'Funciona no celular?', a: 'Perfeitamente! O sistema é 100% responsivo e tem app PWA.' },
        { q: 'Tem suporte em português?', a: 'Sim! Suporte completo em português via WhatsApp, email e chat.' }
    ];

    const testimonials = [
        {
            name: 'Carlos Silva',
            role: 'Dono - Barbearia Premium',
            avatar: 'CS',
            rating: 5,
            text: 'Aumentei meu faturamento em 35% no primeiro mês! O sistema de agendamento online trouxe muitos clientes novos.'
        },
        {
            name: 'Rafael Santos',
            role: 'Proprietário - Barber Shop Elite',
            avatar: 'RS',
            rating: 5,
            text: 'Antes eu perdia tempo com planilhas. Agora tudo é automático e tenho relatórios em tempo real. Indispensável!'
        },
        {
            name: 'Marcelo Costa',
            role: 'Gestor - Rede com 3 unidades',
            avatar: 'MC',
            rating: 5,
            text: 'Gerencio minhas 3 barbearias de qualquer lugar. O WhatsApp automático reduziu faltas em 60%!'
        }
    ];

    const beforeAfter = [
        { before: 'Agenda de papel bagunçada', after: 'Agendamento online 24/7', icon: Calendar },
        { before: 'Planilhas confusas', after: 'Relatórios automáticos', icon: BarChart3 },
        { before: 'Clientes esqueciam horários', after: 'Lembretes por WhatsApp', icon: MessageCircle },
        { before: 'Sem controle de caixa', after: 'Gestão financeira completa', icon: DollarSign }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 opacity-20">
                <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
                <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute -bottom-8 left-20 w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Image src="/logo-791.jpg" alt="791 Barber" width={40} height={40} className="rounded-lg" />
                        <span className="text-2xl font-black text-white">
                            791 Barber
                        </span>
                    </div>
                    <nav className="hidden md:flex gap-8 text-sm font-medium">
                        <a href="#features" className="hover:text-blue-400 transition">Recursos</a>
                        <a href="#pricing" className="hover:text-blue-400 transition">Preços</a>
                        <a href="#faq" className="hover:text-blue-400 transition">FAQ</a>
                    </nav>
                    <div className="flex gap-3">
                        <Link href="/login">
                            <Button variant="ghost" className="text-white hover:bg-white/10">
                                Entrar
                            </Button>
                        </Link>
                        <Link href="/signup">
                            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold">
                                Teste Grátis
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8 animate-in slide-in-from-left duration-1000">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium">
                            <Sparkles className="w-4 h-4" />
                            <span>Mais de {stats.barbershops}+ barbearias confiam</span>
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-black leading-tight">
                            Aumente o <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Faturamento</span> da Sua Barbearia em até <span className="text-green-400">40%</span>
                        </h1>

                        <p className="text-xl text-slate-300 leading-relaxed">
                            Automação completa para agendamentos, vendas, WhatsApp e gestão financeira.
                            <strong className="text-white"> Sem complicação, sem mensalidade abusiva.</strong>
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/signup" className="flex-1">
                                <Button size="lg" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg py-7 rounded-xl shadow-2xl shadow-blue-500/50">
                                    Comece Grátis por 10 Dias
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </Link>
                        </div>

                        <p className="text-sm text-slate-400 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-green-400" />
                            Sem cartão de crédito. Cancele quando quiser.
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
                            <div>
                                <div className="text-3xl font-black text-blue-400">{stats.appointments.toLocaleString('pt-BR')}</div>
                                <div className="text-sm text-slate-400">Agendamentos</div>
                            </div>
                            <div>
                                <div className="text-3xl font-black text-purple-400">R$ {(stats.revenue / 1000).toFixed(0)}k</div>
                                <div className="text-sm text-slate-400">Faturado</div>
                            </div>
                            <div>
                                <div className="text-3xl font-black text-pink-400">98%</div>
                                <div className="text-sm text-slate-400">Satisfação</div>
                            </div>
                        </div>
                    </div>

                    {/* Hero Visual */}
                    <div className="relative animate-in slide-in-from-right duration-1000">
                        <div className="relative bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                            <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-bounce">
                                +40% Faturamento
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl">
                                    <span className="text-sm">Agendamentos Hoje</span>
                                    <span className="text-2xl font-bold text-green-400">+23</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl">
                                    <span className="text-sm">Receita do Mês</span>
                                    <span className="text-2xl font-bold text-blue-400">R$ 12.4k</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl">
                                    <span className="text-sm">Taxa de Ocupação</span>
                                    <span className="text-2xl font-bold text-purple-400">87%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="relative z-10 py-20 bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl lg:text-5xl font-black mb-4">
                            Tudo que Você Precisa em <span className="text-blue-400">Um Só Lugar</span>
                        </h2>
                        <p className="text-xl text-slate-400">Ferramentas profissionais para transformar sua barbearia</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, idx) => (
                            <div
                                key={idx}
                                className="group p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-blue-500/50 transition-all duration-300 hover:scale-105 cursor-pointer"
                                onMouseEnter={() => setActiveFeature(idx)}
                            >
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <feature.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-slate-400">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="relative z-10 py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl lg:text-5xl font-black mb-4">
                            Planos que <span className="text-purple-400">Cabem no Seu Bolso</span>
                        </h2>
                        <p className="text-xl text-slate-400">Escolha o melhor para o seu negócio</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {plans.map((plan, idx) => (
                            <div
                                key={idx}
                                className={`relative p-8 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${plan.popular
                                    ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500 shadow-2xl shadow-blue-500/50'
                                    : 'bg-slate-800/50 border-white/10'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                                        Mais Popular
                                    </div>
                                )}
                                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                <div className="mb-6">
                                    <span className="text-5xl font-black">{plan.price}</span>
                                    <span className="text-slate-400">{plan.period}</span>
                                    <div className="text-sm text-slate-500 mt-1">Cobrado anualmente: {plan.annual}</div>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                            <span className="text-slate-300">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link href="/signup">
                                    <Button
                                        className={`w-full py-6 text-lg font-bold rounded-xl ${plan.popular
                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                                            : 'bg-slate-700 hover:bg-slate-600'
                                            }`}
                                    >
                                        Começar Agora
                                    </Button>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Video Section */}
            <section className="relative z-10 py-20 bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl lg:text-5xl font-black mb-4">
                            Veja o <span className="text-blue-400">791 Barber</span> em Ação
                        </h2>
                        <p className="text-xl text-slate-400">2 minutos que vão transformar seu negócio</p>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <div className="relative aspect-video bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-xl border-2 border-blue-500/30 rounded-3xl overflow-hidden group cursor-pointer hover:border-blue-500/60 transition-all">
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-white border-b-[15px] border-b-transparent ml-2" />
                                </div>
                                <p className="text-lg font-bold">Assista ao Vídeo Demonstrativo</p>
                                <p className="text-sm text-slate-400 mt-2">Veja como é fácil gerenciar sua barbearia</p>
                            </div>
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" />
                            </div>
                        </div>
                        <p className="text-center text-sm text-slate-400 mt-4">💡 Adicione seu vídeo do YouTube, Vimeo ou Loom aqui</p>
                    </div>
                </div>
            </section>

            {/* Before/After Section */}
            <section className="relative z-10 py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl lg:text-5xl font-black mb-4">
                            <span className="text-red-400">Antes</span> vs <span className="text-green-400">Depois</span>
                        </h2>
                        <p className="text-xl text-slate-400">A transformação que seus concorrentes não querem que você veja</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {beforeAfter.map((item, idx) => (
                            <div key={idx} className="relative group">
                                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-green-500/50 transition-all duration-300">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center mb-4">
                                        <item.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="mb-4 pb-4 border-b border-white/10">
                                        <div className="text-xs font-bold text-red-400 mb-2">❌ ANTES</div>
                                        <p className="text-sm text-slate-400">{item.before}</p>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-green-400 mb-2">✅ DEPOIS</div>
                                        <p className="text-sm font-bold text-white">{item.after}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="relative z-10 py-20 bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl lg:text-5xl font-black mb-4">
                            O Que Nossos <span className="text-yellow-400">Clientes</span> Dizem
                        </h2>
                        <p className="text-xl text-slate-400">Resultados reais de quem já transformou o negócio</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, idx) => (
                            <div key={idx} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-yellow-500/50 transition-all duration-300 hover:scale-105">
                                <div className="flex gap-1 mb-4">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                    ))}
                                </div>
                                <p className="text-slate-300 mb-6 italic">"{testimonial.text}"</p>
                                <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center font-bold text-lg">
                                        {testimonial.avatar}
                                    </div>
                                    <div>
                                        <div className="font-bold">{testimonial.name}</div>
                                        <div className="text-sm text-slate-400">{testimonial.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Chatbot Widget */}
            <div className="fixed bottom-6 right-6 z-50">
                {/* Contact Menu */}
                {chatMenuOpen && (
                    <div className="absolute bottom-20 right-0 bg-slate-900 border border-white/20 rounded-2xl p-4 shadow-2xl backdrop-blur-xl mb-2 min-w-[250px] animate-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-white">Como podemos ajudar?</h4>
                            <button
                                onClick={() => setChatMenuOpen(false)}
                                className="text-slate-400 hover:text-white transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-2">
                            <a
                                href="https://wa.me/5548991803379?text=Olá! Gostaria de saber mais sobre o 791 Barber"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-green-600 hover:bg-green-700 rounded-xl transition group"
                            >
                                <MessageCircle className="w-5 h-5" />
                                <div>
                                    <div className="font-bold text-sm">WhatsApp</div>
                                    <div className="text-xs opacity-80">Resposta rápida</div>
                                </div>
                            </a>
                            <a
                                href="mailto:contato@791solucoes.com.br?subject=Quero conhecer o 791 Barber&body=Olá, gostaria de saber mais sobre o sistema."
                                className="flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition group"
                            >
                                <Mail className="w-5 h-5" />
                                <div>
                                    <div className="font-bold text-sm">Email</div>
                                    <div className="text-xs opacity-80">contato@791solucoes.com.br</div>
                                </div>
                            </a>
                        </div>
                    </div>
                )}

                {/* Main Button */}
                <button
                    onClick={() => setChatMenuOpen(!chatMenuOpen)}
                    className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full p-4 shadow-2xl shadow-blue-500/50 hover:scale-110 transition-all duration-300"
                >
                    <MessageCircle className="w-6 h-6" />
                </button>
            </div>

            {/* FAQ Section */}
            <section id="faq" className="relative z-10 py-20 bg-slate-900/50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl lg:text-5xl font-black mb-4">
                            Perguntas <span className="text-green-400">Frequentes</span>
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, idx) => (
                            <div
                                key={idx}
                                className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden"
                            >
                                <button
                                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                                    className="w-full p-6 text-left flex justify-between items-center hover:bg-white/5 transition"
                                >
                                    <span className="font-bold text-lg">{faq.q}</span>
                                    <ChevronDown className={`w-5 h-5 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
                                </button>
                                {activeFaq === idx && (
                                    <div className="px-6 pb-6 text-slate-400">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative z-10 py-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-12">
                        <h2 className="text-4xl lg:text-5xl font-black mb-6">
                            Pronto para <span className="text-blue-400">Decolar</span>?
                        </h2>
                        <p className="text-xl text-slate-300 mb-8">
                            Junte-se a centenas de barbearias que já aumentaram seu faturamento com o 791 Barber
                        </p>
                        <Link href="/signup">
                            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-xl py-8 px-12 rounded-xl shadow-2xl shadow-blue-500/50">
                                Começar Teste Grátis Agora
                                <Zap className="ml-2 w-6 h-6" />
                            </Button>
                        </Link>
                        <p className="mt-6 text-sm text-slate-400">
                            10 dias grátis • Sem cartão • Cancele quando quiser
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/10 bg-slate-900/50 backdrop-blur-xl py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Image src="/logo-791.jpg" alt="791" width={32} height={32} className="rounded" />
                                <span className="font-bold text-lg">791 Barber</span>
                            </div>
                            <p className="text-sm text-slate-400">
                                Transformando barbearias em negócios de sucesso
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Produto</h4>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li><a href="#features" className="hover:text-white transition">Recursos</a></li>
                                <li><a href="#pricing" className="hover:text-white transition">Preços</a></li>
                                <li><a href="/signup" className="hover:text-white transition">Teste Grátis</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Empresa</h4>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li><a href="#" className="hover:text-white transition">Sobre</a></li>
                                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                                <li><a href="#" className="hover:text-white transition">Contato</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li><a href="#" className="hover:text-white transition">Termos de Uso</a></li>
                                <li><a href="#" className="hover:text-white transition">Privacidade</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-white/10 pt-8 text-center text-sm text-slate-400">
                        <p>© 2026 791 Solutions. Todos os direitos reservados.</p>
                    </div>
                </div>
            </footer>

            <style jsx global>{`
                @keyframes blob {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(20px, -50px) scale(1.1); }
                    50% { transform: translate(-20px, 20px) scale(0.9); }
                    75% { transform: translate(50px, 50px) scale(1.05); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </div>
    );
}
