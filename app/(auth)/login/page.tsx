'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Scissors, Mail, Lock, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function LoginPage() {
    const [view, setView] = useState<'login' | 'updatePassword'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Escuta mudanças de auth para detectar link de recuperação/convite
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setView('updatePassword');
                setUserEmail(session?.user?.email ?? null);
            }
            // Se já tiver uma sessão válida
            if (session) {
                // Checar se o hash do URL sugere um convite ou recuperação
                if (window.location.hash.includes('type=recovery') || window.location.hash.includes('type=invite')) {
                    setView('updatePassword');
                    setUserEmail(session?.user?.email ?? null);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

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
            await redirectUser(data.user.id);
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || 'Erro ao entrar');
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }
        if (newPassword.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: updateError } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            setSuccessMessage('Senha definida com sucesso! Entrando no sistema...');

            // Pequeno delay para o usuário ver a mensagem de sucesso
            setTimeout(() => {
                redirectUser(data.user.id);
            }, 1500);
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || 'Erro ao atualizar senha');
            setLoading(false);
        }
    };

    const redirectUser = async (userId: string) => {
        try {
            const { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();

            if (userError) {
                console.error('Erro ao buscar perfil:', userError);
                throw new Error('Perfil não encontrado. Sua conta pode não estar vinculada a uma barbearia.');
            }

            if (userData.role === 'owner' || userData.role === 'staff') {
                router.push('/dashboard');
            } else if (userData.role === 'barber') {
                router.push('/barbeiro');
            } else {
                router.push('/');
            }
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message);
            setLoading(false);
        }
    };

    const isUpdateView = view === 'updatePassword';

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4 relative overflow-hidden">
            {/* Background Decorativo */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
            </div>

            <div className="w-full max-w-md z-10">
                <div className="flex justify-center mb-8 animate-in fade-in zoom-in duration-500">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-400 p-4 rounded-2xl shadow-lg shadow-blue-500/20">
                        <Scissors className="w-10 h-10 text-white" />
                    </div>
                </div>

                <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl relative">
                    <CardHeader className="space-y-2 pb-6">
                        <CardTitle className="text-3xl text-center font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            {isUpdateView ? 'Defina sua Senha' : '791 Barber'}
                        </CardTitle>
                        <CardDescription className="text-center text-slate-400 text-sm">
                            {isUpdateView
                                ? 'Crie uma senha segura para acessar sua conta.'
                                : 'Entre com sua conta de dono ou colaborador'}
                        </CardDescription>
                    </CardHeader>

                    {successMessage ? (
                        <CardContent className="space-y-6 pt-0 text-center animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex justify-center flex-col items-center gap-4">
                                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                                <p className="text-emerald-400 font-medium">{successMessage}</p>
                                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                            </div>
                        </CardContent>
                    ) : (
                        <form onSubmit={isUpdateView ? handleUpdatePassword : handleLogin}>
                            <CardContent className="space-y-4 pt-0">
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs text-center font-medium animate-in shake duration-300">
                                        {error}
                                    </div>
                                )}

                                {isUpdateView ? (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-800 flex items-center gap-3 animate-in fade-in duration-700">
                                            <Mail className="w-4 h-4 text-slate-500" />
                                            <span className="text-sm text-slate-300">{userEmail || 'Configurando sua conta'}</span>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="newPassword">Nova Senha</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <Input
                                                    id="newPassword"
                                                    type="password"
                                                    placeholder="Digite sua nova senha"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="bg-slate-950 border-slate-800 pl-10 h-12 rounded-xl focus:ring-blue-500/20"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Confirme a Senha</Label>
                                            <div className="relative">
                                                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <Input
                                                    id="confirmPassword"
                                                    type="password"
                                                    placeholder="Repita a senha"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="bg-slate-950 border-slate-800 pl-10 h-12 rounded-xl focus:ring-blue-500/20"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-slate-300">Email</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="seu@email.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="bg-slate-950 border-slate-800 pl-10 h-12 rounded-xl focus:ring-blue-500/20"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="password">Senha</Label>
                                                <button
                                                    type="button"
                                                    onClick={() => alert('Em breve funcionalidade de recuperação de senha')}
                                                    className="text-xs text-blue-500 hover:text-blue-400"
                                                >
                                                    Esqueceu?
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <Input
                                                    id="password"
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="bg-slate-950 border-slate-800 pl-10 h-12 rounded-xl focus:ring-blue-500/20"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex flex-col gap-4 pb-8">
                                <Button
                                    type="submit"
                                    className={cn(
                                        "w-full h-14 rounded-xl text-white font-bold transition-all duration-300 active:scale-95 group",
                                        isUpdateView
                                            ? "bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-500/20"
                                            : "bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-500/20"
                                    )}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            {isUpdateView ? 'Definir Senha e Entrar' : 'Entrar no Sistema'}
                                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </Button>

                                {!isUpdateView && (
                                    <p className="text-sm text-slate-400 text-center">
                                        Não tem uma conta?{' '}
                                        <Link href="/register" className="text-blue-500 hover:text-blue-400 font-medium hover:underline">
                                            Cadastre sua barbearia
                                        </Link>
                                    </p>
                                )}
                                {isUpdateView && (
                                    <p className="text-xs text-slate-500 text-center px-4">
                                        Após definir sua senha, você será redirecionado automaticamente para o painel.
                                    </p>
                                )}
                            </CardFooter>
                        </form>
                    )}
                </Card>

                <div className="mt-8 flex justify-center gap-6">
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Privacy Policy</p>
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Terms of Service</p>
                </div>
            </div>
        </div>
    );
}
