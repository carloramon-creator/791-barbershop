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
        // Endereço
        cep: '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        businessType: 'barbershop' as BusinessType,
        serviceMethod: 'queue' as ServiceMethod,
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
                setError('Erro ao verificar email. Tente novamente.');
                return false;
            } finally {
                setCheckingEmail(false);
            }
        }

        if (step === 2) {
            // Agora valida também endereço
            if (!formData.barbershopName || !formData.phone || !formData.cnpj) {
                setError('Preencha os dados da barbearia');
                return false;
            }
            if (!formData.cep || !formData.street || !formData.number || !formData.neighborhood || !formData.city || !formData.state) {
                setError('Preencha o endereço completo');
                return false;
            }

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
            // Enforce production-ready redirect
            const origin = window.location.origin;
            const redirectUrl = `${origin}/auth/callback`;
            console.log('[Signup] Redirect URL:', redirectUrl);

            // 1. Create Account via API (Passando endereço agora)
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    services,
                    products,
                    module_queue_enabled: formData.serviceMethod === 'queue',
                    module_appointments_enabled: formData.serviceMethod === 'appointments',
                    emailRedirectTo: redirectUrl
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
                console.error("Auto-login failed:", loginError);
                router.push('/login?signup_success=true');
                return;
            }

            // 3. Redirect
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
                    <WizardProgress currentStep={step} totalSteps={6} title={getStepTitle(step)} />

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <Step1 formData={formData} setFormData={setFormData} onNext={handleNext} checkingEmail={checkingEmail} />
                    )}

                    {step === 2 && (
                        <Step2 formData={formData} setFormData={setFormData} onNext={handleNext} onBack={handleBack} />
                    )}

                    {step === 3 && (
                        <Step3 formData={formData} setFormData={setFormData} onNext={handleNext} onBack={handleBack} onBusinessSelection={handleBusinessSelection} />
                    )}

                    {step === 4 && (
                        <Step4 services={services} setServices={setServices} onNext={handleNext} onBack={handleBack} onSkip={handleSkipServices} />
                    )}

                    {step === 5 && (
                        <Step5 products={products} setProducts={setProducts} onNext={handleNext} onBack={handleBack} onSkip={handleSkipProducts} />
                    )}

                    {step === 6 && (
                        <Step6 formData={formData} services={services} products={products} loading={loading} onSubmit={handleSubmit} onBack={handleBack} onOpenDoc={setOpenDoc} />
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
        'Sobre a Barbearia & Local',
        'Tipo de Negócio',
        'Seus Serviços',
        'Seus Produtos',
        'Tudo pronto!',
    ];
    return titles[step] || '';
}

// STEP 1: Create Account
function Step1({ formData, setFormData, onNext, checkingEmail }: any) {
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="joao@email.com"
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
                        <><Loader2 className="mr-2 animate-spin" size={16} /> Verificando...</>
                    ) : (
                        <>Continuar <ArrowRight className="ml-2" size={16} /></>
                    )}
                </Button>
            </div>
        </div>
    );
}

