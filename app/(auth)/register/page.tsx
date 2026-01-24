'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Scissors, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Etapa 1: Acesso
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Etapa 2: Identidade da Barbearia
    const [shopName, setShopName] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [phone, setPhone] = useState('');

    // Etapa 3: Endereço
    const [cep, setCep] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');

    // Etapa 4: Tipo de Negócio
    const [businessType, setBusinessType] = useState<'barbershop' | 'salon'>('barbershop');

    // Etapa 5: Termos
    const [termsAccepted, setTermsAccepted] = useState(false);

    const router = useRouter();

    const handleCepBlur = async () => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setStreet(data.logradouro);
                    setNeighborhood(data.bairro);
                    setCity(data.localidade);
                    setState(data.uf);
                }
            } catch (e) {
                console.error('Erro ao buscar CEP:', e);
            }
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!termsAccepted) {
            setError('Você precisa aceitar os termos para continuar.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const origin = window.location.origin;
            const redirectUrl = `${origin}/auth/callback`;

            console.log('[Register] FORCE Redirect URL:', redirectUrl);

            // 1. Criar conta no Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: redirectUrl,
                    data: {
                        full_name: name,
                    },
                },
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Erro ao criar usuário');

            // 2. Chamar API do Backend para criar o Tenant
            const response = await fetch(`/api/auth/tenants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: shopName,
                    plan: 'basic',
                    cnpj,
                    phone,
                    cep,
                    street,
                    number,
                    neighborhood,
                    city,
                    state,
                    business_type: businessType // Enviar tipo de negócio
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Erro ao configurar barbearia');

            // 3. Sucesso!
            setStep(6); // Ir para etapa final de sucesso
            setTimeout(() => {
                router.push('/dashboard');
            }, 3000);

        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || 'Erro no cadastro');
            setLoading(false);
        }
    };

    const nextStep = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(prev => prev + 1);
    };

    const prevStep = () => {
        setStep(prev => prev - 1);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4 py-8">
            <div className="w-full max-w-lg">
                <div className="flex justify-center mb-6">
                    <div className="bg-blue-600 p-2.5 rounded-xl">
                        <Scissors className="w-6 h-6 text-white" />
                    </div>
                </div>

                <Card className="border-slate-800 bg-slate-900 shadow-2xl relative overflow-hidden">
                    {step < 6 && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                            <div
                                className="h-full bg-blue-600 transition-all duration-500 ease-out"
                                style={{ width: `${(step / 6) * 100}%` }}
                            />
                        </div>
                    )}

                    <CardHeader className="space-y-1 py-4">
                        <CardTitle className="text-xl text-center font-bold">
                            {step === 6 ? 'Sucesso!' : `Passo ${step} de 6`}
                        </CardTitle>
                        <CardDescription className="text-center text-slate-400 text-xs">
                            {step === 1 && 'Seus dados de acesso'}
                            {step === 2 && 'Dados da Empresa'}
                            {step === 3 && 'Endereço Comercial'}
                            {step === 4 && 'Qual seu segmento?'}
                            {step === 5 && 'Termos & Condições'}
                            {step === 6 && 'Redirecionando...'}
                        </CardDescription>
                    </CardHeader>

                    <form onSubmit={step === 5 ? handleRegister : nextStep}>
                        <CardContent className="space-y-4 py-2 min-h-[280px]">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-2.5 rounded-md text-xs text-center animate-pulse">
                                    {error}
                                </div>
                            )}

                            {step === 1 && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500 uppercase font-bold">Seu Nome</Label>
                                        <Input value={name} onChange={e => setName(e.target.value)} className="bg-slate-800 border-slate-700" required placeholder="Ex: João da Silva" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500 uppercase font-bold">Email Admin</Label>
                                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-slate-800 border-slate-700" required placeholder="admin@suaempresa.com" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500 uppercase font-bold">Senha</Label>
                                        <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="bg-slate-800 border-slate-700" required placeholder="********" />
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500 uppercase font-bold">Nome da Empresa</Label>
                                        <Input value={shopName} onChange={e => setShopName(e.target.value)} className="bg-slate-800 border-slate-700" required placeholder="Ex: 791 Barber" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500 uppercase font-bold">WhatsApp</Label>
                                        <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-slate-800 border-slate-700" required placeholder="(99) 99999-9999" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500 uppercase font-bold">CNPJ/CPF (Opcional)</Label>
                                        <Input value={cnpj} onChange={e => setCnpj(e.target.value)} className="bg-slate-800 border-slate-700" placeholder="00.000.000/0001-00" />
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-500 uppercase font-bold">CEP</Label>
                                            <Input value={cep} onChange={e => setCep(e.target.value)} onBlur={handleCepBlur} className="bg-slate-800 border-slate-700" required placeholder="00000-000" />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-xs text-slate-500 uppercase font-bold">Bairro</Label>
                                            <Input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="bg-slate-800 border-slate-700" required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="col-span-3 space-y-1">
                                            <Label className="text-xs text-slate-500 uppercase font-bold">Rua</Label>
                                            <Input value={street} onChange={e => setStreet(e.target.value)} className="bg-slate-800 border-slate-700" required />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-500 uppercase font-bold">Nº</Label>
                                            <Input value={number} onChange={e => setNumber(e.target.value)} className="bg-slate-800 border-slate-700" required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="col-span-3 space-y-1">
                                            <Label className="text-xs text-slate-500 uppercase font-bold">Cidade</Label>
                                            <Input value={city} onChange={e => setCity(e.target.value)} className="bg-slate-800 border-slate-700" required />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-500 uppercase font-bold">UF</Label>
                                            <Input value={state} onChange={e => setState(e.target.value)} className="bg-slate-800 border-slate-700" required maxLength={2} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 4 && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 pt-4">
                                    <div
                                        onClick={() => setBusinessType('barbershop')}
                                        className={cn(
                                            "cursor-pointer border rounded-xl p-4 flex items-center gap-4 transition-all hover:bg-slate-800",
                                            businessType === 'barbershop' ? "border-blue-500 bg-blue-500/10" : "border-slate-800 bg-slate-900"
                                        )}
                                    >
                                        <div className="bg-blue-500 p-2 rounded-lg">
                                            <Scissors className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-100">Barbearia</h3>
                                            <p className="text-xs text-slate-400">Foco em cortes masculinos, barba e estilo.</p>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setBusinessType('salon')}
                                        className={cn(
                                            "cursor-pointer border rounded-xl p-4 flex items-center gap-4 transition-all hover:bg-slate-800",
                                            businessType === 'salon' ? "border-purple-500 bg-purple-500/10" : "border-slate-800 bg-slate-900"
                                        )}
                                    >
                                        <div className="bg-purple-500 p-2 rounded-lg">
                                            <Scissors className="w-6 h-6 text-white rotate-90" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-100">Salão de Beleza</h3>
                                            <p className="text-xs text-slate-400">Foco em cortes femininos, coloração e estética.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 5 && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 h-48 overflow-y-auto custom-scrollbar text-justify leading-relaxed">
                                        <p className="mb-2"><strong>TERMOS DE USO SIMPLIFICADOS</strong></p>
                                        <p className="mb-2">Ao criar sua conta, você concorda com os Termos de Uso e Política de Privacidade da <strong>791 SOLUÇÕES EMPRESARIAIS LTDA</strong> (CNPJ 61.887.941/0001-83).</p>
                                        <p className="mb-2">1. O sistema é fornecido "como está".</p>
                                        <p className="mb-2">2. Você é responsável pelos dados de seus clientes.</p>
                                        <p className="mb-2">3. O não pagamento da assinatura pode levar à suspensão do serviço.</p>
                                        <p>Leia o documento completo em <strong>Configurações &gt; Jurídico</strong> após o cadastro.</p>
                                    </div>
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setTermsAccepted(!termsAccepted)}>
                                        <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors", termsAccepted ? "bg-blue-600 border-blue-600" : "border-slate-600")}>
                                            {businessType && <div className="w-2 h-2 bg-white rounded-full"></div> /* Icon check mock */}
                                        </div>
                                        <span className="text-xs text-slate-300">Li e aceito os Termos de Uso e Política de Privacidade.</span>
                                    </div>
                                </div>
                            )}

                            {step === 6 && (
                                <div className="flex flex-col items-center justify-center h-full py-8 space-y-4 animate-in zoom-in duration-500">
                                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                        <Scissors className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Prontinho!</h3>
                                    <p className="text-slate-400 text-center text-sm">Sua barbearia foi configurada com sucesso.<br />Redirecionando para o painel...</p>
                                </div>
                            )}
                        </CardContent>

                        {step < 6 && (
                            <CardFooter className="flex flex-col gap-3 py-4">
                                <Button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 text-base shadow-lg shadow-blue-900/20"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
                                    ) : step === 5 ? 'Finalizar Cadastro' : 'Continuar'}
                                </Button>

                                {step > 1 && (
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="text-xs text-slate-500 hover:text-slate-300 uppercase font-black"
                                    >
                                        Voltar
                                    </button>
                                )}

                                {step === 1 && (
                                    <p className="text-[10px] text-slate-500 text-center uppercase font-bold">
                                        Já tem uma conta?{' '}
                                        <Link href="/login" className="text-blue-500 hover:underline">Faça login</Link>
                                    </p>
                                )}
                            </CardFooter>
                        )}
                    </form>
                </Card>
            </div>
        </div>
    );
}
