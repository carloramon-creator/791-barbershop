'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Scissors, Sparkles, ArrowLeft, ArrowRight, Loader2, Calendar, Users, Clock } from 'lucide-react';
import { WizardProgress } from '@/components/onboarding/WizardProgress';
import { EditableTable } from '@/components/ui/editable-table';
import { getDefaultServices, getDefaultProducts, type BusinessType } from '@/lib/default-data';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabase-client';

type ServiceMethod = 'queue' | 'appointments';

export default function SignupPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form data
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        barbershopName: '',
        phone: '',
        businessType: 'barbershop' as BusinessType,
        serviceMethod: 'queue' as ServiceMethod, // Default to queue
    });

    const [services, setServices] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    // Load default data on mount or type change
    useEffect(() => {
        if (services.length === 0) setServices(getDefaultServices(formData.businessType));
        if (products.length === 0) setProducts(getDefaultProducts(formData.businessType));
    }, [formData.businessType]);

    // Validation
    const validateStep = () => {
        setError('');

        if (step === 1) {
            if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
                setError('Preencha todos os campos');
                return false;
            }
            if (formData.password.length < 8) {
                setError('A senha deve ter no mínimo 8 caracteres');
                return false;
            }
            if (formData.password !== formData.confirmPassword) {
                setError('As senhas não coincidem');
                return false;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                setError('Email inválido');
                return false;
            }
        }

        if (step === 2) {
            if (!formData.barbershopName || !formData.phone) {
                setError('Preencha todos os campos');
                return false;
            }
        }

        return true;
    };

    const handleNext = () => {
        if (validateStep()) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        setError('');
        setStep(step - 1);
    };

    const handleSkipServices = () => {
        setServices([]);
        setStep(step + 1);
    };

    const handleSkipProducts = () => {
        setProducts([]);
        setStep(step + 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            // 1. Create Account via API
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    services,
                    products,
                    // Map serviceMethod to backend flags
                    module_queue_enabled: formData.serviceMethod === 'queue',
                    module_appointments_enabled: formData.serviceMethod === 'appointments',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao criar conta');
            }

            // 2. Auto-login on client side
            const { error: loginError } = await supabaseClient.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (loginError) {
                // If login fails but account created, redirect to login page with message
                console.error("Auto-login failed:", loginError);
                router.push('/login?signup_success=true');
                return;
            }

            // 3. Redirect to dashboard
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="w-full max-w-4xl">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <Scissors className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-blue-600 tracking-tighter uppercase">
                        791 <span className="text-slate-100">Barber</span>
                    </h1>
                </div>

                {/* Wizard Container */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                    {/* Progress */}
                    <WizardProgress currentStep={step} totalSteps={5} title={getStepTitle(step)} />

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Step Content */}
                    {step === 1 && (
                        <Step1
                            formData={formData}
                            setFormData={setFormData}
                            onNext={handleNext}
                        />
                    )}

                    {step === 2 && (
                        <Step2
                            formData={formData}
                            setFormData={setFormData}
                            onNext={handleNext}
                            onBack={handleBack}
                        />
                    )}

                    {step === 3 && (
                        <Step3
                            services={services}
                            setServices={setServices}
                            onNext={handleNext}
                            onBack={handleBack}
                            onSkip={handleSkipServices}
                        />
                    )}

                    {step === 4 && (
                        <Step4
                            products={products}
                            setProducts={setProducts}
                            onNext={handleNext}
                            onBack={handleBack}
                            onSkip={handleSkipProducts}
                        />
                    )}

                    {step === 5 && (
                        <Step5
                            formData={formData}
                            services={services}
                            products={products}
                            loading={loading}
                            onSubmit={handleSubmit}
                            onBack={handleBack}
                        />
                    )}
                </div>

                {/* Login Link */}
                <div className="text-center mt-6">
                    <Link href="/login" className="text-sm text-slate-400 hover:text-slate-300 transition-colors">
                        Já tem conta? <span className="text-blue-400 font-bold">Fazer login</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

function getStepTitle(step: number) {
    const titles = [
        '',
        'Crie sua conta',
        'Sobre sua barbearia',
        'Seus serviços',
        'Seus produtos',
        'Tudo pronto!',
    ];
    return titles[step] || '';
}

// STEP 1: Create Account
function Step1({ formData, setFormData, onNext }: any) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Nome completo</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="João Silva"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Email</label>
                <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors [&:-webkit-autofill]:!bg-slate-800 [&:-webkit-autofill]:!text-slate-100"
                    placeholder="joao@email.com"
                    autoComplete="email"
                    style={{
                        WebkitTextFillColor: '#f1f5f9',
                        WebkitBoxShadow: '0 0 0 1000px #1e293b inset',
                    }}
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Senha</label>
                <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="••••••••"
                />
                <p className="text-xs text-slate-500 mt-1">Mínimo 8 caracteres</p>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Confirmar senha</label>
                <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="••••••••"
                />
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8">
                    Continuar <ArrowRight className="ml-2" size={16} />
                </Button>
            </div>
        </div>
    );
}