// STEP 2: Barbershop Info & ADDRESS
function Step2({ formData, setFormData, onNext, onBack }: any) {
    const [cnpjError, setCnpjError] = React.useState('');

    const handleCnpjBlur = () => {
        if (!formData.cnpj) {
            setCnpjError('');
            return;
        }
        const isValid = formData.hasCnpj ? isValidCNPJ(formData.cnpj) : isValidCPF(formData.cnpj);
        setCnpjError(isValid ? '' : (formData.hasCnpj ? 'CNPJ inválido' : 'CPF inválido'));
    };

    const handleCepBlur = async () => {
        const cleanCep = formData.cep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setFormData({
                        ...formData,
                        street: data.logradouro,
                        neighborhood: data.bairro,
                        city: data.localidade,
                        state: data.uf
                    });
                }
            } catch (e) {
                console.error('Erro ao buscar CEP:', e);
            }
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Empresa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Nome da barbearia</label>
                    <input
                        type="text"
                        value={formData.barbershopName}
                        onChange={(e) => setFormData({ ...formData, barbershopName: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Ex: 791 Barber Club"
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
                        <label className="block text-sm font-bold text-slate-300">{formData.hasCnpj ? 'CNPJ da Empresa' : 'CPF do Proprietário'}</label>
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
                        className={cn("w-full bg-slate-800 border rounded-lg px-4 py-3 text-slate-100 focus:outline-none transition-colors", cnpjError ? "border-red-500" : "border-slate-700 focus:border-blue-500")}
                        placeholder={formData.hasCnpj ? "00.000.000/0000-00" : "000.000.000-00"}
                    />
                    {cnpjError && <p className="text-[10px] text-red-500 mt-1 font-bold">{cnpjError}</p>}
                </div>
            </div>

            <div className="border-t border-slate-800 my-4"></div>

            {/* Endereço */}
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">CEP</label>
                    <input
                        value={formData.cep}
                        onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                        onBlur={handleCepBlur}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="00000-000"
                    />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-300 mb-2">Bairro</label>
                    <input
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                    <label className="block text-sm font-bold text-slate-300 mb-2">Rua/Logradouro</label>
                    <input
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Nº</label>
                    <input
                        value={formData.number}
                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                    <label className="block text-sm font-bold text-slate-300 mb-2">Cidade</label>
                    <input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">UF</label>
                    <input
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                        maxLength={2}
                    />
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

// STEP 3: Business Type
function Step3({ formData, setFormData, onNext, onBack, onBusinessSelection }: any) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-6">
                <label className="block text-sm font-bold text-slate-300 mb-3">Qual é o seu tipo de negócio?</label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => onBusinessSelection('barbershop')}
                        className={cn(
                            "p-4 rounded-xl border-2 transition-all text-left",
                            formData.businessType === 'barbershop' ? "border-blue-500 bg-blue-500/10" : "border-slate-700 hover:border-slate-600 bg-slate-800"
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
                            formData.businessType === 'beauty_salon' ? "border-pink-500 bg-pink-500/10" : "border-slate-700 hover:border-slate-600 bg-slate-800"
                        )}
                    >
                        <Sparkles className={cn("mb-3", formData.businessType === 'beauty_salon' ? "text-pink-400" : "text-slate-400")} size={24} />
                        <h3 className="font-bold text-slate-100 mb-1">Salão de Beleza</h3>
                        <p className="text-xs text-slate-400">Foco feminino</p>
                    </button>
                </div>
            </div>

            <div className="space-y-6 border-t border-slate-800 pt-6">
                <label className="block text-sm font-bold text-slate-300 mb-3">Como você atende?</label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, serviceMethod: 'queue' })}
                        className={cn(
                            "p-4 rounded-xl border-2 transition-all text-left",
                            formData.serviceMethod === 'queue' ? "border-green-500 bg-green-500/10" : "border-slate-700 hover:border-slate-600 bg-slate-800"
                        )}
                    >
                        <Users className={cn("mb-3", formData.serviceMethod === 'queue' ? "text-green-400" : "text-slate-400")} size={24} />
                        <h3 className="font-bold text-slate-100 mb-1">Por Ordem de Chegada</h3>
                        <p className="text-xs text-slate-400">Fila digital.</p>
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, serviceMethod: 'appointments' })}
                        className={cn(
                            "p-4 rounded-xl border-2 transition-all text-left",
                            formData.serviceMethod === 'appointments' ? "border-purple-500 bg-purple-500/10" : "border-slate-700 hover:border-slate-600 bg-slate-800"
                        )}
                    >
                        <Calendar className={cn("mb-3", formData.serviceMethod === 'appointments' ? "text-purple-400" : "text-slate-400")} size={24} />
                        <h3 className="font-bold text-slate-100 mb-1">Com Hora Marcada</h3>
                        <p className="text-xs text-slate-400">Agenda.</p>
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

