// Página exclusiva para gestão de planos das vidraçarias
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Save, Loader2, Percent } from 'lucide-react';

// Módulos típicos de vidraçaria (pode ser ajustado depois)
const GLASS_MODULES = [
  { id: 'producao', label: 'Produção' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'orcamentos', label: 'Orçamentos' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'configuracoes', label: 'Configurações' },
];

export default function VidracariasPlansPage() {
  // Estado dos valores dos módulos
  const [modules, setModules] = useState(() =>
    GLASS_MODULES.map(mod => ({ ...mod, price: '' }))
  );
  // Estado global de usuários
  const [userLimit, setUserLimit] = useState('');
  const [userExtraPrice, setUserExtraPrice] = useState('');
  // Estado WhatsApp
  const [waUserLimit, setWaUserLimit] = useState('');
  const [waUserExtraPrice, setWaUserExtraPrice] = useState('');
  const [waMsgLimit, setWaMsgLimit] = useState('');
  const [waMsgExtraPrice, setWaMsgExtraPrice] = useState('');
  // Estado cupom
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('');
  const [saving, setSaving] = useState(false);

  const handleModuleChange = (id: string, value: string) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, price: value } : m));
  };

  const handleSave = () => {
    setSaving(true);
    // Aqui você pode integrar com API futuramente
    setTimeout(() => setSaving(false), 1000);
    alert('Valores salvos!');
  };

  return (
    <div className="space-y-10 max-w-3xl mx-auto pb-20">
      <div>
        <h1 className="text-3xl font-black text-slate-100 tracking-tighter uppercase flex items-center gap-3">
          Planos Vidraçarias
        </h1>
        <p className="text-slate-500 font-medium mt-2">Configure valores dos módulos, limites e adicionais exclusivos para o segmento de vidraçarias.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase">Módulos Opcionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {modules.map(mod => (
            <div key={mod.id} className="flex items-center gap-4">
              <span className="font-bold text-white min-w-[120px]">{mod.label}</span>
              <Input
                type="number"
                placeholder="Valor mensal (R$)"
                className="w-40 bg-slate-900 border-slate-700 text-white"
                value={mod.price}
                onChange={e => handleModuleChange(mod.id, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase">Limite de Usuários do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="text-white">Limite de usuários</Label>
            <Input
              type="number"
              className="w-24 bg-slate-900 border-slate-700 text-white"
              value={userLimit}
              onChange={e => setUserLimit(e.target.value)}
            />
            <Label className="text-white">Valor por usuário adicional (R$)</Label>
            <Input
              type="number"
              className="w-24 bg-slate-900 border-slate-700 text-white"
              value={userExtraPrice}
              onChange={e => setUserExtraPrice(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase">WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Label className="text-white">Limite de usuários</Label>
            <Input
              type="number"
              className="w-20 bg-slate-900 border-slate-700 text-white"
              value={waUserLimit}
              onChange={e => setWaUserLimit(e.target.value)}
            />
            <Label className="text-white">Valor por usuário adicional (R$)</Label>
            <Input
              type="number"
              className="w-20 bg-slate-900 border-slate-700 text-white"
              value={waUserExtraPrice}
              onChange={e => setWaUserExtraPrice(e.target.value)}
            />
            <Label className="text-white">Limite de mensagens</Label>
            <Input
              type="number"
              className="w-20 bg-slate-900 border-slate-700 text-white"
              value={waMsgLimit}
              onChange={e => setWaMsgLimit(e.target.value)}
            />
            <Label className="text-white">Valor por mensagem adicional (R$)</Label>
            <Input
              type="number"
              className="w-20 bg-slate-900 border-slate-700 text-white"
              value={waMsgExtraPrice}
              onChange={e => setWaMsgExtraPrice(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 mt-8">
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs h-11">
          {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save size={16} className="mr-2" />} Salvar Tudo
        </Button>
        <Button variant="outline" className="border-amber-500 text-amber-500 font-black uppercase tracking-widest text-xs h-11 flex items-center gap-2" onClick={() => setShowCoupon(v => !v)}>
          <Percent size={16} /> {showCoupon ? 'Fechar Cupons' : 'Cupons'}
        </Button>
      </div>

      {showCoupon && (
        <Card className="mt-4 border-amber-500">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase text-amber-500">Gerenciar Cupom</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="text-white">Código do Cupom</Label>
              <Input
                className="w-40 bg-slate-900 border-slate-700 text-white"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
              />
              <Label className="text-white">Desconto (%)</Label>
              <Input
                type="number"
                className="w-24 bg-slate-900 border-slate-700 text-white"
                value={couponDiscount}
                onChange={e => setCouponDiscount(e.target.value)}
              />
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-black uppercase tracking-widest text-xs h-10">Salvar Cupom</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