// STEP 2: Barbershop Info & Config
function Step2({ formData, setFormData, onNext, onBack }: any) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Nome da barbearia</label>
                    <input
                        type="text"
                        value={formData.barbershopName}
                        onChange={(e) => setFormData({ ...formData, barbershopName: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Barbearia Ingleses"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Telefone (WhatsApp)</label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="(48) 99999-9999"
                    />
                </div>
            </div>

            <div className="border-t border-slate-800 pt-6">
                <label className="block text-sm font-bold text-slate-300 mb-3">Qual é o seu tipo de negócio?</label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, businessType: 'barbershop' })}
                        className={cn(
                            "p-4 rounded-xl border-2 transition-all text-left",
                            formData.businessType === 'barbershop'
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-slate-700 hover:border-slate-600 bg-slate-800"
                        )}
                    >
                        <Scissors className={cn("mb-3", formData.businessType === 'barbershop' ? "text-blue-400" : "text-slate-400")} size={24} />
                        <h3 className="font-bold text-slate-100 mb-1">Barbearia</h3>
                        <p className="text-xs text-slate-400">Foco masculino</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, businessType: 'beauty_salon' })}
                        className={cn(
                            "p-4 rounded-xl border-2 transition-all text-left",
                            formData.businessType === 'beauty_salon'
                                ? "border-pink-500 bg-pink-500/10"
                                : "border-slate-700 hover:border-slate-600 bg-slate-800"
                        )}
                    >
                        <Sparkles className={cn("mb-3", formData.businessType === 'beauty_salon' ? "text-pink-400" : "text-slate-400")} size={24} />
                        <h3 className="font-bold text-slate-100 mb-1">Salão de Beleza</h3>
                        <p className="text-xs text-slate-400">Foco feminino</p>
                    </button>
                </div>
            </div>

            <div className="border-t border-slate-800 pt-6">
                <label className="block text-sm font-bold text-slate-300 mb-3">Como você atende?</label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, serviceMethod: 'queue' })}
                        className={cn(
                            "p-4 rounded-xl border-2 transition-all text-left relative",
                            formData.serviceMethod === 'queue'
                                ? "border-green-500 bg-green-500/10"
                                : "border-slate-700 hover:border-slate-600 bg-slate-800"
                        )}
                    >
                        <Users className={cn("mb-3", formData.serviceMethod === 'queue' ? "text-green-400" : "text-slate-400")} size={24} />
                        <h3 className="font-bold text-slate-100 mb-1">Por Ordem de Chegada</h3>
                        <p className="text-xs text-slate-400 mb-2">Cliente chega, entra na fila digital e aguarda.</p>
                        {formData.serviceMethod === 'queue' && <span className="absolute top-4 right-4 text-green-500 text-xs font-bold bg-green-900/40 px-2 py-0.5 rounded">Recomendado</span>}
                    </button>

                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, serviceMethod: 'appointments' })}
                        className={cn(
                            "p-4 rounded-xl border-2 transition-all text-left",
                            formData.serviceMethod === 'appointments'
                                ? "border-purple-500 bg-purple-500/10"
                                : "border-slate-700 hover:border-slate-600 bg-slate-800"
                        )}
                    >
                        <Calendar className={cn("mb-3", formData.serviceMethod === 'appointments' ? "text-purple-400" : "text-slate-400")} size={24} />
                        <h3 className="font-bold text-slate-100 mb-1">Com Hora Marcada</h3>
                        <p className="text-xs text-slate-400">Cliente escolhe o horário na agenda.</p>
                    </button>
                </div>
            </div>

            <div className="flex justify-between pt-4">
                <Button onClick={onBack} variant="ghost" className="text-slate-400 hover:text-slate-300">
                    <ArrowLeft className="mr-2" size={16} /> Voltar
                </Button>
                <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8">
                    Continuar <ArrowRight className="ml-2" size={16} />
                </Button>
            </div>
        </div>
    );
}

