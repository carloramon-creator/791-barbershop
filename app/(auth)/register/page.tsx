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
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [shopName, setShopName] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [phone, setPhone] = useState('');
    const [cep, setCep] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState(1);
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
        setLoading(true);
        setError(null);

        try {
            // Garantir que o redirect URL seja http://localhost:3000 localmente para bater com a Allow List do Supabase
            // e evitar que browsers ou proxies troquem para porta 8080 ou HTTPS indevidamente.
            // FORÇAR URL CORRETA:
            // O problema é que o Supabase às vezes ignora o Site URL se o redirectURL não for exatamente igual ao da Allow List.
            // Aqui garantimos que estamos enviando exatamente o que o browser está usando.
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

            // 2. Chamar API do Backend para criar o Tenant (Barbearia) e vincular perfil
            const response = await fetch(`/api/auth/tenants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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
                    state
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao configurar barbearia');
            }

            // 3. Sucesso! Redirecionar para o Dashboard
            setTimeout(() => {
                router.push('/dashboard');
            }, 1000);

        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || 'Erro no cadastro');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4 py-8">
            <div className="w-full max-w-lg">
                <div className="flex justify-center mb-6">
                    <div className="bg-blue-600 p-2.5 rounded-xl">
                        <Scissors className="w-6 h-6 text-white" />
                    </div>
                </div>

                <Card className="border-slate-800 bg-slate-900 shadow-2xl">
                    <CardHeader className="space-y-1 py-4">
                        <CardTitle className="text-xl text-center font-bold">Configurar Sua Barbearia</CardTitle>
                        <CardDescription className="text-center text-slate-400 text-xs">
                            {step === 1 ? 'Primeiro, seus dados de acesso' : 'Agora, localize sua barbearia'}
                        </CardDescription>

                        {/* Indicador de Passos */}
                        <div className="flex items-center justify-center gap-2 pt-2">
                            <div className={cn("h-1.5 w-8 rounded-full", step === 1 ? "bg-blue-600" : "bg-slate-700")}></div>
                            <div className={cn("h-1.5 w-8 rounded-full", step === 2 ? "bg-blue-600" : "bg-slate-700")}></div>
                        </div>
                    </CardHeader>

                    <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleRegister}>
                        <CardContent className="space-y-4 py-2">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-2.5 rounded-md text-xs text-center">
                                    {error}
                                </div>
                            )}

                            {step === 1 ? (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="shopName" className="text-xs uppercase font-bold text-slate-500">Nome da Barbearia</Label>
                                        <Input
                                            id="shopName"
                                            placeholder="Ex: 791 Barber Club"
                                            value={shopName}
                                            onChange={(e) => setShopName(e.target.value)}
                                            className="bg-slate-800 border-slate-700 h-10 text-sm"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="cnpj" className="text-xs uppercase font-bold text-slate-500">CPF ou CNPJ (Opcional)</Label>
                                            <Input
                                                id="cnpj"
                                                placeholder="00.000.000/0001-00"
                                                value={cnpj}
                                                onChange={(e) => setCnpj(e.target.value)}
                                                className="bg-slate-800 border-slate-700 h-10 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone" className="text-xs uppercase font-bold text-slate-500">WhatsApp</Label>
                                            <Input
                                                id="phone"
                                                placeholder="(00) 00000-0000"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="bg-slate-800 border-slate-700 h-10 text-sm"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-xs uppercase font-bold text-slate-500">Seu Nome</Label>
                                        <Input
                                            id="name"
                                            placeholder="João Silva"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="bg-slate-800 border-slate-700 h-10 text-sm"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-xs uppercase font-bold text-slate-500">Email Admin</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="seu@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="bg-slate-800 border-slate-700 h-10 text-sm"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-xs uppercase font-bold text-slate-500">Senha</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="bg-slate-800 border-slate-700 h-10 text-sm"
                                            required
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="animate-in slide-in-from-right-4 duration-300 space-y-3">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="cep" className="text-xs uppercase font-bold text-slate-500">CEP</Label>
                                            <Input
                                                id="cep"
                                                placeholder="00000-000"
                                                value={cep}
                                                onChange={(e) => setCep(e.target.value)}
                                                onBlur={handleCepBlur}
                                                className="bg-slate-800 border-slate-700 h-9 text-xs"
                                                required
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <Label htmlFor="neighborhood" className="text-xs uppercase font-bold text-slate-500">Bairro</Label>
                                            <Input
                                                id="neighborhood"
                                                placeholder="Bairro"
                                                value={neighborhood}
                                                onChange={(e) => setNeighborhood(e.target.value)}
                                                className="bg-slate-800 border-slate-700 h-9 text-xs"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="col-span-3 space-y-2">
                                            <Label htmlFor="street" className="text-xs uppercase font-bold text-slate-500">Rua/Logradouro</Label>
                                            <Input
                                                id="street"
                                                placeholder="Rua..."
                                                value={street}
                                                onChange={(e) => setStreet(e.target.value)}
                                                className="bg-slate-800 border-slate-700 h-9 text-xs"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="number" className="text-xs uppercase font-bold text-slate-500">Nº</Label>
                                            <Input
                                                id="number"
                                                placeholder="123"
                                                value={number}
                                                onChange={(e) => setNumber(e.target.value)}
                                                className="bg-slate-800 border-slate-700 h-9 text-xs"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="col-span-3 space-y-2">
                                            <Label htmlFor="city" className="text-xs uppercase font-bold text-slate-500">Cidade</Label>
                                            <Input
                                                id="city"
                                                placeholder="Cidade"
                                                value={city}
                                                onChange={(e) => setCity(e.target.value)}
                                                className="bg-slate-800 border-slate-700 h-9 text-xs"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="state" className="text-xs uppercase font-bold text-slate-500">UF</Label>
                                            <Input
                                                id="state"
                                                placeholder="UF"
                                                value={state}
                                                onChange={(e) => setState(e.target.value)}
                                                className="bg-slate-800 border-slate-700 h-9 text-xs"
                                                maxLength={2}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3 py-4">
                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 text-base shadow-lg shadow-blue-900/20"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Criando Barbearia...
                                    </>
                                ) : step === 1 ? 'Continuar para Endereço' : 'Finalizar Registro'}
                            </Button>

                            {step === 2 && (
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-xs text-slate-500 hover:text-slate-300 uppercase font-black"
                                >
                                    Voltar
                                </button>
                            )}

                            <p className="text-[10px] text-slate-500 text-center uppercase font-bold">
                                Já tem uma conta?{' '}
                                <Link href="/login" className="text-blue-500 hover:underline">
                                    Faça login
                                </Link>
                            </p>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
