'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { supabaseClient } from '@/lib/supabase-client';

// Use env var or default to backend URL for signup
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

export default function LandingPage() {
    const [openDialog, setOpenDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        barbershopName: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function handleSignUp() {
        if (!formData.name || !formData.email || !formData.barbershopName || !formData.password) {
            setError('Preencha todos os campos inclusive a senha');
            return;
        }

        if (formData.password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // 1. Chamar API de signup do backend
            const res = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar');

            // 2. Login automático com a senha escolhida
            const { error: signInError } = await supabaseClient.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (signInError) throw signInError;

            setSuccess(true);
            setTimeout(() => {
                window.location.href = '/configuracoes/barbearia';
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <h1 className="text-2xl font-bold text-blue-400">791 Barber</h1>
                </div>
            </div>

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-100">
                        Gerencie sua barbearia com facilidade
                    </h2>
                    <p className="text-lg text-slate-400">
                        Sistema completo para agendamentos, controle de barbeiros, produtos e financeiro.
                        Teste grátis por 7 dias!
                    </p>

                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-slate-300">Agendamentos ilimitados</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-slate-300">Gestão de barbeiros</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-slate-300">Controle financeiro</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-slate-300">Suporte 24/7</span>
                        </div>
                    </div>

                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg mt-6 w-full"
                        onClick={() => setOpenDialog(true)}
                    >
                        Comece Grátis por 7 Dias
                    </Button>

                    <p className="text-sm text-slate-500">
                        Sem cartão de crédito necessário. Cancele a qualquer momento.
                    </p>
                </div>

                <div className="hidden md:block">
                    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-12 text-center">
                        <div className="text-6xl font-bold text-blue-400 mb-4">7</div>
                        <p className="text-2xl font-semibold text-slate-100 mb-2">Dias Grátis</p>
                        <p className="text-slate-400">Acesso completo ao Premium</p>
                    </div>
                </div>
            </div>

            {/* Modal de Signup */}
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
                    <DialogHeader>
                        <DialogTitle>Comece Seu Teste Grátis</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            7 dias de acesso completo ao Premium. Sem cobranças.
                        </DialogDescription>
                    </DialogHeader>

                    {success ? (
                        <div className="space-y-4 py-8 text-center">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                            <h3 className="text-xl font-semibold text-slate-100">
                                Cadastro realizado com sucesso!
                            </h3>
                            <p className="text-slate-400">
                                Redirecionando para o painel...
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="João Silva"
                                    className="bg-slate-950 border-slate-800"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="seu@email.com"
                                    className="bg-slate-950 border-slate-800"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Escolha uma senha"
                                    className="bg-slate-950 border-slate-800"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="barbershopName">Nome da Barbearia</Label>
                                <Input
                                    id="barbershopName"
                                    value={formData.barbershopName}
                                    onChange={(e) => setFormData({ ...formData, barbershopName: e.target.value })}
                                    placeholder="Barbearia do João"
                                    className="bg-slate-950 border-slate-800"
                                />
                            </div>
                        </div>
                    )}

                    {!success && (
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setOpenDialog(false)}
                                disabled={loading}
                                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={handleSignUp}
                                disabled={loading}
                            >
                                {loading ? 'Cadastrando...' : 'Iniciar Teste Grátis'}
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
