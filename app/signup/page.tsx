'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Scissors, Sparkles, ArrowLeft, ArrowRight, Loader2, Calendar, Users, Clock } from 'lucide-react';
import { WizardProgress } from '@/components/onboarding/WizardProgress';
import { EditableTable } from '@/components/ui/editable-table';
import { getDefaultServices, getDefaultProducts, type BusinessType } from '@/lib/default-data';
import { cn, formatPhone, isValidCNPJ, isValidCPF, formatIdentification } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabase-client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

type ServiceMethod = 'queue' | 'appointments';

export default function SignupPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [openDoc, setOpenDoc] = useState<'terms' | 'privacy' | 'contract' | null>(null);

    // Form data
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        barbershopName: '',
        phone: '',
        cnpj: '',
        hasCnpj: true,
        businessType: 'barbershop' as BusinessType,
        serviceMethod: 'queue' as ServiceMethod, // Default to queue
    });

    const [services, setServices] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    const [checkingEmail, setCheckingEmail] = useState(false);

    // Load default data on mount or type change
    useEffect(() => {
        if (services.length === 0) setServices(getDefaultServices(formData.businessType));
        if (products.length === 0) setProducts(getDefaultProducts(formData.businessType));
    }, [formData.businessType]);

    // Validation
    const validateStep = async () => {
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

            // Check if email already exists
            setCheckingEmail(true);
            try {
                const res = await fetch('/api/auth/check-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: formData.email })
                });
                const data = await res.json();
                if (data.exists) {
                    setError('Este email já está cadastrado. Tente fazer login.');
                    return false;
                }
            } catch (err) {
                console.error("Email check failed", err);
                // Optionally let them pass if check fails, but safer to block or warn. 
                // For now, keeping it robust: if API fails, we might let them try submitting later?
                // But user wants to avoid late error. Let's show generic error.
                setError('Erro ao verificar email. Tente novamente.');
                return false;
            } finally {
                setCheckingEmail(false);
            }
        }

        if (step === 2) {
            if (!formData.barbershopName || !formData.phone || !formData.cnpj) {
                setError('Preencha todos os campos, incluindo o documento');
                return false;
            }

            const docOnlyNumbers = formData.cnpj.replace(/\D/g, '');
            if (formData.hasCnpj) {
                if (!isValidCNPJ(formData.cnpj)) {
                    setError('CNPJ inválido. Verifique os números.');
                    return false;
                }
            } else {
                if (!isValidCPF(formData.cnpj)) {
                    setError('CPF inválido. Verifique os números.');
                    return false;
                }
            }
        }

        return true;
    };

    const handleNext = async () => {
        if (await validateStep()) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        setError('');
        setStep(step - 1);
    };

    const handleBusinessSelection = (type: BusinessType) => {
        setFormData({
            ...formData,
            businessType: type,
            serviceMethod: type === 'barbershop' ? 'queue' : 'appointments'
        });
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
                            checkingEmail={checkingEmail}
                        />
                    )}

                    {step === 2 && (
                        <Step2
                            formData={formData}
                            setFormData={setFormData}
                            onNext={handleNext}
                            onBack={handleBack}
                            onBusinessSelection={handleBusinessSelection}
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
                            onOpenDoc={setOpenDoc}
                        />
                    )}
                </div>

                {/* Legal Modal */}
                <Dialog open={!!openDoc} onOpenChange={(open) => !open && setOpenDoc(null)}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-slate-100">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-blue-500">
                                {openDoc === 'terms' && 'Termos de Uso'}
                                {openDoc === 'privacy' && 'Política de Privacidade'}
                                {openDoc === 'contract' && 'Contrato de Assinatura'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                            {openDoc === 'terms' && <TermsContent />}
                            {openDoc === 'privacy' && <PrivacyContent />}
                            {openDoc === 'contract' && <ContractContent />}
                        </div>
                    </DialogContent>
                </Dialog>

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
function Step1({ formData, setFormData, onNext, checkingEmail }: any) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* ... inputs ... */}
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
                <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8" disabled={checkingEmail}>
                    {checkingEmail ? (
                        <>
                            <Loader2 className="mr-2 animate-spin" size={16} /> Verificando...
                        </>
                    ) : (
                        <>
                            Continuar <ArrowRight className="ml-2" size={16} />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

// STEP 2: Barbershop Info & Config
function Step2({ formData, setFormData, onNext, onBack, onBusinessSelection }: any) {
    const [cnpjError, setCnpjError] = React.useState('');

    const handleCnpjBlur = () => {
        if (!formData.cnpj) {
            setCnpjError('');
            return;
        }

        const isValid = formData.hasCnpj
            ? isValidCNPJ(formData.cnpj)
            : isValidCPF(formData.cnpj);

        if (!isValid) {
            setCnpjError(formData.hasCnpj ? 'CNPJ inválido' : 'CPF inválido');
        } else {
            setCnpjError('');
        }
    };

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
                        onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="(48) 99999-9999"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-slate-300">
                            {formData.hasCnpj ? 'CNPJ da Empresa' : 'CPF do Proprietário'}
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                setFormData({ ...formData, hasCnpj: !formData.hasCnpj, cnpj: '' });
                                setCnpjError('');
                            }}
                            className="text-[10px] text-blue-500 hover:text-blue-400 font-bold uppercase"
                        >
                            {formData.hasCnpj ? 'Não tenho CNPJ' : 'Tenho CNPJ'}
                        </button>
                    </div>
                    <input
                        type="text"
                        value={formData.cnpj}
                        onChange={(e) => {
                            setFormData({ ...formData, cnpj: formatIdentification(e.target.value) });
                            if (cnpjError) setCnpjError('');
                        }}
                        onBlur={handleCnpjBlur}
                        className={cn(
                            "w-full bg-slate-800 border rounded-lg px-4 py-3 text-slate-100 focus:outline-none transition-colors",
                            cnpjError ? "border-red-500 focus:border-red-500" : "border-slate-700 focus:border-blue-500"
                        )}
                        placeholder={formData.hasCnpj ? "00.000.000/0000-00" : "000.000.000-00"}
                    />
                    {cnpjError ? (
                        <p className="text-[10px] text-red-500 mt-1 font-bold">{cnpjError}</p>
                    ) : (
                        <p className="text-[10px] text-slate-500 mt-1">
                            {formData.hasCnpj ? 'Ideal para empresas formalizadas.' : 'Use seu CPF caso não seja empresa formal (MEI/etc).'}
                        </p>
                    )}
                </div>
            </div>

            <div className="border-t border-slate-800 pt-6">
                <label className="block text-sm font-bold text-slate-300 mb-3">Qual é o seu tipo de negócio?</label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => onBusinessSelection('barbershop')}
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
                        onClick={() => onBusinessSelection('beauty_salon')}
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
function Step5({ formData, services, products, loading, onSubmit, onBack, onOpenDoc }: any) {
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const handleLinkClick = (e: React.MouseEvent, type: 'terms' | 'privacy' | 'contract') => {
        e.preventDefault();
        onOpenDoc(type);
    };

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

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-left">
                <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                        <input
                            type="checkbox"
                            className="peer h-5 w-5 appearance-none rounded border border-slate-600 bg-slate-800 checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                        />
                        <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white" viewBox="0 0 14 14" fill="none">
                            <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                        Li e aceito os <button onClick={(e) => handleLinkClick(e, 'terms')} className="text-blue-400 hover:underline">Termos de Uso</button>, <button onClick={(e) => handleLinkClick(e, 'privacy')} className="text-blue-400 hover:underline">Política de Privacidade</button> e o <button onClick={(e) => handleLinkClick(e, 'contract')} className="text-blue-400 hover:underline">Contrato de Assinatura</button>.
                    </span>
                </label>
            </div>

            <div className="flex justify-between pt-4">
                <Button onClick={onBack} variant="ghost" className="text-slate-400 hover:text-slate-300" disabled={loading}>
                    <ArrowLeft className="mr-2" size={16} /> Voltar
                </Button>
                <Button
                    onClick={() => {
                        if (acceptedTerms) {
                            onSubmit();
                        } else {
                            alert('Você precisa aceitar os termos para continuar.');
                        }
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8"
                    disabled={loading}
                >
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

function TermsContent() {
    return (
        <div className="text-slate-300 space-y-6 leading-relaxed text-sm text-justify pr-2">
            <section className="space-y-2">
                <p><strong>1. ACEITAÇÃO DOS TERMOS</strong></p>
                <p>Ao utilizar o sistema <strong>791 Barber</strong>, de titularidade da <strong>791 SOLUÇÕES EMPRESARIAIS LTDA</strong>, inscrita no CNPJ sob o nº <strong>61.887.941/0001-83</strong>, o usuário declara ter lido, compreendido e aceitado integralmente as condições deste documento.</p>
                <p>O uso do sistema implica adesão automática a estes Termos de Uso e à Política de Privacidade correspondente.</p>
            </section>

            <section className="space-y-2">
                <p><strong>2. USO DO SISTEMA</strong></p>
                <p>O 791 Barber destina-se exclusivamente ao gerenciamento de barbearias e salões de beleza, incluindo funcionalidades de agendamento, controle financeiro, cadastro de clientes e relatórios.</p>
                <p>O usuário é responsável por manter a confidencialidade de suas credenciais de acesso. O compartilhamento de credenciais é expressamente proibido.</p>
            </section>

            <section className="space-y-2">
                <p><strong>3. PLANOS E PAGAMENTOS</strong></p>
                <p>O acesso ao sistema é concedido mediante assinatura nos planos disponibilizados. O pagamento é processado por meio das plataformas integradas ao sistema.</p>
                <p>A ausência de pagamento ou atraso poderá resultar na suspensão automática do acesso até a regularização.</p>
            </section>

            <section className="space-y-2">
                <p><strong>4. RESPONSABILIDADES</strong></p>
                <p>O usuário é integralmente responsável pelas informações inseridas no sistema. A 791 Soluções não se responsabiliza por dados inseridos incorretamente ou danos indiretos decorrentes do uso inadequado.</p>
            </section>

            <section className="space-y-2">
                <p><strong>6. CANCELAMENTO</strong></p>
                <p>O usuário pode solicitar o cancelamento da assinatura a qualquer momento pelo painel ou suporte. O cancelamento não gera direito a reembolso de períodos já pagos.</p>
            </section>

            <section className="space-y-2">
                <p><strong>7. PRIVACIDADE E DADOS (LGPD)</strong></p>
                <p>A coleta e armazenamento de dados seguem a Lei Geral de Proteção de Dados (LGPD). As informações são usadas para fins operacionais e melhoria do sistema.</p>
            </section>

            <p className="pt-6 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Última atualização: 18 de janeiro de 2026.</p>
        </div>
    );
}

function PrivacyContent() {
    return (
        <div className="text-slate-300 space-y-6 leading-relaxed text-sm text-justify pr-2">
            <section className="space-y-2">
                <p><strong>1. DISPOSIÇÕES GERAIS</strong></p>
                <p>Esta Política descreve como a <strong>791 SOLUÇÕES EMPRESARIAIS LTDA</strong> coleta e protege os dados pessoais dos usuários, em conformidade com a LGPD (Lei nº 13.709/2018).</p>
            </section>

            <section className="space-y-2">
                <p><strong>2. DADOS COLETADOS</strong></p>
                <p>Coletamos dados do estabelecimento, usuários do sistema e clientes (nome, e-mail, telefone, histórico de agendamentos) para fins operacionais e de segurança.</p>
            </section>

            <section className="space-y-2">
                <p><strong>3. FINALIDADES</strong></p>
                <p>Os dados permitem o funcionamento do 791 Barber, execução de contratos, envio de comunicações operacionais e cumprimento de obrigações legais.</p>
            </section>

            <section className="space-y-2">
                <p><strong>5. COMPARTILHAMENTO</strong></p>
                <p>Os dados podem ser compartilhados com provedores de tecnologia estritamente para operação do sistema. Não vendemos dados pessoais a terceiros.</p>
            </section>

            <section className="space-y-2">
                <p><strong>8. DIREITOS DOS TITULARES</strong></p>
                <p>O titular pode confirmar a existência de tratamento, corrigir dados, solicitar anonimização ou exclusão, conforme garantido pela LGPD.</p>
            </section>

            <p className="pt-6 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Última atualização: 18 de janeiro de 2026.</p>
        </div>
    );
}

function ContractContent() {
    return (
        <div className="text-slate-300 space-y-6 leading-relaxed text-sm text-justify pr-2">
            <div className="text-center space-y-1 mb-6">
                <h2 className="text-base font-black text-slate-100 uppercase">CONTRATO DE LICENÇA DE USO DE SOFTWARE (SaaS)</h2>
            </div>

            <section className="space-y-2 text-xs">
                <p><strong>CONTRATADA:</strong> 791 SOLUÇÕES EMPRESARIAIS LTDA, CNPJ nº 61.887.941/0001-83.</p>
                <p><strong>CONTRATANTE:</strong> Identificada no ato de cadastro (o "CLIENTE").</p>
            </section>

            <section className="space-y-2">
                <p><strong>1. OBJETO</strong></p>
                <p>Licença de uso não exclusiva e revogável do software 791 Barber para gerenciamento operacional de barbearias e salões na modalidade SaaS.</p>
            </section>

            <section className="space-y-2">
                <p><strong>2. PLANOS E ADD-ONS</strong></p>
                <p>A escolha do plano determine as funcionalidades e limites. O CLIENTE poderá contratar módulos extras (Add-ons) que serão somados ao valor da fatura atual.</p>
            </section>

            <section className="space-y-2">
                <p><strong>3. VIGÊNCIA E RENOVAÇÃO</strong></p>
                <p>Renovação automática ao final de cada ciclo, salvo cancelamento prévio de 5 dias úteis. A CONTRATADA pode reajustar valores mediante aviso de 30 dias.</p>
            </section>

            <section className="space-y-2">
                <p><strong>4. PAGAMENTO</strong></p>
                <p>O faturamento ocorre automaticamente. A suspensão do acesso ocorre após 10 dias úteis de atraso.</p>
            </section>

            <section className="space-y-2">
                <p><strong>10. SLA E SUPORTE</strong></p>
                <p>Disponibilidade de 99,5%. Suporte via e-mail e WhatsApp em horário comercial.</p>
            </section>

            <div className="pt-8 border-t border-slate-800 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Aceito eletronicamente via onboarding 791 Barber.
                </p>
            </div>
        </div>
    );
}
