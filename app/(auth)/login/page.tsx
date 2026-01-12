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

// ... imports

export default function LoginPage() {
    const [view, setView] = useState<'login' | 'updatePassword' | 'forgotPassword'>('login');
    // ... existing state

    // ... existing useEffect

    const handleRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Check if we are in localhost or production for redirect URL
            const redirectTo = `${window.location.origin}/login?type=recovery`;

            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo,
            });

            if (error) throw error;

            setSuccessMessage('Se este email estiver cadastrado, você receberá um link para redefinir sua senha.');
        } catch (err: any) {
            // For security, usually we don't say if email exists or not, but Supabase might return error if rate limited etc.
            // We'll show generic error or specific if safe.
            setError(err.message || 'Erro ao enviar email de recuperação');
        } finally {
            setLoading(false);
        }
    };

    // ... existing handleLogin and handleUpdatePassword

    const isUpdateView = view === 'updatePassword';
    const isRecoveryView = view === 'forgotPassword';

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4 relative overflow-hidden">
            {/* ... background ... */}

            <div className="w-full max-w-md z-10">
                {/* ... logo ... */}

                <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl relative">
                    <CardHeader className="space-y-2 pb-6">
                        <CardTitle className="text-3xl text-center font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            {isUpdateView ? 'Defina sua Senha' : isRecoveryView ? 'Recuperar Senha' : '791 Barber'}
                        </CardTitle>
                        <CardDescription className="text-center text-slate-400 text-sm">
                            {isUpdateView
                                ? 'Crie uma senha segura para acessar sua conta.'
                                : isRecoveryView 
                                    ? 'Digite seu email para receber um link de redefinição.'
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
                                {/* Only show loader if likely redirecting, otherwise show back button */}
                                {isUpdateView ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                                ) : (
                                    <Button 
                                        variant="outline" 
                                        onClick={() => { setSuccessMessage(null); setView('login'); }}
                                        className="mt-2 border-slate-700 text-slate-300 hover:bg-slate-800"
                                    >
                                        Voltar para Login
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    ) : (
                        <form onSubmit={isUpdateView ? handleUpdatePassword : isRecoveryView ? handleRecovery : handleLogin}>
                            <CardContent className="space-y-4 pt-0">
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs text-center font-medium animate-in shake duration-300">
                                        {error}
                                    </div>
                                )}

                                {isUpdateView ? (
                                    // ... Update Password Fields ...
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
                                ) : isRecoveryView ? (
                                    // ... Recovery Fields ...
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
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
                                    </div>
                                ) : (
                                    // ... Login Fields ...
                                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
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
                                                    onClick={() => { setError(null); setView('forgotPassword'); }}
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
                                            {isUpdateView ? 'Definir Senha e Entrar' : isRecoveryView ? 'Enviar Link de Recuperação' : 'Acessar Painel 791'}
                                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </Button>

                                {!isUpdateView && !isRecoveryView && (
                                    <p className="text-sm text-slate-400 text-center">
                                        Não tem uma conta?{' '}
                                        <Link href="/register" className="text-blue-500 hover:text-blue-400 font-medium hover:underline">
                                            Cadastre sua barbearia
                                        </Link>
                                    </p>
                                )}
                                
                                {isRecoveryView && !successMessage && (
                                    <button
                                        type="button"
                                        onClick={() => { setError(null); setView('login'); }}
                                        className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                                    >
                                        Voltar para Login
                                    </button>
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
                                            {isUpdateView ? 'Definir Senha e Entrar' : 'Acessar Painel 791'}
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
            </div >
        </div >
    );
}
