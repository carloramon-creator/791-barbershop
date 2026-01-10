'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { Api } from '@/lib/api';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, Users, CreditCard, Building2, AlertTriangle, Shield, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { MaskedInput } from '@/components/ui/masked-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function BarbershopSettingsPage() {
    const { refresh } = useAuth();
    const pathname = usePathname();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [hasCnpj, setHasCnpj] = useState(true);
    const [phone, setPhone] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [slug, setSlug] = useState('');

    // Address State
    const [cep, setCep] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [complement, setComplement] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');

    // Bank & Pix State
    const [pixKey, setPixKey] = useState('');
    const [pixKeyType, setPixKeyType] = useState('cpf'); // cpf, cnpj, email, phone, random
    const [bankCode, setBankCode] = useState('');
    const [bankAgency, setBankAgency] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [bankAccountDigit, setBankAccountDigit] = useState('');
    const [bankAccountHolder, setBankAccountHolder] = useState('');
    const [bankAccountDoc, setBankAccountDoc] = useState('');


    const loadBarbershop = async () => {
        try {
            setLoading(true);
            const data = await Api.getBarbershop();
            if (data) {
                setName(data.name || '');
                setEmail(data.email || '');
                setCnpj(data.cnpj || '');
                setHasCnpj(data.cnpj ? data.cnpj.replace(/\D/g, '').length > 11 : true);
                setPhone(data.phone || '');
                setLogoUrl(data.logo_url || '');
                setSlug(data.slug || '');

                // Address fields
                setCep(data.cep || '');
                setStreet(data.street || '');
                setNumber(data.number || '');
                setComplement(data.complement || '');
                setNeighborhood(data.neighborhood || '');
                setCity(data.city || '');
                setState(data.state || '');

                // Bank fields
                setPixKey(data.pix_key || '');
                setPixKeyType(data.pix_key_type || 'cpf');
                setBankCode(data.bank_code || '');
                setBankAgency(data.bank_agency || '');
                setBankAccount(data.bank_account || '');
                setBankAccountDigit(data.bank_account_digit || '');
                setBankAccountHolder(data.bank_account_holder || data.name || '');
                setBankAccountDoc(data.bank_account_doc || data.cnpj || '');

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
                const errorPayload = uploadError as unknown as Record<string, unknown>;
                if (uploadError.message.includes('Bucket not found') || errorPayload.error === 'Bucket not found') {
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
        } catch (err: unknown) {
            const error = err as Error;
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
        setLoading(true);

        try {
            const payload = {
                name,
                email,
                cnpj,
                phone,
                cep,
                street,
                number,
                complement,
                neighborhood,
                city,
                state,
                logo_url: logoUrl,
                slug: slug,
                // Bank Info
                pix_key: pixKey,
                pix_key_type: pixKeyType,
                bank_code: bankCode,
                bank_agency: bankAgency,
                bank_account: bankAccount,
                bank_account_digit: bankAccountDigit,
                bank_account_holder: bankAccountHolder,
                bank_account_doc: bankAccountDoc,
            };
            await Api.updateBarbershop(payload);
            await refresh(); // Global context refresh
            await loadBarbershop(); // Local state refresh from DB
            setIsEditing(false);
            alert('Configurações atualizadas com sucesso!');
        } catch (err: unknown) {
            const error = err as Error;
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
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold text-slate-100 tracking-tighter">Configurações</h1>
                <div className="flex space-x-1 border-b border-slate-800 bg-slate-900/50 p-1 rounded-t-lg overflow-x-auto">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                                isCurrentTab(tab.href)
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.name}
                        </Link>
                    ))}
                </div>
            </div>

            <Card className="bg-slate-900 border-slate-800 shadow-xl">
                <CardHeader>
                    <CardTitle className="text-slate-100 flex justify-between items-center">
                        <span>Dados da Barbearia</span>
                        {!isEditing && (
                            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800">
                                Editar
                            </Button>
                        )}
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        Informações visíveis no seu perfil e para clientes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Logo Upload */}
                        <div className="space-y-4 bg-slate-950/50 p-6 rounded-lg border border-slate-800/50">
                            <Label className="text-slate-200 font-bold uppercase text-xs tracking-wider">Logo e Branding</Label>
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden relative shrink-0 group">
                                    {logoUrl ? (
                                        <Image src={logoUrl} alt="Logo Preview" width={96} height={96} className="w-full h-full object-cover transition-transform group-hover:scale-110" unoptimized />
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
                                        className="bg-slate-900 border-slate-800 text-slate-300 file:text-blue-500 file:bg-blue-500/10 file:rounded-md file:border-0 file:mr-4 file:px-4 file:py-2 hover:file:bg-blue-500/20 cursor-pointer w-full max-w-sm disabled:opacity-50"
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-slate-400 text-xs uppercase font-bold">Nome da Barbearia</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Minha Barbearia"
                                    required
                                    disabled={!isEditing}
                                    className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400 h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-400 text-xs uppercase font-bold">E-mail da Barbearia</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="contato@barbearia.com"
                                    disabled={!isEditing}
                                    className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400 h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-slate-400 text-xs uppercase font-bold">Telefone / WhatsApp</Label>
                                <MaskedInput
                                    mask="(99) 99999-9999"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="(00) 00000-0000"
                                    disabled={!isEditing}
                                    className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400 h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="cnpj" className="text-slate-400 text-xs uppercase font-bold">
                                        {hasCnpj ? 'CNPJ' : 'CPF do Proprietário'}
                                    </Label>
                                    <button
                                        type="button"
                                        disabled={!isEditing}
                                        onClick={() => setHasCnpj(!hasCnpj)}
                                        className="text-[10px] text-blue-500 hover:text-blue-400 font-bold uppercase disabled:opacity-50"
                                    >
                                        {hasCnpj ? 'Não tenho CNPJ' : 'Tenho CNPJ'}
                                    </button>
                                </div>
                                <MaskedInput
                                    mask={hasCnpj ? "99.999.999/9999-99" : "999.999.999-99"}
                                    value={cnpj}
                                    onChange={(e) => setCnpj(e.target.value)}
                                    placeholder={hasCnpj ? "00.000.000/0000-00" : "000.000.000-00"}
                                    disabled={!isEditing}
                                    className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400 h-11"
                                />
                                <p className="text-[10px] text-slate-500">
                                    {hasCnpj ? 'Ideal para empresas formalizadas.' : 'Use seu CPF caso não seja empresa formal (MEI/etc).'}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug" className="text-slate-400 text-xs uppercase font-bold">Slug URL (Identificador Único)</Label>
                                <Input
                                    id="slug"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    placeholder="ex: minha-barbearia"
                                    disabled={!isEditing}
                                    className="bg-slate-950 border-slate-800 text-blue-400 font-mono h-11"
                                />
                                <p className="text-[10px] text-slate-500">
                                    Seu link será: frontend-client-six-orpin.vercel.app/{slug || 'nome-da-barbearia'}
                                </p>
                            </div>
                        </div>

                        {/* Public Access Section - NEW */}
                        {!isEditing && (
                            <div className="space-y-4 pt-6 border-t border-slate-800/50">
                                <h3 className="text-sm font-bold uppercase text-slate-400 flex items-center gap-2">
                                    <Sparkles size={16} className="text-blue-500" /> Divulgação para Clientes
                                </h3>

                                <Card className="bg-slate-950/50 border-slate-800">
                                    <CardContent className="pt-6">
                                        <div className="flex flex-col md:flex-row items-center gap-8">
                                            <div className="bg-white p-4 rounded-2xl shadow-2xl">
                                                <QRCodeSVG
                                                    value={`https://frontend-client-six-orpin.vercel.app/${slug}`}
                                                    size={160}
                                                    includeMargin={true}
                                                    level="H"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-4 text-center md:text-left">
                                                <div className="space-y-1">
                                                    <h4 className="text-xl font-black text-slate-100 uppercase italic">App do Cliente</h4>
                                                    <p className="text-sm text-slate-400">Este QR Code leva seus clientes direto para a sua fila digital.</p>
                                                </div>

                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    <Button
                                                        variant="outline"
                                                        className="border-slate-700 hover:bg-slate-800 gap-2"
                                                        onClick={() => {
                                                            const url = `https://frontend-client-six-orpin.vercel.app/${slug}`;
                                                            navigator.clipboard.writeText(url);
                                                            alert('Link copiado!');
                                                        }}
                                                    >
                                                        Copiar Link
                                                    </Button>
                                                    <Button
                                                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-900/40"
                                                        onClick={() => {
                                                            const printWindow = window.open('', '_blank');
                                                            if (!printWindow) return;
                                                            const url = `https://frontend-client-six-orpin.vercel.app/${slug}`;
                                                            printWindow.document.write(`
                                                                <html>
                                                                    <head>
                                                                        <title>Imprimir QR Code - ${name}</title>
                                                                        <style>
                                                                            body { font-family: sans-serif; display: flex; flex-direction: column; items-center; justify-content: center; height: 100vh; margin: 0; text-align: center; background: white; color: black; }
                                                                            .card { border: 2px solid #000; padding: 40px; border-radius: 20px; max-width: 400px; }
                                                                            h1 { margin-top: 0; font-size: 28px; text-transform: uppercase; }
                                                                            p { color: #666; margin-bottom: 30px; }
                                                                            .qr-placeholder { margin: 20px 0; }
                                                                            .footer { font-size: 10px; margin-top: 40px; color: #999; }
                                                                        </style>
                                                                    </head>
                                                                    <body>
                                                                        <div class="card">
                                                                            <img src="${logoUrl}" style="height: 80px; margin-bottom: 20px;" />
                                                                            <h1>${name}</h1>
                                                                            <p>Escaneie para entrar na fila digital</p>
                                                                            <div id="qr-container"></div>
                                                                            <div class="footer">Powered by 791 Barber</div>
                                                                        </div>
                                                                        <script>
                                                                            // Pequeno hack para renderizar o QR code na janela de impressão
                                                                            window.onload = () => {
                                                                                const container = document.getElementById('qr-container');
                                                                                const svg = window.opener.document.querySelector('svg').cloneNode(true);
                                                                                svg.setAttribute('width', '250');
                                                                                svg.setAttribute('height', '250');
                                                                                container.appendChild(svg);
                                                                                setTimeout(() => { window.print(); window.close(); }, 500);
                                                                            };
                                                                        </script>
                                                                    </body>
                                                                </html>
                                                            `);
                                                            printWindow.document.close();
                                                        }}
                                                    >
                                                        Imprimir QR Code
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Address Section */}
                        <div className="space-y-4 pt-6 border-t border-slate-800/50">
                            <h3 className="text-sm font-bold uppercase text-slate-400 flex items-center gap-2">
                                <Building2 size={16} /> Endereço
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cep" className="text-slate-400 text-xs uppercase font-bold">CEP</Label>
                                    <MaskedInput
                                        mask="99999-999"
                                        value={cep}
                                        onChange={(e) => setCep(e.target.value)}
                                        onBlur={handleCepBlur}
                                        required
                                        placeholder="00000-000"
                                        disabled={!isEditing}
                                        className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400 h-10"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="street" className="text-slate-400 text-xs uppercase font-bold">Rua / Logradouro</Label>
                                    <Input
                                        id="street"
                                        value={street}
                                        onChange={(e) => setStreet(e.target.value)}
                                        required
                                        disabled={!isEditing}
                                        className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400 h-10"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="number" className="text-slate-400 text-xs uppercase font-bold">Número</Label>
                                    <Input
                                        id="number"
                                        value={number}
                                        onChange={(e) => setNumber(e.target.value)}
                                        placeholder="123"
                                        required
                                        disabled={!isEditing}
                                        className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400 h-10"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="complement" className="text-slate-400 text-xs uppercase font-bold">Complemento</Label>
                                    <Input
                                        id="complement"
                                        value={complement}
                                        onChange={(e) => setComplement(e.target.value)}
                                        placeholder="Sala 1, Bloco B"
                                        disabled={!isEditing}
                                        className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400 h-10"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="neighborhood" className="text-slate-400 text-xs uppercase font-bold">Bairro</Label>
                                    <Input
                                        id="neighborhood"
                                        value={neighborhood}
                                        onChange={(e) => setNeighborhood(e.target.value)}
                                        required
                                        disabled={!isEditing}
                                        className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400 h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city" className="text-slate-400 text-xs uppercase font-bold">Cidade</Label>
                                    <Input
                                        id="city"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        required
                                        disabled={!isEditing}
                                        className="bg-slate-950 border-slate-800 text-slate-100 disabled:bg-slate-900 disabled:text-slate-400 h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="state" className="text-slate-400 text-xs uppercase font-bold">UF</Label>
                                    <Input
                                        id="state"
                                        value={state}
                                        onChange={(e) => setState(e.target.value)}
                                        required
                                        maxLength={2}
                                        placeholder="SP"
                                        disabled={!isEditing}
                                        className="bg-slate-950 border-slate-800 text-slate-100 uppercase disabled:bg-slate-900 disabled:text-slate-400 h-10"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Banking Section - NEW */}
                        <div className="space-y-4 pt-6 border-t border-slate-800/50">
                            <h3 className="text-sm font-bold uppercase text-slate-400 flex items-center gap-2">
                                <CreditCard size={16} /> Dados Bancários e PIX
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">
                                Configure sua chave PIX para gerar QR Codes automaticamente no momento da venda.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/30 p-4 rounded-lg border border-slate-800/30">
                                <div className="space-y-2">
                                    <Label className="text-slate-200 text-xs uppercase font-bold">Chave PIX (Obrigatório)</Label>
                                    <Input
                                        value={pixKey}
                                        onChange={e => setPixKey(e.target.value)}
                                        placeholder="CPF, CNPJ, Email ou Telefone"
                                        disabled={!isEditing}
                                        className="bg-slate-900 border-slate-700 text-emerald-400 font-bold h-11"
                                    />
                                    <p className="text-[10px] text-slate-500">Esta chave aparecerá no QR Code para o cliente pagar.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-200 text-xs uppercase font-bold">Tipo da Chave</Label>
                                    <Select value={pixKeyType} onValueChange={setPixKeyType} disabled={!isEditing}>
                                        <SelectTrigger className="bg-slate-900 border-slate-700 h-11">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700">
                                            <SelectItem value="cpf">CPF</SelectItem>
                                            <SelectItem value="cnpj">CNPJ</SelectItem>
                                            <SelectItem value="email">E-mail</SelectItem>
                                            <SelectItem value="phone">Telefone (Celular)</SelectItem>
                                            <SelectItem value="random">Chave Aleatória</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 opacity-50 hover:opacity-100 transition-opacity">
                                <div className="space-y-2">
                                    <Label className="text-slate-500 text-[10px] uppercase font-bold">Banco (Código)</Label>
                                    <Input value={bankCode} onChange={e => setBankCode(e.target.value)} disabled={!isEditing} className="h-9 text-xs bg-slate-950 border-slate-800" placeholder="Ex: 260 (Nubank)" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-500 text-[10px] uppercase font-bold">Agência</Label>
                                    <Input value={bankAgency} onChange={e => setBankAgency(e.target.value)} disabled={!isEditing} className="h-9 text-xs bg-slate-950 border-slate-800" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-500 text-[10px] uppercase font-bold">Conta Corrente</Label>
                                    <Input value={bankAccount} onChange={e => setBankAccount(e.target.value)} disabled={!isEditing} className="h-9 text-xs bg-slate-950 border-slate-800" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label className="text-slate-500 text-[10px] uppercase font-bold">Nome do Titular</Label>
                                    <Input value={bankAccountHolder} onChange={e => setBankAccountHolder(e.target.value)} disabled={!isEditing} className="h-9 text-xs bg-slate-950 border-slate-800" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-500 text-[10px] uppercase font-bold">CPF/CNPJ do Titular</Label>
                                    <Input value={bankAccountDoc} onChange={e => setBankAccountDoc(e.target.value)} disabled={!isEditing} className="h-9 text-xs bg-slate-950 border-slate-800" />
                                </div>
                            </div>
                        </div>


                        {isEditing && (
                            <div className="pt-6 flex justify-end gap-4 sticky bottom-0 bg-slate-950/80 backdrop-blur-sm p-4 border-t border-slate-800 z-10">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => { setIsEditing(false); loadBarbershop(); }}
                                    className="border-slate-800 text-slate-400 hover:bg-slate-800"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading || uploading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px] shadow-lg shadow-blue-900/40"
                                >
                                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                                </Button>
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>

            {/* Repair Section */}
            <Card className="bg-amber-900/10 border-amber-500/30 border">
                <CardHeader>
                    <CardTitle className="text-amber-500 flex items-center gap-2">
                        <AlertTriangle size={20} /> Diagnóstico de Sistema
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-400 mb-4">
                        Se você notar dados faltando no painel ou erros estranhos, execute o reparo automático.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="border-blue-500/50 text-blue-500 hover:bg-blue-500 hover:text-white"
                            onClick={async () => {
                                try {
                                    const backendUrl = '';
                                    const { data: { session } } = await supabaseClient.auth.getSession();
                                    const token = session?.access_token;

                                    const res = await fetch(`${backendUrl}/api/debug/finance`, {
                                        method: 'GET',
                                        headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json'
                                        }
                                    });

                                    if (!res.ok) {
                                        const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
                                        throw new Error(errorData.error || res.statusText);
                                    }

                                    const data = await res.json();
                                    alert('Diagnóstico:\n\n' + JSON.stringify(data, null, 2));
                                } catch (e: any) {
                                    alert('Erro no diagnóstico: ' + e.message);
                                }
                            }}
                        >
                            Ver Diagnóstico
                        </Button>
                        <Button
                            variant="outline"
                            className="border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-white"
                            onClick={async () => {
                                if (!confirm('Executar reparo do sistema? Isso pode levar alguns segundos.')) return;
                                try {
                                    const backendUrl = '';
                                    const { data: { session } } = await supabaseClient.auth.getSession();
                                    const token = session?.access_token;

                                    const res = await fetch(`${backendUrl}/api/system/repair`, {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json'
                                        }
                                    });

                                    if (!res.ok) {
                                        const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
                                        throw new Error(errorData.error || res.statusText);
                                    }

                                    const data = await res.json();
                                    alert('Reparo concluído!\n\nDetalhes:\n' + JSON.stringify(data, null, 2));
                                    window.location.reload();
                                } catch (e: any) {
                                    alert('Erro ao reparar: ' + e.message);
                                }
                            }}
                        >
                            Executar Reparo de Dados
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