// STEP 3: Services
function Step3({ services, setServices, onNext, onBack, onSkip }: any) {
    const addService = () => {
        setServices([...services, { name: '', price: 0, duration_minutes: 0 }]);
    };

    const removeService = (index: number) => {
        setServices(services.filter((_: any, i: number) => i !== index));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                    💡 Pré-preenchemos com valores de mercado. Edite à vontade ou pule por enquanto!
                </p>
            </div>

            <EditableTable
                columns={[
                    { key: 'name', label: 'Serviço', type: 'text', required: true },
                    { key: 'price', label: 'Preço', type: 'currency', required: true },
                    { key: 'duration_minutes', label: 'Duração', type: 'number', suffix: 'min', required: true },
                ]}
                data={services}
                onChange={setServices}
                onAdd={addService}
                onRemove={removeService}
            />

            <div className="flex justify-between pt-4">
                <div className="flex gap-3">
                    <Button onClick={onBack} variant="ghost" className="text-slate-400 hover:text-slate-300">
                        <ArrowLeft className="mr-2" size={16} /> Voltar
                    </Button>
                    <Button onClick={onSkip} variant="ghost" className="text-slate-400 hover:text-slate-300">
                        Pular por enquanto
                    </Button>
                </div>
                <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8">
                    Continuar <ArrowRight className="ml-2" size={16} />
                </Button>
            </div>
        </div>
    );
}

// STEP 4: Products
function Step4({ products, setProducts, onNext, onBack, onSkip }: any) {
    const addProduct = () => {
        setProducts([...products, { name: '', price: 0, category: 'Bebidas' }]);
    };

    const removeProduct = (index: number) => {
        setProducts(products.filter((_: any, i: number) => i !== index));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                    💡 Produtos comuns para venda. Edite ou pule!
                </p>
            </div>

            <EditableTable
                columns={[
                    { key: 'name', label: 'Produto', type: 'text', required: true },
                    { key: 'price', label: 'Preço', type: 'currency', required: true },
                    { key: 'category', label: 'Categoria', type: 'text', required: true },
                ]}
                data={products}
                onChange={setProducts}
                onAdd={addProduct}
                onRemove={removeProduct}
            />

            <div className="flex justify-between pt-4">
                <div className="flex gap-3">
                    <Button onClick={onBack} variant="ghost" className="text-slate-400 hover:text-slate-300">
                        <ArrowLeft className="mr-2" size={16} /> Voltar
                    </Button>
                    <Button onClick={onSkip} variant="ghost" className="text-slate-400 hover:text-slate-300">
                        Pular por enquanto
                    </Button>
                </div>
                <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8">
                    Continuar <ArrowRight className="ml-2" size={16} />
                </Button>
            </div>
        </div>
    );
}

// STEP 5: Complete
function Step5({ formData, services, products, loading, onSubmit, onBack }: any) {
    return (
        <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="text-6xl mb-4">🎉</div>

            <div>
                <h3 className="text-2xl font-black text-slate-100 mb-2">
                    Parabéns, {formData.name.split(' ')[0]}!
                </h3>
                <p className="text-slate-400">
                    Sua barbearia está configurada e pronta para usar.
                </p>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 space-y-3 text-left border border-slate-700">
                <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-400">✅</span>
                    <span className="text-slate-300">Conta criada</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-400">✅</span>
                    <span className="text-slate-300">Perfil: {formData.businessType === 'barbershop' ? 'Barbearia' : 'Salão de Beleza'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-400">✅</span>
                    <span className="text-slate-300">Atendimento: {formData.serviceMethod === 'queue' ? 'Fila Digital (Ordem de chegada)' : 'Hora Marcada'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-400">✅</span>
                    <span className="text-slate-300">{services.length} serviços cadastrados</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-400">✅</span>
                    <span className="text-slate-300">{products.length} produtos cadastrados</span>
                </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-left">
                <p className="text-sm text-blue-300">
                    💡 Complete seu perfil depois para desbloquear mais recursos:
                </p>
                <ul className="text-xs text-slate-400 mt-2 space-y-1 ml-6">
                    <li>• Adicionar logo</li>
                    <li>• Configurar horários</li>
                    <li>• Adicionar endereço</li>
                    <li>• Cadastrar dados bancários (Pix)</li>
                </ul>
            </div>

            <div className="flex justify-between pt-4">
                <Button onClick={onBack} variant="ghost" className="text-slate-400 hover:text-slate-300" disabled={loading}>
                    <ArrowLeft className="mr-2" size={16} /> Voltar
                </Button>
                <Button onClick={onSubmit} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 animate-spin" size={16} />
                            Entrando...
                        </>
                    ) : (
                        <>
                            Ir para o Dashboard <ArrowRight className="ml-2" size={16} />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
