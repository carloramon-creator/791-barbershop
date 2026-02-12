'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileCheck, Shield, Globe, Save, AlertCircle, Zap, MapPin, Key } from 'lucide-react';
import { toast } from 'sonner';

export default function NfseConfigPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                    <Shield className="text-blue-500" /> Configurações NFS-e Nacional
                </h1>
                <p className="text-slate-400">Gerencie certificados digitais e ambiente de emissão.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-slate-900 border-slate-800 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-purple-500" /> Município e Identificação
                        </CardTitle>
                        <CardDescription>Configure o local e as chaves de identificação fiscal da plataforma.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Código Municipal (TOM/IBGE)</Label>
                            <Input
                                type="text"
                                placeholder="Ex: 8303 (São José/SC)"
                                value={config.municipal_code}
                                onChange={(e) => setConfig(prev => ({ ...prev, municipal_code: e.target.value }))}
                                disabled={saving}
                                className="bg-slate-800 border-slate-700 font-mono"
                            />
                            {config.municipal_code === '8303' && (
                                <p className="text-xs text-purple-400 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> São José/SC - Provedor IPM Fiscal será usado automaticamente
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/50">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">CNAE Padrão (Plataforma)</Label>
                                <Input
                                    type="text"
                                    placeholder="Ex: 6202300"
                                    value={config.cnae}
                                    onChange={(e) => setConfig(prev => ({ ...prev, cnae: e.target.value }))}
                                    disabled={saving}
                                    className="bg-slate-800 border-slate-700 font-mono h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cód. Tributação Nacional</Label>
                                <Input
                                    type="text"
                                    placeholder="Ex: 01.01.01"
                                    value={config.tax_code}
                                    onChange={(e) => setConfig(prev => ({ ...prev, tax_code: e.target.value }))}
                                    disabled={saving}
                                    className="bg-slate-800 border-slate-700 font-mono h-10"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Credenciais IPM - Só aparece se o município usar IPM */}
                {config.municipal_code === '8303' && (
                    <Card className="bg-slate-900 border-slate-800 md:col-span-2 border-2 border-purple-500/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="w-5 h-5 text-purple-500" /> Credenciais IPM Fiscal
                            </CardTitle>
                            <CardDescription>Credenciais de acesso ao sistema IPM Fiscal (Atende.Net) de São José/SC.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Usuário IPM</Label>
                                    <Input
                                        type="text"
                                        placeholder="usuario_ipm"
                                        value={config.ipm_username}
                                        onChange={(e) => setConfig(prev => ({ ...prev, ipm_username: e.target.value }))}
                                        disabled={saving}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Senha IPM</Label>
                                    <Input
                                        type="password"
                                        placeholder="senha_ipm"
                                        value={config.ipm_password}
                                        onChange={(e) => setConfig(prev => ({ ...prev, ipm_password: e.target.value }))}
                                        disabled={saving}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg flex gap-3 text-xs text-purple-400 leading-relaxed">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span>Essas credenciais serão usadas para autenticação no sistema IPM Fiscal. Entre em contato com a prefeitura de São José/SC para obtê-las.</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-emerald-500" /> Ambiente
                        </CardTitle>
                        <CardDescription>Defina para onde as notas serão enviadas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Ambiente de Trabalho</Label>
                            <Select
                                value={config.environment}
                                onValueChange={(v) => setConfig(prev => ({ ...prev, environment: v }))}
                                disabled={saving}
                            >
                                <SelectTrigger className="bg-slate-800 border-slate-700">
                                    <SelectValue placeholder="Selecione o ambiente" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                    <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
                                    <SelectItem value="producao">Produção (Real)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {config.environment === 'homologacao' && (
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3 text-xs text-blue-400 leading-relaxed">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span>No modo de Homologação, as notas emitidas não possuem valor fiscal. Use para testes.</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileCheck className="w-5 h-5 text-blue-500" /> Certificado Digital A1
                        </CardTitle>
                        <CardDescription>Upload do certificado padrão eSocial/RFB.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Arquivo .PFX / .P12</Label>
                            <Input
                                type="file"
                                accept=".pfx,.p12"
                                onChange={handleFileChange}
                                disabled={saving}
                                className="bg-slate-800 border-slate-700 cursor-pointer file:bg-blue-600 file:text-white file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:text-xs"
                            />
                            {config.certificateUploaded && (
                                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                    <FileCheck className="w-3 h-3" /> Certificado já está no servidor
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Senha do Certificado</Label>
                            <Input
                                type="password"
                                placeholder="Digite a senha do certificado"
                                value={files.passphrase || ''}
                                onChange={(e) => setFiles(prev => ({ ...prev, passphrase: e.target.value }))}
                                disabled={saving}
                                className="bg-slate-800 border-slate-700 font-mono"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500" /> Automação SaaS
                        </CardTitle>
                        <CardDescription>Configure o comportamento automático da plataforma.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700 transition-colors hover:bg-slate-800">
                            <div className="space-y-1">
                                <Label className="text-base font-bold text-slate-100 cursor-pointer" htmlFor="auto-emit-toggle">
                                    Emissão Automática (SaaS)
                                </Label>
                                <p className="text-xs text-slate-400">Emitir NFS-e Nacional automaticamente após a confirmação de pagamento (Stripe/Inter).</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    id="auto-emit-toggle"
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={config.auto_emit}
                                    onChange={(e) => setConfig(prev => ({ ...prev, auto_emit: e.target.checked }))}
                                    disabled={saving}
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    className="bg-blue-600 hover:bg-blue-700 h-12 w-full md:w-48 font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-transform"
                    disabled={saving}
                    onClick={handleSave}
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5 mr-2" />
                            Salvar Alterações
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
