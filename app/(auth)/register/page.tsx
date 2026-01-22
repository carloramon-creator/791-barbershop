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

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [shopName, setShopName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Criar conta no Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                    data: {
                        full_name: name,
                    },
                },
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Erro ao criar usuário');

            // 2. Chamar API do Backend para criar o Tenant (Barbearia) e vincular perfil
            // Nota: O Next.js enviará os cookies de sessão do Supabase automaticamente
            const response = await fetch(`/api/auth/tenants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: shopName,
                    plan: 'basic'
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao configurar barbearia');
            }

            // 3. Sucesso! Redirecionar para o Dashboard
            // Nota: Pode ser necessário fazer um reload ou esperar o trigger do banco
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
        <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4 py-12">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <div className="bg-blue-600 p-3 rounded-xl">
                        <Scissors className="w-8 h-8 text-white" />
                    </div>
                </div>

                <Card className="border-slate-800 bg-slate-900 shadow-2xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-center font-bold">Criar Nova Conta</CardTitle>
                        <CardDescription className="text-center text-slate-400">
                            Comece a gerenciar sua barbearia agora
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleRegister}>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-md text-sm text-center">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="shopName">Nome da Barbearia</Label>
                                <Input
                                    id="shopName"
                                    placeholder="Ex: 791 Barber Club"
                                    value={shopName}
                                    onChange={(e) => setShopName(e.target.value)}
                                    className="bg-slate-800 border-slate-700"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Seu Nome</Label>
                                <Input
                                    id="name"
                                    placeholder="João Silva"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-slate-800 border-slate-700"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Admin</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-slate-800 border-slate-700"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Senha Forte</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-slate-800 border-slate-700"
                                    required
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Configurando...
                                    </>
                                ) : 'Criar Barbearia'}
                            </Button>
                            <p className="text-sm text-slate-400 text-center">
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
