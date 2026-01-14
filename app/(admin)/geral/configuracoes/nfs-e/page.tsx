'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileCheck, Shield, Globe, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function NfseConfigPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        environment: 'homologacao',
        certificateUploaded: false,
        lastUpdated: null
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
                setConfig(data);
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
                    ...files
                })
            });

            if (res.ok) {
                toast.success("Configurações fiscais atualizadas.");
                setFiles({}); // Limpa inputs de arquivo/senha após salvar
                fetchConfig();
            } else {
                throw new Error('Erro ao salvar');
            }
        } catch (error) {
            toast.error("Não foi possível salvar as configurações.");
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
                                className="bg-slate-800 border-slate-700 cursor-pointer"
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
                                className="bg-slate-800 border-slate-700"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    className="bg-blue-600 hover:bg-blue-700 h-12 w-full md:w-48 font-bold shadow-lg shadow-blue-600/20"
                    disabled={saving}
                    onClick={handleSave}
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                    Salvar Alterações
                </Button>
            </div>
        </div>
    );
}
