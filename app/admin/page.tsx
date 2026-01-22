'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { session } = useAuth();

    // Se já estiver logado como admin, vai direto
    useEffect(() => {
        const checkSesh = async () => {
            if (session?.user) {
                const { data } = await supabaseClient.from('users').select('is_system_admin').eq('id', session.user.id).single();
                const isHolding = session.user.email?.includes('@791solucoes');

                if (data?.is_system_admin || isHolding) {
                    router.push('/geral');
                }
            }
        };
        checkSesh();
    }, [session, router]);

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

            // Verificar se é Admin ou Holding
            const { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('is_system_admin')
                .eq('id', data.user.id)
                .single();

            const isHoldingEmail = data.user.email?.includes('@791solucoes');

            if ((userError || !userData?.is_system_admin) && !isHoldingEmail) {
                // Logout imediato se não for admin
                await supabaseClient.auth.signOut();
                throw new Error('Acesso negado: Este portal é restrito a Administradores do Sistema.');
            }

            router.push('/geral');
            router.refresh();

        } catch (err: unknown) {
            const error = err as Error;
            console.error('Admin Login error:', error);
            setError(error.message || 'Erro ao entrar');
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4 relative overflow-hidden">
            {/* Background Especial Admin */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-blue-900/20 blur-[150px] rounded-full" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
            </div>

            <div className="w-full max-w-md z-10">
                <div className="flex justify-center mb-8 animate-in fade-in zoom-in duration-500">
                    <div className="bg-slate-900 p-4 rounded-2xl shadow-2xl shadow-blue-900/20 border border-slate-800">
                        <ShieldCheck className="w-10 h-10 text-blue-500" />
                    </div>
                </div>

                <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-2xl relative border-t-4 border-t-blue-600">
                    <CardHeader className="space-y-2 pb-6">
                        <CardTitle className="text-2xl text-center font-black tracking-tighter text-white uppercase">
                            Admin Access
                        </CardTitle>
                        <CardDescription className="text-center text-slate-400 text-xs uppercase tracking-widest font-bold">
                            Portal Exclusivo de Gestão
                        </CardDescription>
                    </CardHeader>

                    <form onSubmit={handleLogin}>
                        <CardContent className="space-y-4 pt-0">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs text-center font-bold animate-in shake duration-300 flex items-center justify-center gap-2">
                                    <ShieldCheck size={14} />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-300 text-xs uppercase font-bold">Email Institucional</Label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="admin@791solucoes.com.br"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="bg-slate-950 border-slate-800 pl-10 h-12 rounded-xl focus:ring-blue-600 focus:border-blue-600 transition-all text-sm"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-slate-300 text-xs uppercase font-bold">Senha de Acesso</Label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="bg-slate-950 border-slate-800 pl-10 h-12 rounded-xl focus:ring-blue-600 focus:border-blue-600 transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4 pb-8">
                            <Button
                                type="submit"
                                className={cn(
                                    "w-full h-12 rounded-xl text-white font-black uppercase tracking-widest text-xs transition-all duration-300 active:scale-95 group",
                                    "bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/20"
                                )}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Entrar no Painel
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-8">
                    Restricted Area • 791 Soluções © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}
