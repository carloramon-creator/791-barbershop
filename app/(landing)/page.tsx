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
    const [contactFormOpen, setContactFormOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
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
        { before: 'Filas e esperas caóticas', after: 'Fila Digital Inteligente (WhatsApp)', icon: Users },
        { before: 'Planilhas confusas', after: 'Relatórios automáticos', icon: BarChart3 },
        { before: 'Clientes esqueciam horários', after: 'Lembretes por WhatsApp', icon: MessageCircle },
        { before: 'Sem controle de caixa', after: 'Gestão financeira completa', icon: DollarSign }
    ];

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormStatus('sending');

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setFormStatus('success');
                setFormData({ name: '', email: '', message: '' });
                setTimeout(() => {
                    setContactFormOpen(false);
                    setFormStatus('idle');
                }, 2000);
            } else {
                setFormStatus('error');
            }
        } catch (error) {
            setFormStatus('error');
        }
    };


    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 opacity-40">
                <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
                <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute -bottom-8 left-20 w-96 h-96 bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-slate-200 bg-white/70 backdrop-blur-xl sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Image src="/logo-791.jpg" alt="791 Barber" width={40} height={40} className="rounded-lg" />
                        <span className="text-2xl font-black text-slate-900">
                            791 Barber
                        </span>
                    </div>
                    <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
                        <a href="#features" className="hover:text-blue-600 transition">Recursos</a>
                        <a href="#pricing" className="hover:text-blue-600 transition">Preços</a>
                        <a href="#faq" className="hover:text-blue-600 transition">FAQ</a>
                    </nav>
                    <div className="flex gap-3">
                        <Link href="/login">
                            <Button variant="ghost" className="text-slate-700 hover:bg-slate-100">
                                Entrar
                            </Button>
                        </Link>
                        <Link href="/signup">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
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
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-sm font-medium">
                            <Sparkles className="w-4 h-4" />
                            <span>Mais de {stats.barbershops}+ barbearias confiam</span>
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-black leading-tight text-slate-900">
                            Aumente o <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">Faturamento</span> da Sua Barbearia em até <span className="text-emerald-600">40%</span>
                        </h1>

                        <p className="text-xl text-slate-600 leading-relaxed">
                            Automação completa para agendamentos, vendas, WhatsApp e gestão financeira.
                            <strong className="text-slate-900"> Sem complicação, sem mensalidade abusiva.</strong>
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/signup" className="flex-1">
                                <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-7 rounded-xl shadow-xl shadow-blue-200">
                                    Comece Grátis por 10 Dias
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </Link>
                        </div>

                        <p className="text-sm text-slate-500 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-500" />
                            Sem cartão de crédito. Cancele quando quiser.
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200">
                            <div>
                                <div className="text-3xl font-black text-blue-600">{stats.appointments.toLocaleString('pt-BR')}</div>
                                <div className="text-sm text-slate-500">Agendamentos</div>
                            </div>
                            <div>
                                <div className="text-3xl font-black text-purple-600">R$ {(stats.revenue / 1000).toFixed(0)}k</div>
                                <div className="text-sm text-slate-500">Faturado</div>
                            </div>
                            <div>
                                <div className="text-3xl font-black text-emerald-600">98%</div>
                                <div className="text-sm text-slate-500">Satisfação</div>
                            </div>
                        </div>
                    </div>

                    {/* Hero Visual */}
                    <div className="relative animate-in slide-in-from-right duration-1000">
                        <div className="relative bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl">
                            <div className="absolute -top-4 -right-4 bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-bounce">
                                +40% Faturamento
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                    <span className="text-sm text-slate-600 font-medium">Agendamentos Hoje</span>
                                    <span className="text-2xl font-bold text-emerald-600">+23</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                    <span className="text-sm text-slate-600 font-medium">Receita do Mês</span>
                                    <span className="text-2xl font-bold text-blue-600">R$ 12.4k</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                    <span className="text-sm text-slate-600 font-medium">Taxa de Ocupação</span>
                                    <span className="text-2xl font-bold text-purple-600">87%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="relative z-10 py-20 bg-white/50 border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl lg:text-5xl font-black mb-4 text-slate-900">
                            Tudo que Você Precisa em <span className="text-blue-600">Um Só Lugar</span>
                        </h2>
                        <p className="text-xl text-slate-600 font-medium">Ferramentas profissionais para transformar sua barbearia</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, idx) => (
                            <div
                                key={idx}
                                className="group p-8 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-100 transition-all duration-300 hover:scale-105 cursor-pointer"
                                onMouseEnter={() => setActiveFeature(idx)}
                            >
                                <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <feature.icon className="w-7 h-7 text-blue-600" />
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-slate-900">{feature.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* Video Section */}
            <section className="relative z-10 py-20 bg-white/50 border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl lg:text-5xl font-black mb-4 text-slate-900">
                            Veja o <span className="text-blue-600">791 Barber</span> em Ação
                        </h2>
                        <p className="text-xl text-slate-600 font-medium">2 minutos que vão transformar seu negócio</p>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <div className="relative aspect-video bg-slate-100 border-2 border-slate-200 rounded-3xl overflow-hidden shadow-xl">
                            <iframe
                                className="absolute inset-0 w-full h-full"
                                src="https://www.youtube.com/embed/HNiY-baV378"
                                title="791 Barber em Ação"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            </section>

            {/* Before/After Section */}
            <section className="relative z-10 py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl lg:text-5xl font-black mb-4 text-slate-900">
                            <span className="text-rose-500">Antes</span> vs <span className="text-emerald-600">Depois</span>
                        </h2>
                        <p className="text-xl text-slate-600 font-medium">A transformação que seus concorrentes não querem que você veja</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {beforeAfter.map((item, idx) => (
                            <div key={idx} className="relative group">
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-50/50 transition-all duration-300">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
                                        <item.icon className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div className="mb-4 pb-4 border-b border-slate-100">
                                        <div className="text-xs font-bold text-rose-500 mb-2 tracking-wider">❌ ANTES</div>
                                        <p className="text-sm text-slate-500 font-medium">{item.before}</p>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-emerald-600 mb-2 tracking-wider">✅ DEPOIS</div>
                                        <p className="text-sm font-bold text-slate-900">{item.after}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            {/* Testimonials Section */}
            <section className="relative z-10 py-20 bg-white/50 border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl lg:text-5xl font-black mb-4 text-slate-900">
                            O Que Nossos <span className="text-yellow-600">Clientes</span> Dizem
                        </h2>
                        <p className="text-xl text-slate-600 font-medium">Resultados reais de quem já transformou o negócio</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-8 hover:border-yellow-500 hover:shadow-2xl hover:shadow-yellow-50 transition-all duration-300 hover:scale-105">
                                <div className="flex gap-1 mb-4">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                    ))}
                                </div>
                                <p className="text-slate-600 mb-6 italic font-medium leading-relaxed">"{testimonial.text}"</p>
                                <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center font-bold text-lg text-blue-600">
                                        {testimonial.avatar}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">{testimonial.name}</div>
                                        <div className="text-sm text-slate-500 font-medium">{testimonial.role}</div>
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
                    <div className="absolute bottom-20 right-0 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl mb-2 min-w-[250px] animate-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-900">Como podemos ajudar?</h4>
                            <button
                                onClick={() => setChatMenuOpen(false)}
                                className="text-slate-400 hover:text-slate-900 transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-2">
                            <a
                                href="https://wa.me/5548991803379?text=Olá! Gostaria de saber mais sobre o 791 Barber"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition group shadow-lg shadow-emerald-100"
                            >
                                <MessageCircle className="w-5 h-5" />
                                <div>
                                    <div className="font-bold text-sm">WhatsApp</div>
                                    <div className="text-xs opacity-90">Resposta rápida</div>
                                </div>
                            </a>
                            <button
                                onClick={() => {
                                    setContactFormOpen(true);
                                    setChatMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition group text-left shadow-lg shadow-blue-100"
                            >
                                <Mail className="w-5 h-5" />
                                <div>
                                    <div className="font-bold text-sm">Enviar Email</div>
                                    <div className="text-xs opacity-90">Fale com nossa equipe</div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Button */}
                <button
                    onClick={() => setChatMenuOpen(!chatMenuOpen)}
                    className="group bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-2xl shadow-blue-200 hover:scale-110 transition-all duration-300"
                >
                    {chatMenuOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
                </button>
            </div>

            {/* FAQ Section */}
            <section id="faq" className="relative z-10 py-20 bg-slate-50/50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl lg:text-5xl font-black mb-4 text-slate-900">
                            Perguntas <span className="text-blue-600">Frequentes</span>
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, idx) => (
                            <div
                                key={idx}
                                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:border-blue-500/50 transition-colors"
                            >
                                <button
                                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                                    className="w-full p-6 text-left flex justify-between items-center hover:bg-slate-50 transition"
                                >
                                    <span className="font-bold text-lg text-slate-900">{faq.q}</span>
                                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${activeFaq === idx ? 'rotate-180 text-blue-600' : ''}`} />
                                </button>
                                {activeFaq === idx && (
                                    <div className="px-6 pb-6 text-slate-600 font-medium border-t border-slate-50 pt-4 leading-relaxed">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Form Modal */}
            {contactFormOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setContactFormOpen(false)}
                            className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="mb-8">
                            <h2 className="text-3xl font-black mb-2 text-slate-900">Fale <span className="text-blue-600">Conosco</span></h2>
                            <p className="text-slate-600 font-medium">Preencha os campos abaixo e entraremos em contato.</p>
                        </div>

                        {formStatus === 'success' ? (
                            <div className="py-12 text-center space-y-4 animate-in zoom-in-95">
                                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">Mensagem Enviada!</h3>
                                <p className="text-slate-600 font-medium">Agradecemos o contato. Responderemos em breve.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleContactSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Nome Completo</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Seu nome"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition text-slate-900"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Email</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="seu@email.com"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition text-slate-900"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Mensagem</label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="Como podemos ajudar?"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition resize-none text-slate-900"
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    />
                                </div>

                                {formStatus === 'error' && (
                                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm font-medium">
                                        Ocorreu um erro ao enviar. Por favor, tente novamente.
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={formStatus === 'sending'}
                                    className="w-full py-7 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-xl shadow-blue-100 disabled:opacity-50"
                                >
                                    {formStatus === 'sending' ? 'Enviando...' : 'Enviar Mensagem'}
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            )}
            {/* Pricing Section - Compact */}
            <section id="pricing" className="relative z-10 py-20">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl lg:text-4xl font-black mb-4 text-slate-900">
                            Planos que <span className="text-blue-600">Cabem no Seu Bolso</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {plans.map((plan, idx) => (
                            <div
                                key={idx}
                                className={`relative p-6 rounded-2xl border transition-all duration-300 hover:scale-105 ${plan.popular
                                    ? 'bg-white border-blue-500 shadow-xl shadow-blue-100 ring-4 ring-blue-50'
                                    : 'bg-white border-slate-200 shadow-sm'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-0.5 rounded-full text-xs font-bold shadow-lg">
                                        Mais Popular
                                    </div>
                                )}
                                <h3 className="text-xl font-bold mb-2 text-slate-900">{plan.name}</h3>
                                <div className="mb-4">
                                    <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                                    <span className="text-slate-500 text-sm font-medium">{plan.period}</span>
                                </div>
                                <ul className="space-y-3 mb-6">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                            <span className="text-sm text-slate-600 font-medium">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link href="/signup">
                                    <Button
                                        className={`w-full py-5 text-sm font-bold rounded-xl ${plan.popular
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
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

            {/* Final CTA */}
            <section className="relative z-10 py-20 bg-white/50 border-y border-slate-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 shadow-sm">
                        <h2 className="text-4xl lg:text-5xl font-black mb-6 text-slate-900">
                            Pronto para <span className="text-blue-600">Decolar</span>?
                        </h2>
                        <p className="text-xl text-slate-600 font-medium mb-8">
                            Junte-se a centenas de barbearias que já aumentaram seu faturamento com o 791 Barber
                        </p>
                        <Link href="/signup">
                            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl py-8 px-12 rounded-xl shadow-2xl shadow-blue-200">
                                Começar Teste Grátis Agora
                                <Zap className="ml-2 w-6 h-6" />
                            </Button>
                        </Link>
                        <p className="mt-6 text-sm text-slate-500 font-medium">
                            10 dias grátis • Sem cartão • Cancele quando quiser
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-slate-200 bg-slate-50 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Image src="/logo-791.jpg" alt="791" width={32} height={32} className="rounded" />
                                <span className="font-bold text-lg text-slate-900">791 Barber</span>
                            </div>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                Transformando barbearias em negócios de sucesso com tecnologia de ponta.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4 text-slate-900">Produto</h4>
                            <ul className="space-y-2 text-sm text-slate-600 font-medium">
                                <li><a href="#features" className="hover:text-blue-600 transition">Recursos</a></li>
                                <li><a href="#pricing" className="hover:text-blue-600 transition">Preços</a></li>
                                <li><a href="/signup" className="hover:text-blue-600 transition">Teste Grátis</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4 text-slate-900">Empresa</h4>
                            <ul className="space-y-2 text-sm text-slate-600 font-medium">
                                <li><a href="#" className="hover:text-blue-600 transition">Sobre</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition">Blog</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition">Contato</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4 text-slate-900">Legal</h4>
                            <ul className="space-y-2 text-sm text-slate-600 font-medium">
                                <li><a href="#" className="hover:text-blue-600 transition">Termos de Uso</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition">Privacidade</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-slate-200 pt-8 text-center text-sm text-slate-500 font-medium">
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