// STEP 4: Services
function Step4({ services, setServices, onNext, onBack, onSkip }: any) {
    const addService = () => {
        setServices([...services, { name: '', price: 0, duration_minutes: 0 }]);
    };
    const removeService = (index: number) => {
        setServices(services.filter((_: any, i: number) => i !== index));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">💡 Pré-preenchemos com valores de mercado. Edite à vontade!</p>
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
                    <Button onClick={onBack} variant="ghost" className="text-slate-400 hover:text-slate-300"><ArrowLeft className="mr-2" size={16} /> Voltar</Button>
                </div>
                <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8">Continuar <ArrowRight className="ml-2" size={16} /></Button>
            </div>
        </div>
    );
}

// STEP 5: Products
function Step5({ products, setProducts, onNext, onBack, onSkip }: any) {
    const addProduct = () => {
        setProducts([...products, { name: '', price: 0, category: 'Bebidas' }]);
    };
    const removeProduct = (index: number) => {
        setProducts(products.filter((_: any, i: number) => i !== index));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">💡 Produtos comuns para venda.</p>
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
                    <Button onClick={onBack} variant="ghost" className="text-slate-400 hover:text-slate-300"><ArrowLeft className="mr-2" size={16} /> Voltar</Button>
                </div>
                <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8">Continuar <ArrowRight className="ml-2" size={16} /></Button>
            </div>
        </div>
    );
}

