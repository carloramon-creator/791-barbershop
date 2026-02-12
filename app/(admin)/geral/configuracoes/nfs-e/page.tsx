'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileCheck, Shield, Globe, Save, AlertCircle, Zap, MapPin, Key, Activity, Hash, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function NfseConfigPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const router = useRouter();
    const [config, setConfig] = useState({
        environment: 'homologacao',
        auto_emit: false,
        certificateUploaded: false,
        lastUpdated: null,
        municipal_code: '',
        cnae: '',
        tax_code: '',
        ipm_username: '',
        ipm_password: ''
    });

    const [files, setFiles] = useState<{ pfxBase64?: string; passphrase?: string }>({});

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/system/nfse-config');
            const data = await res.json();
            if (res.ok) {
                // Sincroniza o estado local com os dados do servidor
                setConfig({
                    environment: data.environment || 'homologacao',
                    auto_emit: !!data.auto_emit,
                    certificateUploaded: !!data.certificateUploaded,
                    lastUpdated: data.lastUpdated,
                    municipal_code: data.municipal_code || '',
                    cnae: data.cnae || '',
                    tax_code: data.tax_code || '',
                    ipm_username: data.ipm_username || '',
                    ipm_password: data.ipm_password || ''
                });
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFiles(prev => ({ ...prev, pfxBase64: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await fetch('/api/system/nfse-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    environment: config.environment,
                    auto_emit: config.auto_emit,
                    pfxBase64: files.pfxBase64,
                    passphrase: files.passphrase,
                    municipal_code: config.municipal_code,
                    cnae: config.cnae,
                    tax_code: config.tax_code,
                    ipm_username: config.ipm_username,
                    ipm_password: config.ipm_password
                })
            });

            if (res.ok) {
                toast.success("Configurações fiscais salvas com sucesso!");
                setFiles({}); // Limpa inputs locais
                fetchConfig();
            } else {
                const errData = await res.json();
                throw new Error(errData.error || 'Erro ao salvar');
            }
        } catch (error: any) {
            toast.error(error.message || "Não foi possível salvar as configurações.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div className="space-y-2">
                <h1 className="text-4xl font-extrabold text-white flex items-center gap-3 tracking-tight">
                    <Shield className="w-10 h-10 text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                    Configurações NFS-e Nacional
                </h1>
                <p className="text-slate-300 text-lg">Gerencie certificados digitais, ambiente de emissão e identificação fiscal da plataforma.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Município e Identificação */}
                <Card className="bg-slate-900/60 border-slate-700 md:col-span-2 backdrop-blur-sm shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-blue-500" />
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-2xl text-white">
                            <MapPin className="w-6 h-6 text-purple-400" /> Município e Identificação
                        </CardTitle>
                        <CardDescription className="text-slate-300 text-base">Configure o local e as chaves de identificação fiscal da plataforma.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-4">
                        <div className="space-y-3">
                            <Label className="text-slate-100 text-sm font-bold flex items-center gap-2">
                                Código Municipal (TOM/IBGE)
                            </Label>
                            <Input
                                type="text"
                                placeholder="Ex: 8303 (São José/SC)"
                                value={config.municipal_code}
                                onChange={(e) => setConfig(prev => ({ ...prev, municipal_code: e.target.value }))}
                                disabled={saving}
                                className="bg-slate-800 border-slate-600 text-white font-mono h-12 text-lg focus:border-purple-500 focus:ring-purple-500/20 transition-all placeholder:text-slate-500"
                            />
                            {config.municipal_code === '8303' && (
                                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-purple-400" />
                                    <p className="text-sm text-purple-300 font-medium tracking-wide">
                                        São José/SC - Provedor IPM Fiscal (Atende.Net) será usado automaticamente
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-800">
                            <div className="space-y-3">
                                <Label className="text-[11px] uppercase font-black text-slate-400 tracking-[0.15em] flex items-center gap-2">
                                    <Activity className="w-3 h-3 text-blue-400" /> CNAE Padrão (SaaS)
                                </Label>
                                <Input
                                    type="text"
                                    placeholder="Ex: 6202300"
                                    value={config.cnae}
                                    onChange={(e) => setConfig(prev => ({ ...prev, cnae: e.target.value }))}
                                    disabled={saving}
                                    className="bg-slate-800 border-slate-600 text-white font-mono h-12 text-lg focus:border-blue-500 placeholder:text-slate-500"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[11px] uppercase font-black text-slate-400 tracking-[0.15em] flex items-center gap-2">
                                    <Hash className="w-3 h-3 text-blue-400" /> Cód. Tributação Nacional
                                </Label>
                                <Input
                                    type="text"
                                    placeholder="Ex: 01.01.01"
                                    value={config.tax_code}
                                    onChange={(e) => setConfig(prev => ({ ...prev, tax_code: e.target.value }))}
                                    disabled={saving}
                                    className="bg-slate-800 border-slate-600 text-white font-mono h-12 text-lg focus:border-blue-500 placeholder:text-slate-500"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Credenciais IPM */}
                {config.municipal_code === '8303' && (
                    <Card className="bg-slate-900/60 border-purple-500/30 md:col-span-2 backdrop-blur-sm shadow-[0_0_25px_rgba(168,85,247,0.15)] relative overflow-hidden">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-2xl text-white">
                                <Key className="w-6 h-6 text-purple-400" /> Credenciais IPM Fiscal
                            </CardTitle>
                            <CardDescription className="text-slate-300 text-base">Acesso exclusivo ao sistema IPM Fiscal de São José/SC.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-slate-100 font-bold">Usuário IPM</Label>
                                    <Input
                                        type="text"
                                        placeholder="Digite o usuário"
                                        value={config.ipm_username}
                                        onChange={(e) => setConfig(prev => ({ ...prev, ipm_username: e.target.value }))}
                                        disabled={saving}
                                        className="bg-slate-800 border-slate-600 text-white h-12 text-base placeholder:text-slate-500"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-slate-100 font-bold">Senha IPM</Label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={config.ipm_password}
                                        onChange={(e) => setConfig(prev => ({ ...prev, ipm_password: e.target.value }))}
                                        disabled={saving}
                                        className="bg-slate-800 border-slate-600 text-white h-12 text-lg placeholder:text-slate-500"
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex gap-3 text-sm text-purple-300 leading-relaxed italic">
                                <AlertCircle className="w-6 h-6 shrink-0 text-purple-400" />
                                <span>As credenciais são exclusivas para o Atende.Net. Caso ainda não as possua, solicite acesso "G2 Net" junto à prefeitura.</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Ambiente */}
                <Card className="bg-slate-900/60 border-slate-700 backdrop-blur-sm shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/50" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl text-white">
                            <Globe className="w-5 h-5 text-emerald-400" /> Ambiente
                        </CardTitle>
                        <CardDescription className="text-slate-300">Defina o destino das faturas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-3">
                            <Label className="text-slate-100 font-bold">Tipo de Operação</Label>
                            <Select
                                value={config.environment}
                                onValueChange={(v) => setConfig(prev => ({ ...prev, environment: v }))}
                                disabled={saving}
                            >
                                <SelectTrigger className="bg-slate-800 border-slate-600 text-white h-12 text-base hover:bg-slate-700 transition-colors">
                                    <SelectValue placeholder="Selecione o ambiente" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                                    <SelectItem value="homologacao" className="focus:bg-blue-600 cursor-pointer text-slate-100">Homologação (Testes)</SelectItem>
                                    <SelectItem value="producao" className="focus:bg-blue-600 cursor-pointer text-slate-100">Produção (Real)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {config.environment === 'homologacao' && (
                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3 text-xs text-blue-300 font-medium">
                                <AlertCircle className="w-5 h-5 shrink-0 text-blue-400" />
                                <span>Cuidado: Notas em modo Homologação são descartadas pela RFB após 24h e não possuem validade fiscal.</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Certificado */}
                <Card className="bg-slate-900/60 border-slate-700 backdrop-blur-sm shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl text-white">
                            <FileCheck className="w-5 h-5 text-blue-400" /> Certificado Digital A1
                        </CardTitle>
                        <CardDescription className="text-slate-300">Upload do arquivo eSocial/RFB.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-3">
                            <Label className="text-slate-100 font-bold">Arquivo .PFX / .P12</Label>
                            <div className="relative group">
                                <Input
                                    type="file"
                                    accept=".pfx,.p12"
                                    onChange={handleFileChange}
                                    disabled={saving}
                                    className="bg-slate-800 border-slate-600 text-white h-12 cursor-pointer file:bg-blue-600 file:text-white file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 file:text-xs hover:border-blue-400 transition-all placeholder:text-slate-500"
                                />
                                {config.certificateUploaded && (
                                    <div className="absolute right-3 top-3.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Ativo</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-slate-100 font-bold">Senha do Certificado</Label>
                            <Input
                                type="password"
                                placeholder="Pelo menos 4 caracteres"
                                value={files.passphrase || ''}
                                onChange={(e) => setFiles(prev => ({ ...prev, passphrase: e.target.value }))}
                                disabled={saving}
                                className="bg-slate-800 border-slate-600 text-white font-mono h-12 text-lg placeholder:text-slate-500"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Automação */}
                <Card className="bg-slate-900 md:col-span-2 border-slate-700 shadow-xl overflow-hidden">
                    <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                                <Zap className="w-6 h-6 text-amber-500 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white leading-none">Automação SaaS Inteligente</h3>
                                <p className="text-xs text-slate-300 mt-1">Configurações globais de disparo para a plataforma 791.</p>
                            </div>
                        </div>
                    </div>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between p-6 bg-slate-800/60 rounded-2xl border border-slate-700 hover:border-blue-500/50 transition-all group shadow-inner">
                            <div className="space-y-1">
                                <Label className="text-xl font-extrabold text-white cursor-pointer select-none group-hover:text-blue-400 transition-colors" htmlFor="auto-emit-toggle">
                                    Emissão Automática de Notas
                                </Label>
                                <p className="text-sm text-slate-300 max-w-md">Emitir NFS-e Nacional via API 791 imediatamente após o pagamento das mensalidades pelos lojistas.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer scale-125">
                                <input
                                    id="auto-emit-toggle"
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={config.auto_emit}
                                    onChange={(e) => setConfig(prev => ({ ...prev, auto_emit: e.target.checked }))}
                                    disabled={saving}
                                />
                                <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 shadow-xl"></div>
                            </label>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Ações */}
            <div className="flex flex-col md:flex-row justify-end gap-4 pt-8 border-t border-slate-800">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="h-14 px-8 text-slate-300 hover:text-white hover:bg-slate-800 text-lg font-semibold"
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-14 px-12 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] text-lg font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <Save className="w-6 h-6 mr-3" />
                            Aplicar Configurações
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
