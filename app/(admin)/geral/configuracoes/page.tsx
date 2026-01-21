'use client';

import { useEffect, useState } from 'react';
import { Api } from '@/lib/api';
import {
    Settings,
    CreditCard,
    Shield,
    Lock,
    Save,
    Loader2,
    AlertCircle,
    Copy,
    Check
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function SystemSettingsPage() {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await Api.getSystemSettings();
            setSettings(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const handleSave = async (key: string, value: any) => {
        try {
            setSaving(key);
            await Api.updateSystemSetting(key, value);
            alert('Configuração salva com sucesso!');
        } catch (e: any) {
            alert('Erro ao salvar: ' + e.message);
        } finally {
            setSaving(null);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin inline mr-2" /> Carregando configurações...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-black text-slate-100 tracking-tighter uppercase">Configurações Globais</h1>
                <p className="text-slate-500 font-medium">Configure as chaves mestras utilizadas pela plataforma 791 Barber.</p>
            </div>

            {/* Stripe Config */}
            <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-500">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <CardTitle className="text-slate-100">Configurações de Pagamento</CardTitle>
                            <CardDescription className="text-slate-400">Gerencie as chaves das APIs de pagamento.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Asaas Section */}
                    <div className="space-y-4 border-b border-slate-800 pb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-blue-900/50 flex items-center justify-center text-blue-400">
                                <span className="font-bold text-xs">AS</span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Asaas (Principal)</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold">Ambiente</Label>
                                <select
                                    value={settings?.asaas_config?.environment || 'sandbox'}
                                    onChange={(e) => setSettings({ ...settings, asaas_config: { ...settings.asaas_config, environment: e.target.value } })}
                                    className="w-full bg-slate-950 border-slate-800 text-slate-100 rounded-md p-2 text-sm"
                                >
                                    <option value="sandbox">Sandbox (Testes)</option>
                                    <option value="production">Produção</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold">API Key</Label>
                                <Input
                                    value={settings?.asaas_config?.api_key || ''}
                                    onChange={(e) => setSettings({ ...settings, asaas_config: { ...settings.asaas_config, api_key: e.target.value } })}
                                    placeholder="$aact_..."
                                    className="bg-slate-950 border-slate-800 text-slate-100"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold">Wallet ID</Label>
                                <Input
                                    value={settings?.asaas_config?.wallet_id || ''}
                                    onChange={(e) => setSettings({ ...settings, asaas_config: { ...settings.asaas_config, wallet_id: e.target.value } })}
                                    className="bg-slate-950 border-slate-800 text-slate-100"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={() => handleSave('asaas_config', settings.asaas_config)}
                                disabled={saving === 'asaas_config'}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            >
                                {saving === 'asaas_config' ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar Asaas
                            </Button>
                        </div>
                    </div>

                    {/* Asaas Branding Section */}
                    <div className="space-y-4 border-b border-slate-800 pb-8 pt-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-blue-900/50 flex items-center justify-center text-blue-400">
                                <span className="font-bold text-xs">🎨</span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Identidade Visual (Boletos/Pix)</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold">Logo URL (Público)</Label>
                                <Input
                                    value={settings?.asaas_branding?.logoUrl || ''}
                                    onChange={(e) => setSettings({ ...settings, asaas_branding: { ...settings.asaas_branding, logoUrl: e.target.value } })}
                                    placeholder="https://sua-empresa.com/logo.png"
                                    className="bg-slate-950 border-slate-800 text-slate-100"
                                />
                                <p className="text-[10px] text-slate-500">A URL deve ser pública e segura (HTTPS).</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold">Cor Principal (Hex)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={settings?.asaas_branding?.primaryColor || ''}
                                        onChange={(e) => setSettings({ ...settings, asaas_branding: { ...settings.asaas_branding, primaryColor: e.target.value } })}
                                        placeholder="#000000"
                                        className="bg-slate-950 border-slate-800 text-slate-100"
                                    />
                                    <div className="w-10 h-10 rounded border border-slate-700 shrink-0" style={{ backgroundColor: settings?.asaas_branding?.primaryColor || 'transparent' }}></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold">Cor Secundária/Texto (Hex)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={settings?.asaas_branding?.infoColor || ''}
                                        onChange={(e) => setSettings({ ...settings, asaas_branding: { ...settings.asaas_branding, infoColor: e.target.value } })}
                                        placeholder="#000000"
                                        className="bg-slate-950 border-slate-800 text-slate-100"
                                    />
                                    <div className="w-10 h-10 rounded border border-slate-700 shrink-0" style={{ backgroundColor: settings?.asaas_branding?.infoColor || 'transparent' }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={async () => {
                                    try {
                                        setSaving('asaas_branding');
                                        const res = await fetch('/api/admin/asaas/customize', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(settings.asaas_branding)
                                        });
                                        if (!res.ok) throw new Error((await res.json()).error);
                                        await handleSave('asaas_branding', settings.asaas_branding); // Salva localmente também
                                        alert('Identidade visual atualizada no Asaas!');
                                    } catch (e: any) {
                                        alert('Erro ao atualizar visual: ' + e.message);
                                    } finally {
                                        setSaving(null);
                                    }
                                }}
                                disabled={saving === 'asaas_branding'}
                                variant="outline"
                                className="border-blue-900/50 text-blue-400 hover:bg-blue-950"
                            >
                                {saving === 'asaas_branding' ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Aplicar Personalização
                            </Button>
                        </div>
                    </div>

                    {/* Stripe Section (Legacy/Backup) */}
                    <div className="space-y-4 pt-4 opacity-50 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                                <CreditCard size={14} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Stripe (Legado / Backup)</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold">Public Key</Label>
                                <Input
                                    value={settings?.stripe_config?.public_key || ''}
                                    onChange={(e) => setSettings({ ...settings, stripe_config: { ...settings.stripe_config, public_key: e.target.value } })}
                                    placeholder="pk_live_..."
                                    className="bg-slate-950 border-slate-800 text-slate-100"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold">Secret Key</Label>
                                <Input
                                    type="password"
                                    value={settings?.stripe_config?.secret_key || ''}
                                    onChange={(e) => setSettings({ ...settings, stripe_config: { ...settings.stripe_config, secret_key: e.target.value } })}
                                    placeholder="sk_live_..."
                                    className="bg-slate-950 border-slate-800 text-slate-100"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold">Webhook Secret</Label>
                                <Input
                                    value={settings?.stripe_config?.webhook_secret || ''}
                                    onChange={(e) => setSettings({ ...settings, stripe_config: { ...settings.stripe_config, webhook_secret: e.target.value } })}
                                    placeholder="whsec_..."
                                    className="bg-slate-950 border-slate-800 text-slate-100"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end border-t border-slate-800 pt-6">
                            <Button
                                onClick={() => handleSave('stripe_config', settings.stripe_config)}
                                disabled={saving === 'stripe_config'}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            >
                                {saving === 'stripe_config' ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar Stripe
                            </Button>
                        </div>
                    </div>

                </CardContent>
            </Card>

            {/* Inter Config */}
            <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-orange-600 to-amber-600" />
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center text-amber-500">
                            <Shield size={20} />
                        </div>
                        <div>
                            <CardTitle className="text-slate-100">Banco Inter (Pix SaaS)</CardTitle>
                            <CardDescription className="text-slate-400">Configurações para recebimento de Pix direto na sua conta PJ.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-slate-400 text-xs uppercase font-bold">Client ID</Label>
                            <Input
                                value={settings?.inter_config?.client_id || ''}
                                onChange={(e) => setSettings({ ...settings, inter_config: { ...settings.inter_config, client_id: e.target.value } })}
                                className="bg-slate-950 border-slate-800 text-slate-100"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-400 text-xs uppercase font-bold">Client Secret</Label>
                            <Input
                                type="password"
                                value={settings?.inter_config?.client_secret || ''}
                                onChange={(e) => setSettings({ ...settings, inter_config: { ...settings.inter_config, client_secret: e.target.value } })}
                                className="bg-slate-950 border-slate-800 text-slate-100"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-400 text-xs uppercase font-bold">Chave Pix SaaS</Label>
                            <Input
                                value={settings?.inter_config?.pix_key || ''}
                                onChange={(e) => setSettings({ ...settings, inter_config: { ...settings.inter_config, pix_key: e.target.value } })}
                                placeholder="A sua chave no Inter"
                                className="bg-slate-950 border-slate-800 text-slate-100"
                            />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold">Certificado (.crt)</Label>
                                <textarea
                                    value={settings?.inter_config?.crt || ''}
                                    onChange={(e) => setSettings({ ...settings, inter_config: { ...settings.inter_config, crt: e.target.value } })}
                                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-[10px] font-mono text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    placeholder="-----BEGIN CERTIFICATE-----"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold">Chave Privada (.key)</Label>
                                <textarea
                                    value={settings?.inter_config?.key || ''}
                                    onChange={(e) => setSettings({ ...settings, inter_config: { ...settings.inter_config, key: e.target.value } })}
                                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-[10px] font-mono text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    placeholder="-----BEGIN PRIVATE KEY-----"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase font-bold text-amber-500">Certificado Webhook (ca.crt)</Label>
                                <textarea
                                    value={settings?.inter_config?.ca_crt || ''}
                                    onChange={(e) => setSettings({ ...settings, inter_config: { ...settings.inter_config, ca_crt: e.target.value } })}
                                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-[10px] font-mono text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    placeholder="-----BEGIN CERTIFICATE-----"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-800 pt-6">
                        <Button
                            variant="outline"
                            onClick={async () => {
                                try {
                                    setSaving('webhook_inter');
                                    setSaving('webhook_inter');
                                    const res = await Api.setupInterWebhook();
                                    alert('Webhook registrado com sucesso no Banco Inter!\nURLs: ' + (res.registeredUrl || 'OK'));
                                } catch (e: any) {
                                    alert('Erro ao ativar Webhook: ' + e.message);
                                } finally {
                                    setSaving(null);
                                }
                            }}
                            disabled={saving !== null || !settings?.inter_config?.pix_key}
                            className="border-slate-700 text-slate-400 hover:text-white"
                        >
                            {saving === 'webhook_inter' ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                            Registrar Webhook no Inter
                        </Button>
                        <Button
                            onClick={() => handleSave('inter_config', settings.inter_config)}
                            disabled={saving === 'inter_config'}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                        >
                            {saving === 'inter_config' ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Salvar Inter
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Webhook URLs */}
            <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-slate-100">Endpoints do Sistema</CardTitle>
                    <CardDescription className="text-slate-400">URLs que você deve configurar nos painéis externos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-4">
                        <div className="flex items-center gap-3 text-amber-500 mb-2">
                            <Shield className="w-5 h-5" />
                            <h3 className="font-bold">Configuração de Webhook</h3>
                        </div>
                        <p className="text-sm text-slate-400">
                            Para que o sistema receba confirmações de pagamento automáticas, você deve configurar o seguinte URL no painel do Banco Inter e do Stripe:
                        </p>

                        <div className="space-y-3">
                            <div>
                                <Label className="text-xs text-slate-500 uppercase">URL de Webhook (Banco Inter & Stripe)</Label>
                                <div className="flex gap-2 mt-1">
                                    <input
                                        readOnly
                                        value="https://api.791barber.com/api/webhooks/inter"
                                        className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-300 font-mono"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText("https://api.791barber.com/api/webhooks/inter");
                                            alert("Link copiado!");
                                        }}
                                    >
                                        Copiar
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="text-xs text-amber-600 bg-amber-500/5 p-3 rounded border border-amber-500/10">
                            <strong>Dica Banco Inter:</strong> No Internet Banking, vá em "Minhas Integrações", clique nos três pontinhos da aplicação "791 Barber" e escolha "Configurar Webhook". Cole o link acima e, se solicitado, use o arquivo <strong>ca.crt</strong> que você baixou.
                        </div>
                    </div>

                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-blue-500 text-[10px] font-black uppercase tracking-widest">Stripe Webhook URL</Label>
                            <button onClick={() => copyToClipboard('https://api.791barber.com/api/webhooks/stripe', 'sw')} className="text-slate-500 hover:text-slate-200">
                                {copied === 'sw' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                        </div>
                        <code className="block text-xs text-slate-400 font-mono">https://api.791barber.com/api/webhooks/stripe</code>
                    </div>

                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 border-l-4 border-l-blue-600">
                        <div className="flex justify-between items-center">
                            <Label className="text-blue-500 text-[10px] font-black uppercase tracking-widest">Asaas Webhook URL (Novo)</Label>
                            <button onClick={() => copyToClipboard('https://api.791barber.com/api/webhooks/asaas', 'aw')} className="text-slate-500 hover:text-slate-200">
                                {copied === 'aw' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                        </div>
                        <code className="block text-xs text-slate-400 font-mono">https://api.791barber.com/api/webhooks/asaas</code>
                    </div>

                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-amber-500 text-[10px] font-black uppercase tracking-widest">Inter Webhook URL</Label>
                            <button onClick={() => copyToClipboard('https://api.791barber.com/api/webhooks/inter', 'iw')} className="text-slate-500 hover:text-slate-200">
                                {copied === 'iw' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                        </div>
                        <code className="block text-xs text-slate-400 font-mono">https://api.791barber.com/api/webhooks/inter</code>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