// STEP 6: Complete
function Step6({ formData, services, products, loading, onSubmit, onBack, onOpenDoc }: any) {
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const handleLinkClick = (e: React.MouseEvent, type: 'terms' | 'privacy' | 'contract') => {
        e.preventDefault();
        onOpenDoc(type);
    };

    return (
        <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="text-6xl mb-4">🎉</div>
            <div>
                <h3 className="text-2xl font-black text-slate-100 mb-2">Parabéns, {formData.name.split(' ')[0]}!</h3>
                <p className="text-slate-400">Sua barbearia está configurada e pronta para usar.</p>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 space-y-3 text-left border border-slate-700">
                <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-400">✅</span>
                    <span className="text-slate-300">Conta e Perfil completos</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-400">✅</span>
                    <span className="text-slate-300">Endereço: {formData.city}/{formData.state}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-400">✅</span>
                    <span className="text-slate-300">Segmento: {formData.businessType === 'barbershop' ? 'Barbearia' : 'Salão de Beleza'}</span>
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
                <Button onClick={onBack} variant="ghost" className="text-slate-400 hover:text-slate-300" disabled={loading}><ArrowLeft className="mr-2" size={16} /> Voltar</Button>
                <Button
                    onClick={() => acceptedTerms ? onSubmit() : alert('Você precisa aceitar os termos para continuar.')}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8"
                    disabled={loading}
                >
                    {loading ? <><Loader2 className="mr-2 animate-spin" size={16} /> Entrando...</> : <>Ir para o Dashboard <ArrowRight className="ml-2" size={16} /></>}
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
                <p>Ao utilizar o sistema <strong>791 Barber</strong>, de titularidade da <strong>791 SOLUÇÕES EMPRESARIAIS LTDA</strong>, inscrita no CNPJ sob o nº <strong>61.887.941/0001-83</strong>, com sede em São José/SC, o usuário declara ter lido, compreendido e aceitado integralmente as condições deste documento.</p>
                <p>O uso do sistema implica adesão automática a estes Termos de Uso e à Política de Privacidade correspondente. O serviço é fornecido "no estado em que se encontra" (as is), podendo sofrer alterações, suspensões ou encerramento sem aviso prévio.</p>
            </section>

            <section className="space-y-2">
                <p><strong>2. USO DO SISTEMA</strong></p>
                <p>O 791 Barber destina-se exclusivamente ao gerenciamento de barbearias e salões de beleza, incluindo funcionalidades de agendamento, controle financeiro, cadastro de clientes e relatórios.</p>
                <p>O usuário é responsável por manter a confidencialidade de suas credenciais de acesso (login e senha), bem como por todas as atividades realizadas sob sua conta. O compartilhamento de credenciais é expressamente proibido.</p>
                <p>É vedado o uso do sistema para fins ilícitos, abusivos, fraudulentos ou que violem direitos de terceiros, sob pena de suspensão ou exclusão da conta.</p>
            </section>

            <section className="space-y-2">
                <p><strong>3. PLANOS E PAGAMENTOS</strong></p>
                <p>O acesso ao sistema é concedido mediante assinatura nos planos disponibilizados (mensal, semestral ou anual).</p>
                <p>O pagamento é processado por meio das plataformas integradas ao sistema (como Stripe, Pix ou outros métodos disponíveis).</p>
                <p>A ausência de pagamento ou atraso poderá resultar na suspensão automática do acesso até a regularização.</p>
                <p>Valores pagos não são reembolsáveis, exceto em casos previstos em lei ou falhas comprovadas da plataforma.</p>
                <p>Alterações de preço ou de planos poderão ocorrer, com comunicação prévia ao usuário por e-mail ou dentro da plataforma.</p>
            </section>

            <section className="space-y-2">
                <p><strong>4. RESPONSABILIDADES DO USUÁRIO E DA 791 SOLUÇÕES</strong></p>
                <p>O usuário é integralmente responsável pelas informações inseridas no sistema, incluindo dados de clientes, produtos e registros financeiros.</p>
                <p>A 791 Soluções Empresariais LTDA não se responsabiliza por:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Dados inseridos incorretamente pelo usuário;</li>
                    <li>Interrupções, falhas ou instabilidades decorrentes de problemas na conexão de internet do cliente;</li>
                    <li>Danos indiretos, lucros cessantes ou perda de informações decorrentes do uso indevido da plataforma.</li>
                </ul>
                <p>Embora adote medidas de segurança e backup, a empresa não garante disponibilidade contínua do serviço nem isenção total de erros.</p>
            </section>

            <section className="space-y-2">
                <p><strong>5. SUPORTE E ATENDIMENTO</strong></p>
                <p>O suporte técnico é oferecido nos canais oficiais da 791 Barber, nos horários e prazos informados na plataforma. Dúvidas relacionadas ao uso, cobrança ou funcionalidades devem ser encaminhadas pelos meios indicados.</p>
            </section>

            <section className="space-y-2">
                <p><strong>6. CANCELAMENTO E EXCLUSÃO DE CONTA</strong></p>
                <p>O usuário pode solicitar o cancelamento da assinatura a qualquer momento, diretamente pelo painel ou via suporte. O cancelamento não gera direito a reembolso de períodos já pagos e não utilizados.</p>
                <p>Em caso de inatividade prolongada ou violação destes termos, a 791 Soluções poderá, a seu critério, suspender ou excluir o acesso do usuário, preservando os dados conforme a legislação vigente.</p>
            </section>

            <section className="space-y-2">
                <p><strong>7. PRIVACIDADE E PROTEÇÃO DE DADOS</strong></p>
                <p>A coleta, armazenamento e tratamento de dados pessoais seguem a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018). As informações são utilizadas exclusivamente para fins operacionais e de melhoria do sistema, conforme descrito na Política de Privacidade.</p>
                <p>O usuário poderá solicitar, a qualquer momento, a exclusão definitiva de seus dados, sujeito aos prazos e limitações legais.</p>
            </section>

            <section className="space-y-2">
                <p><strong>8. ALTERAÇÕES DESTES TERMOS</strong></p>
                <p>A 791 Soluções poderá alterar estes Termos a qualquer momento. As versões atualizadas estarão sempre disponíveis no site oficial e passam a valer a partir da data de publicação. O uso contínuo do sistema após a atualização implica aceitação automática das novas condições.</p>
            </section>

            <section className="space-y-2">
                <p><strong>9. FORO E LEGISLAÇÃO APLICÁVEL</strong></p>
                <p>Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de Florianópolis – SC como competente para resolver quaisquer disputas oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
            </section>

            <p className="pt-6 text-xs text-slate-500 font-bold">Última atualização: 18 de janeiro de 2026.</p>
        </div>
    );
}

