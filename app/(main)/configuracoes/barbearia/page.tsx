'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { Api } from '@/lib/api';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, Save, Users, CreditCard, Building2, AlertTriangle, Shield } from 'lucide-react';
import { MaskedInput } from '@/components/ui/masked-input';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function BarbershopSettingsPage() {
    const { tenant, refresh } = useAuth();
    const pathname = usePathname();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [phone, setPhone] = useState('');
    const [logoUrl, setLogoUrl] = useState('');

    // Address State
    const [cep, setCep] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [complement, setComplement] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');

    const loadBarbershop = async () => {
        try {
            setLoading(true);
            const data = await Api.getBarbershop();
            if (data) {
                setName(data.name || '');
                setCnpj(data.cnpj || '');
                setPhone(data.phone || '');
                setLogoUrl(data.logo_url || '');

                // Address fields
                setCep(data.cep || '');
                setStreet(data.street || '');
                setNumber(data.number || '');
                setComplement(data.complement || '');
                setNeighborhood(data.neighborhood || '');
                setCity(data.city || '');
                setState(data.state || '');
            }
        } catch (error) {
            console.error('Failed to load barbershop data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBarbershop();
    }, []);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploadError('');

        try {
            setUploading(true);
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload directly to Supabase Storage
            const { error: uploadError } = await supabaseClient.storage
                .from('logos')
                .upload(filePath, file);

            if (uploadError) {
                // Check if 'Bucket not found'
                if (uploadError.message.includes('Bucket not found') || (uploadError as any).error === 'Bucket not found') {
                    setUploadError('Bucket de armazenamento "logos" não encontrado. Crie-o no painel do Supabase com acesso público.');
                    return;
                }
                throw uploadError;
            }

            // Get Public URL
            const { data } = supabaseClient.storage
                .from('logos')
                .getPublicUrl(filePath);

            setLogoUrl(data.publicUrl);
        } catch (error: any) {
            setUploadError(error.message || 'Erro ao fazer upload');
        } finally {
            setUploading(false);
        }
    };

    const handleCepBlur = async () => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;

        try {
            const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await res.json();

            if (data.erro) {
                alert('CEP não encontrado!');
                return;
            }

            setStreet(data.logradouro);
            setNeighborhood(data.bairro);
            setCity(data.localidade);
            setState(data.uf);

            // Focus on number field ideally
            document.getElementById('number')?.focus();
        } catch (error) {
            console.error('Erro ao buscar CEP', error);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic CNPJ validation (length)
        const cleanCnpj = cnpj.replace(/\D/g, '');
        if (cleanCnpj && cleanCnpj.length !== 14) {
            alert('CNPJ inválido (deve ter 14 dígitos).');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                name,
                cnpj,
                phone,
                logo_url: logoUrl,
                cep,
                street,
                number,
                complement,
                neighborhood,
                city,
                state
            };

            await Api.updateBarbershop(payload);
            await refresh(); // Global context refresh
            await loadBarbershop(); // Local state refresh from DB
            setIsEditing(false);
            alert('Barbearia atualizada com sucesso!');
        } catch (error: any) {
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { name: 'Geral', href: '/configuracoes/barbearia', icon: Building2 },
        { name: 'Usuários', href: '/configuracoes/usuarios', icon: Users },
        { name: 'Permissões', href: '/configuracoes/permissoes', icon: Shield },
        { name: 'Plano', href: '/configuracoes/plano', icon: CreditCard },
    ];

    const isCurrentTab = (href: string) => pathname === href;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold text-slate-100">Configurações</h1>
                <div className="flex space-x-1 border-b border-slate-800">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                isCurrentTab(tab.href)
                                    ? "border-blue-500 text-blue-500"
                                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.name}
                        </Link>
                    ))}
                </div>
            </div>

            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-slate-100">Dados da Barbearia</CardTitle>
                    <CardDescription className="text-slate-500">
                        Informações visíveis no seu perfil e para clientes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Logo Upload */}
                        <div className="space-y-4">
                            <Label className="text-slate-200">Logo e Branding</Label>
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden relative shrink-0">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Upload className="w-8 h-8 text-slate-600" />
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2 flex-1">
                                    <Label htmlFor="logo" className="sr-only">Upload de Logo</Label>
                                    <Input
                                        id="logo"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        disabled={!isEditing}
                                        className="bg-slate-950 border-slate-800 text-slate-300 file:text-blue-500 file:bg-blue-500/10 file:rounded-md file:border-0 file:mr-4 file:px-4 file:py-2 hover:file:bg-blue-500/20 cursor-pointer w-full max-w-sm disabled:opacity-50"
                                    />
                                    {uploadError ? (
                                        <div className="flex items-center gap-2 text-red-400 text-xs">
                                            <AlertTriangle className="w-4 h-4" />
                                            {uploadError}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500">
                                            Recomendado: 500x500px (PNG/JPG). URL pública será usada.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-slate-200">Nome da Barbearia</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Minha Barbearia"
                                    required
                                    disabled={!isEditing}
                                    className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-slate-200">Telefone / WhatsApp</Label>
                                <MaskedInput
                                    mask="(99) 99999-9999"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="(00) 00000-0000"
                                    disabled={!isEditing}
                                    className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cnpj" className="text-slate-200">CNPJ</Label>
                                <MaskedInput
                                    mask="99.999.999/9999-99"
                                    value={cnpj}
                                    onChange={(e) => setCnpj(e.target.value)}
                                    placeholder="00.000.000/0000-00"
                                    disabled={!isEditing}
                                    className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Address Section */}
                        <div className="space-y-4 pt-4 border-t border-slate-800">
                            <h3 className="text-lg font-medium text-slate-200">Endereço</h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cep" className="text-slate-200">CEP</Label>
                                    <MaskedInput
                                        mask="99999-999"
                                        value={cep}
                                        onChange={(e) => setCep(e.target.value)}
                                        onBlur={handleCepBlur}
                                        required
                                        placeholder="00000-000"
                                        disabled={!isEditing}
                                        className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="street" className="text-slate-200">Rua / Logradouro</Label>
                                    <Input
                                        id="street"
                                        value={street}
                                        onChange={(e) => setStreet(e.target.value)}
                                        required
                                        disabled={!isEditing}
                                        className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="number" className="text-slate-200">Número</Label>
                                    <Input
                                        id="number"
                                        value={number}
                                        onChange={(e) => setNumber(e.target.value)}
                                        placeholder="123"
                                        required
                                        disabled={!isEditing}
                                        className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="complement" className="text-slate-200">Complemento (Opcional)</Label>
                                    <Input
                                        id="complement"
                                        value={complement}
                                        onChange={(e) => setComplement(e.target.value)}
                                        placeholder="Sala 1, Bloco B"
                                        disabled={!isEditing}
                                        className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="neighborhood" className="text-slate-200">Bairro</Label>
                                    <Input
                                        id="neighborhood"
                                        value={neighborhood}
                                        onChange={(e) => setNeighborhood(e.target.value)}
                                        required
                                        disabled={!isEditing}
                                        className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city" className="text-slate-200">Cidade</Label>
                                    <Input
                                        id="city"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        required
                                        disabled={!isEditing}
                                        className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="state" className="text-slate-200">UF</Label>
                                    <Input
                                        id="state"
                                        value={state}
                                        onChange={(e) => setState(e.target.value)}
                                        required
                                        maxLength={2}
                                        placeholder="SP"
                                        disabled={!isEditing}
                                        className="bg-slate-950 border-slate-800 text-slate-100 uppercase disabled:bg-slate-900 disabled:text-slate-400"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            {isEditing ? (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsEditing(false)}
                                        className="border-slate-800 text-slate-400 hover:bg-slate-800"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={loading || uploading}
                                        className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
                                    >
                                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
                                >
                                    Editar Informações
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
