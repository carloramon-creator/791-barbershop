'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Scissors, Lock, CheckCircle2, Loader2, ArrowRight, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

function SetupPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [searchParams]);

    const handleSetupPassword = async (e: React.FormEvent) => {
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
            // No Supabase, se o usuário clicou no link de convite/recuperação, 
            // ele já possui uma sessão ativa (ou o hash na URL será processado pelo SDK).
            const { data, error: updateError } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            setSuccessMessage('Senha definida com sucesso! Entrando no sistema...');

            const user = data.user;
            if (!user) throw new Error('Erro ao obter dados do usuário');

            // Buscar permissões/role para redirecionar corretamente
            const { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            if (userError) {
                console.error('Erro ao buscar perfil:', userError);
                // Se der erro no perfil, tentamos o dashboard como fallback
                setTimeout(() => router.push('/dashboard'), 1500);
                return;
            }

            // Delay para mostrar mensagem de sucesso
            setTimeout(() => {
                if (userData.role === 'owner') {
                    router.push('/dashboard');
                } else if (userData.role === 'barber' || userData.role === 'staff') {
                    // Se for barbeiro ou staff, vai para a página do barbeiro (fila)
                    router.push('/barbeiro');
                } else {
                    router.push('/');
                }
            }, 2000);

        } catch (err: any) {
            setError(err.message || 'Erro ao atualizar senha');
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md z-10">
            <div className="flex justify-center mb-8 animate-in fade-in zoom-in duration-500">
                <div className="bg-gradient-to-br from-blue-600 to-blue-400 p-4 rounded-2xl shadow-lg shadow-blue-500/20">
                    <Scissors className="w-10 h-10 text-white" />
                </div>
            </div>

            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl relative">
                <CardHeader className="space-y-2 pb-6">
                    <CardTitle className="text-3xl text-center font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Bem-vindo ao 791 Barber
                    </CardTitle>
                    <CardDescription className="text-center text-slate-400 text-sm">
                        Crie sua senha de acesso para começar
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
                    <form onSubmit={handleSetupPassword}>
                        <CardContent className="space-y-4 pt-0">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs text-center font-medium animate-in shake duration-300">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-300">Seu E-mail</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            readOnly
                                            className="bg-slate-800/50 border-slate-800 pl-10 h-12 rounded-xl text-slate-400 cursor-not-allowed"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 ml-1 italic">Este é o e-mail cadastrado pela administração.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">Escolha uma Senha</Label>
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
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirme sua Senha</Label>
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
                        </CardContent>

                        <CardFooter className="flex flex-col gap-4 pb-8">
                            <Button
                                type="submit"
                                className="w-full h-14 rounded-xl text-white font-bold transition-all duration-300 active:scale-95 group bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-500/20"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Finalizar Cadastro
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                )}
            </Card>
        </div>
    );
}

export default function SetupPasswordPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4 relative overflow-hidden">
            {/* Background Decorativo igual ao login */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
            </div>

            <Suspense fallback={
                <div className="flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                </div>
            }>
                <SetupPasswordForm />
            </Suspense>

            <div className="absolute bottom-8 w-full text-center">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">791 Barber System • Gestão Inteligente</p>
            </div>
        </div>
    );
}