function PrivacyContent() {
    return (
        <div className="text-slate-300 space-y-6 leading-relaxed text-sm text-justify pr-2">
            <section className="space-y-2">
                <p><strong>1. DISPOSIÇÕES GERAIS</strong></p>
                <p>Esta Política de Privacidade descreve como a <strong>791 SOLUÇÕES EMPRESARIAIS LTDA</strong>, inscrita no CNPJ sob o nº <strong>61.887.941/0001-83</strong>, sediada em São José/SC (“791 Soluções”, “nós”), coleta, utiliza, armazena e protege os dados pessoais dos usuários do sistema 791 Barber e dos clientes cadastrados pelos estabelecimentos (barbearias e salões).</p>
                <p>O tratamento de dados pessoais é realizado em conformidade com a Lei nº 13.709/2018 – Lei Geral de Proteção de Dados Pessoais (LGPD) e demais normas aplicáveis.</p>
            </section>

            <section className="space-y-2">
                <p><strong>2. DADOS COLETADOS</strong></p>
                <p>Poderão ser coletados:</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Dados do estabelecimento e responsáveis:</strong> nome, razão social, CNPJ, CPF, e-mail, telefone, endereço, dados de cobrança e faturamento.</li>
                    <li><strong>Dados de usuários do sistema:</strong> nome, e-mail, telefone, função no estabelecimento e dados de acesso (login).</li>
                    <li><strong>Dados dos clientes do estabelecimento:</strong> nome, telefone, e-mail, histórico de agendamentos e serviços realizados.</li>
                    <li><strong>Dados de uso:</strong> endereço IP, data e hora de acesso, tipo de dispositivo, navegador e interações com o sistema, para fins de segurança e melhoria da plataforma.</li>
                </ul>
            </section>

            <section className="space-y-2">
                <p><strong>3. FINALIDADES DO TRATAMENTO</strong></p>
                <p>Os dados são utilizados para:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Permitir o funcionamento do 791 Barber (cadastro, login, agendamentos, controle financeiro, relatórios).</li>
                    <li>Executar o contrato de prestação de serviços firmado com o estabelecimento assinante.</li>
                    <li>Enviar comunicações operacionais, avisos sobre o serviço, cobranças, notas fiscais e informações de suporte.</li>
                    <li>Cumprir obrigações legais e regulatórias, inclusive fiscais e de guarda de registros de acesso.</li>
                    <li>Melhorar a experiência de uso, prevenir fraudes e garantir a segurança da aplicação e dos dados.</li>
                </ul>
            </section>

            <section className="space-y-2">
                <p><strong>4. BASES LEGAIS UTILIZADAS</strong></p>
                <p>O tratamento de dados pessoais se fundamenta principalmente em:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Execução de contrato ou de procedimentos preliminares relacionados a contrato do qual o titular seja parte.</li>
                    <li>Cumprimento de obrigação legal ou regulatória, quando aplicável (por exemplo, obrigações fiscais e de registros de acesso).</li>
                    <li>Legítimo interesse, para atividades de segurança, prevenção a fraudes, melhoria de serviços e comunicação com clientes, respeitados os direitos dos titulares.</li>
                    <li>Consentimento, quando exigido pela LGPD, especialmente para comunicações de marketing direto, podendo ser revogado a qualquer momento pelo titular.</li>
                </ul>
            </section>

            <section className="space-y-2">
                <p><strong>5. COMPARTILHAMENTO DE DADOS</strong></p>
                <p>Os dados poderão ser compartilhados:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Com provedores de serviços de tecnologia (hospedagem, e-mail, gateways de pagamento, ferramentas de análise), estritamente na medida necessária para operação do sistema.</li>
                    <li>Com autoridades públicas, quando houver obrigação legal, ordem judicial ou requisição de autoridade competente.</li>
                    <li>Em casos de operações societárias (fusão, aquisição ou incorporação), condicionadas à continuidade das garantias desta Política.</li>
                </ul>
                <p>Não há venda de dados pessoais a terceiros para fins comerciais alheios ao serviço prestado.</p>
            </section>

            <section className="space-y-2">
                <p><strong>6. ARMAZENAMENTO E SEGURANÇA DOS DADOS</strong></p>
                <p>Os dados são armazenados em ambientes controlados e de acesso restrito, com uso de medidas técnicas e organizacionais de segurança razoáveis para proteger contra acessos não autorizados, perda, alteração ou destruição.</p>
                <p>Apesar dos esforços de segurança, nenhum sistema é totalmente imune a incidentes, motivo pelo qual não é possível garantir segurança absoluta das informações.</p>
            </section>

            <section className="space-y-2">
                <p><strong>7. PRAZO DE CONSERVAÇÃO</strong></p>
                <p>Os dados são mantidos pelo tempo necessário para:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Cumprir as finalidades indicadas nesta Política e no contrato de prestação de serviços.</li>
                    <li>Atender exigências legais, regulatórias e de defesa em processos judiciais, administrativos ou arbitrais.</li>
                </ul>
                <p>Após o término das finalidades, os dados poderão ser eliminados ou anonimizados, salvo nas hipóteses legais de guarda obrigatória.</p>
            </section>

            <section className="space-y-2">
                <p><strong>8. DIREITOS DOS TITULARES</strong></p>
                <p>O titular de dados pessoais poderá, mediante requisição:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Confirmar a existência de tratamento e obter acesso aos seus dados.</li>
                    <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
                    <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD.</li>
                    <li>Solicitar a portabilidade dos dados a outro fornecedor de serviço ou produto, respeitadas as normas da autoridade nacional.</li>
                    <li>Revogar o consentimento, quando o tratamento se basear nesta hipótese, observados os efeitos dessa revogação.</li>
                </ul>
            </section>

            <section className="space-y-2">
                <p><strong>9. RESPONSABILIDADES DO ESTABELECIMENTO (CONTROLADOR)</strong></p>
                <p>Em relação aos dados dos clientes cadastrados na plataforma (por exemplo, clientes da barbearia), o estabelecimento é, em regra, o controlador e a 791 Soluções atua como operadora em diversas operações de tratamento.</p>
                <p>Cabe ao estabelecimento garantir que possui base legal adequada para cadastrar dados de seus clientes no sistema e para utilizar tais dados para agendamentos, comunicações e registros.</p>
            </section>

            <section className="space-y-2">
                <p><strong>10. COOKIES E TECNOLOGIAS DE RASTREAMENTO</strong></p>
                <p>O sistema poderá utilizar cookies e tecnologias similares para: lembrar preferências, manter a sessão ativa, gerar estatísticas de uso e melhorar a experiência do usuário.</p>
                <p>O usuário poderá ajustar as configurações de cookies no navegador, ciente de que algumas funcionalidades podem ser afetadas caso determinados cookies sejam desativados.</p>
            </section>

            <section className="space-y-2">
                <p><strong>11. ATUALIZAÇÕES DESTA POLÍTICA</strong></p>
                <p>Esta Política de Privacidade poderá ser alterada periodicamente para refletir ajustes legais, regulatórios ou melhorias nos processos de tratamento de dados.</p>
                <p>A versão atualizada estará sempre disponível no site ou no painel do 791 Barber, indicando a data de última atualização, e o uso continuado do serviço após as alterações implica ciência das novas condições.</p>
            </section>

            <section className="space-y-2">
                <p><strong>12. ENCARREGADO (DPO) E CONTATO</strong></p>
                <p>A 791 Soluções indicará um Encarregado pelo Tratamento de Dados Pessoais (DPO), responsável por receber reclamações e comunicações dos titulares e da Autoridade Nacional de Proteção de Dados (ANPD), além de orientar internamente sobre proteção de dados.</p>
                <p>Para exercer seus direitos ou esclarecer dúvidas sobre esta Política, o titular poderá entrar em contato pelo e-mail: <strong>contato@791solucoes.com.br</strong>.</p>
            </section>

            <p className="pt-6 text-xs text-slate-500 font-bold">Última atualização: 18 de janeiro de 2026.</p>
        </div>
    );
}

