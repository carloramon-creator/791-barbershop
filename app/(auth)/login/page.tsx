'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Scissors } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await supabaseClient.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            // Buscar role para redirecionar
            const { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('role')
                .eq('id', data.user.id)
                .single();

            if (userError) {
                console.error('Erro ao buscar perfil:', userError);
                throw new Error('Perfil de usuário não encontrado na base de dados. Certifique-se de que sua conta está vinculada a uma barbearia.');
            }

            if (userData.role === 'owner') {
                router.push('/dashboard');
            } else if (userData.role === 'barber') {
                router.push('/barbeiro');
            } else {
                router.push('/');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao entrar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <div className="bg-blue-600 p-3 rounded-xl">
                        <Scissors className="w-8 h-8 text-white" />
                    </div>
                </div>

                <Card className="border-slate-800 bg-slate-900 shadow-2xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-center font-bold">791 Barber</CardTitle>
                        <CardDescription className="text-center text-slate-400">
                            Entre com sua conta de dono ou barbeiro
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleLogin}>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-md text-sm text-center">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
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
                                <Label htmlFor="password">Senha</Label>
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
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6"
                                disabled={loading}
                            >
                                {loading ? 'Entrando...' : 'Entrar'}
                            </Button>
                            <p className="text-sm text-slate-400 text-center">
                                Não tem uma conta?{' '}
                                <Link href="/register" className="text-blue-500 hover:underline">
                                    Cadastre sua barbearia
                                </Link>
                            </p>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
