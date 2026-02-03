'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function WhatsAppConfigPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [formData, setFormData] = useState({
        phone_number_id: '',
        access_token: '',
        business_account_id: ''
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/whatsapp/config');
            const data = await res.json();

            if (data.is_configured) {
                setConfig(data);
                setFormData({
                    phone_number_id: data.phone_number_id || '',
                    access_token: '', // Não mostramos o token completo por segurança
                    business_account_id: data.business_account_id || ''
                });
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            toast.error('Erro ao carregar configurações.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Se o usuário não digitou um token novo, mas já tem configuração, 
            // precisamos avisar ou impedir? 
            // A API espera o token para fazer upsert. Se estiver vazio e já existir,
            // idealmente a API trataria, mas nosso endpoint atual faz upsert completo.
            // Vamos forçar o usuário a reinserir o token se for editar por enquanto, ou tratar no backend.
            // Simplificação: Usuário deve fornecer token.

            if (!formData.access_token && !config?.is_configured) {
                toast.error('O Token de Acesso é obrigatório para nova configuração.');
                setSaving(false);
                return;
            }

            // Payload inteligente: só manda o token se ele foi alterado (não vazio)
            // Se vazio e já configurado, o usuário deve estar ciente que precisa enviar de novo pra atualizar.

            const payload = {
                phone_number_id: formData.phone_number_id,
                business_account_id: formData.business_account_id,
                access_token: formData.access_token
            };

            const res = await fetch('/api/whatsapp/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

            toast.success('Configuração do WhatsApp salva com sucesso!');
            setConfig({ ...data.config, is_configured: true });

            // Limpa o token da visualização
            setFormData(prev => ({ ...prev, access_token: '' }));
            fetchConfig(); // Recarrega para confirmar status

        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    return (
        <div className="container max-w-2xl mx-auto py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">WhatsApp Business API</h1>
                <p className="text-muted-foreground mt-2">
                    Configure a conexão direta com o WhatsApp (Meta) da sua barbearia para enviar notificações automáticas.
                </p>
            </div>

            {config?.is_configured ? (
                <Alert className="border-green-500 bg-green-500/10 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Conectado</AlertTitle>
                    <AlertDescription>
                        Sua barbearia já possui uma integração de WhatsApp ativa.
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert variant="default" className="bg-yellow-500/10 border-yellow-500 text-yellow-700">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Não Configurado</AlertTitle>
                    <AlertDescription>
                        Preencha os dados abaixo para ativar as notificações. Você precisa de uma conta no Meta for Developers.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Credenciais</CardTitle>
                    <CardDescription>
                        Você pode obter essas informações no painel do Aplicativo no Meta (Facebook Developers).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone_id">ID do Número de Telefone (Phone Number ID)</Label>
                            <Input
                                id="phone_id"
                                placeholder="Ex: 367606649764516"
                                value={formData.phone_number_id}
                                onChange={e => setFormData({ ...formData, phone_number_id: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="waba_id">ID da Conta do WhatsApp Business (WABA ID)</Label>
                            <Input
                                id="waba_id"
                                placeholder="Ex: 198273645102938 (Opcional)"
                                value={formData.business_account_id}
                                onChange={e => setFormData({ ...formData, business_account_id: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="token">Token de Acesso Permanente (Access Token)</Label>
                            <Input
                                id="token"
                                type="password"
                                placeholder={config?.is_configured ? "••••••••••••••••••••• (Configurado)" : "EAAG..."}
                                value={formData.access_token}
                                onChange={e => setFormData({ ...formData, access_token: e.target.value })}
                                required={!config?.is_configured}
                            />
                            <p className="text-xs text-muted-foreground">
                                Certifique-se de usar um token permanente (System User) para que a conexão não expire.
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button type="submit" disabled={saving}>
                                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar Configuração'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                <h4 className="font-semibold mb-2">Como obter os dados?</h4>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Acesse <a href="https://developers.facebook.com/apps/" target="_blank" className="underline hover:text-primary">Meta for Developers</a>.</li>
                    <li>Crie um aplicativo do tipo "Empresa" (Business).</li>
                    <li>Adicione o produto "WhatsApp" ao app.</li>
                    <li>Na aba "API Setup", você verá o <strong>Phone Number ID</strong>.</li>
                    <li>Para o Token Permanente, você precisará configurar um "Usuário do Sistema" no Business Manager.</li>
                </ol>
            </div>
        </div>
    );
}