function ContractContent() {
    return (
        <div className="text-slate-300 space-y-6 leading-relaxed text-sm text-justify pr-2">
            <div className="text-center space-y-1 mb-8">
                <h2 className="text-lg font-black text-slate-100 uppercase tracking-tighter">CONTRATO DE LICENÇA DE USO DE SOFTWARE (SaaS)</h2>
                <p className="text-blue-500 font-bold">791 BARBER</p>
            </div>

            <section className="space-y-4">
                <p>
                    <strong>CONTRATADA:</strong> 791 SOLUÇÕES EMPRESARIAIS LTDA, inscrita no CNPJ nº 61.887.941/0001-83, com sede em São José/SC, neste ato representada na forma de seu contrato social, doravante denominada CONTRATADA.
                </p>
                <p>
                    <strong>CONTRATANTE:</strong> A Pessoa Jurídica ou Física identificada no ato de cadastro no sistema 791 Barber, neste ato denominada "CLIENTE".
                </p>
            </section>

            <section className="space-y-4">
                <p className="font-bold text-slate-100 uppercase text-xs tracking-widest">CONSIDERANDOS:</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Considerando que a CONTRATADA é desenvolvedora do software 791 Barber, voltado para gestão e agendamento de barbearias e salões de beleza;</li>
                    <li>Considerando que o CLIENTE deseja contratar a licença de uso deste software na modalidade de Software as a Service (SaaS);</li>
                </ul>
                <p>As partes acordam nos seguintes termos e condições:</p>
            </section>

            <section className="space-y-3">
                <p><strong>1. DO OBJETO</strong></p>
                <p>1.1. A CONTRATADA concede ao CLIENTE uma licença de uso não exclusiva, não transmissível e revogável do software 791 Barber, disponibilizado na modalidade SaaS (Software as a Service), para utilização em plataforma web e/ou aplicativo mobile, destinado exclusivamente ao gerenciamento operacional de barbearias e salões de beleza.</p>
                <p>1.2. A licença autoriza o uso do software conforme as funcionalidades e limites definidos no plano escolhido pelo CLIENTE, não conferindo direito de propriedade, cessão, aluguel, venda ou transferência a terceiros.</p>
            </section>

            <section className="space-y-3">
                <p><strong>2. DOS PLANOS E PREÇOS</strong></p>
                <p>2.1. O acesso ao 791 Barber é oferecido mediante assinatura aos planos vigentes, com valores e funcionalidades detalhados no momento do cadastro.</p>
                <p>2.2. Os valores poderão ser cobrados em ciclos mensais, semestrais ou anuais, conforme escolha do CLIENTE no cadastro.</p>
                <p>2.3. O CLIENTE terá direito a uma avaliação gratuita (período trial) conforme indicado na plataforma, findo o qual a cobrança será automaticamente ativada, exceto se o cancelamento for solicitado antes do término do período.</p>

                <p><strong>2.4. DOS MÓDULOS ADICIONAIS (ADD-ONS)</strong></p>
                <p>O CLIENTE poderá, a qualquer momento, contratar módulos extras ("Add-ons") para turbinar as funcionalidades de seu plano.</p>
                <p className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-blue-400 font-bold">
                    Importante: Após a contratação de qualquer módulo extra, o valor do respectivo add-on será somado ao valor do plano atual, passando o valor total da fatura a ser a soma de todos os serviços contratados.
                </p>
            </section>

            <section className="space-y-3">
                <p><strong>3. DA VIGÊNCIA E RENOVAÇÃO</strong></p>
                <p>3.1. Este Contrato entra em vigor na data de aceite digital dos Termos de Uso e Política de Privacidade do 791 Barber e permanece válido enquanto a assinatura estiver ativa.</p>
                <p>3.2. Após o término do primeiro ciclo de cobrança (mensal, semestral ou anual), o Contrato será automaticamente renovado pelos mesmos termos, salvo cancelamento solicitado pelo CLIENTE com antecedência mínima de 5 (cinco) dias úteis antes do vencimento.</p>
                <p>3.3. A CONTRATADA poderá modificar os preços ou planos com notificação de 30 (trinta) dias via e-mail ou avisos na plataforma, tendo o CLIENTE direito a cancelar sem penalidades caso discorde da alteração.</p>
            </section>

            <section className="space-y-3">
                <p><strong>4. DAS CONDIÇÕES DE PAGAMENTO</strong></p>
                <p>4.1. Os pagamentos serão processados através de gateways de pagamento integrados ao sistema (Stripe, Pix, transferência bancária ou outros métodos disponibilizados).</p>
                <p>4.2. O faturamento ocorrerá automaticamente na data de cobrança ou será enviada notificação com boleto/link de pagamento.</p>
                <p>4.3. O não pagamento dentro de 10 (dez) dias úteis do vencimento implicará suspensão automática do acesso até a regularização, sem prejuízo de cobranças de juros e multa conforme legislação aplicável.</p>
                <p>4.4. Não há reembolso por períodos já pagos, exceto nos casos previstos neste Contrato ou em lei.</p>
            </section>

            <section className="space-y-3">
                <p><strong>5. DO SUPORTE TÉCNICO</strong></p>
                <p>5.1. A CONTRATADA oferece suporte técnico através dos seguintes canais:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>E-mail:</strong> contato@791solucoes.com.br</li>
                    <li><strong>WhatsApp:</strong> (48) 99180-3379</li>
                </ul>
                <p>5.2. O suporte é fornecido em horário comercial (segunda a sexta-feira, das 09h às 18h, horário de Brasília), exceto feriados nacionais e estaduais.</p>
                <p>5.3. O tempo de resposta estimado é de até 24 (vinte e quatro) horas úteis para suporte técnico básico.</p>
            </section>

            <section className="space-y-3">
                <p><strong>10. DO NÍVEL DE SERVIÇO (SLA)</strong></p>
                <p>10.1. A CONTRATADA se compromete a manter uma disponibilidade de 99,5% (noventa e nove vírgula cinco por cento) do serviço, medida mensalmente, excluindo manutenções programadas e força maior.</p>
            </section>

            <section className="space-y-3">
                <p><strong>12. DO CANCELAMENTO</strong></p>
                <p>12.1. O CLIENTE poderá solicitar o cancelamento da assinatura a qualquer momento. O cancelamento entra em vigor no final do ciclo de cobrança atual. Dados do CLIENTE serão mantidos por 30 (trinta) dias após cancelamento para fins de exportação.</p>
            </section>

            <section className="space-y-3">
                <p><strong>15. DADOS E CONFORMIDADE COM LGPD</strong></p>
                <p>15.1. Os dados pessoais são tratados conforme a LGPD. Para exercer direitos ou dúvidas, contate o Encarregado (DPO) em: <strong>contato@791solucoes.com.br</strong>.</p>
            </section>

            <section className="space-y-3">
                <p><strong>17. DA LEGISLAÇÃO E FORO COMPETENTE</strong></p>
                <p>17.1. Fica eleito o foro da Comarca de Florianópolis – SC para dirimir controvérsias oriundas deste Contrato.</p>
            </section>

            <div className="pt-10 border-t border-slate-800 text-center space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Assinado eletronicamente por aceite do CLIENTE no ato de cadastro/assinatura no 791 Barber.
                </p>
                <p className="text-blue-500 font-black text-xs">
                    Última atualização: 18 de janeiro de 2026
                </p>
            </div>
        </div>
    );
}
