// Página exclusiva para gestão de planos das vidraçarias
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Loader2, Percent } from 'lucide-react';

// Módulos reais conforme tela de configuração
const GLASS_MODULES = [
  { id: 'visao_geral', label: 'Visão Geral' },
  { id: 'pessoas', label: 'Pessoas' },
  { id: 'orcamentos', label: 'Orçamentos' },
  { id: 'materiais', label: 'Materiais' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'crm', label: 'CRM' },
  { id: 'ordens_servico', label: 'Ordens de Serviço' },
  { id: 'producao', label: 'Produção' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'configuracoes', label: 'Configurações' },
];

export default function VidracariasPlansPage() {
  // Estado dos módulos do plano básico (checkboxes)
  const [basicModules, setBasicModules] = useState(() =>
    GLASS_MODULES.map(mod => ({ ...mod, included: mod.id === 'visao_geral' }))
  );
  const [modules, setModules] = useState(() =>
    GLASS_MODULES.map(mod => ({ ...mod, price: '' }))
  );
  const [basicPrice, setBasicPrice] = useState('');
  const [userLimit, setUserLimit] = useState('');
  const [userExtraPrice, setUserExtraPrice] = useState('');
  const [waUserLimit, setWaUserLimit] = useState('');
  const [waUserExtraPrice, setWaUserExtraPrice] = useState('');
  const [waMsgLimit, setWaMsgLimit] = useState('');
  const [waMsgExtraPrice, setWaMsgExtraPrice] = useState('');
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('');
  const [saving, setSaving] = useState(false);

  const handleModuleChange = (id, value) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, price: value } : m));
  };
  const handleBasicModuleToggle = (id) => {
    setBasicModules(prev => prev.map(m => m.id === id ? { ...m, included: !m.included } : m));
  };




  return (
    <div className="space-y-6 max-w-4xl mx-auto px-2 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase flex items-center gap-3 drop-shadow-lg">
            Planos Vidraçarias
          </h1>
          <p className="text-white font-medium mt-2">Configure valores dos módulos, limites e adicionais exclusivos para o segmento de vidraçarias.</p>
        </div>
        <button
          className="bg-white text-blue-900 font-black uppercase tracking-widest text-sm px-6 py-2 rounded-xl shadow hover:bg-blue-100 transition-all border border-blue-200"
          onClick={() => window.history.back()}
        >
          Voltar
        </button>
      </div>

      <div className="bg-slate-950/90 border border-blue-900 shadow-2xl rounded-2xl p-4 w-full">
        <div className="mb-3 flex items-center gap-4">
          <div className="flex flex-col gap-1 w-56">
            <label className="text-white font-black uppercase text-sm">Valor do Plano Básico</label>
            <input
              type="number"
              placeholder="Valor mensal do plano básico (R$)"
              className="w-full bg-slate-900 border border-blue-800 text-white font-bold px-2 py-1 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-white/60"
              value={basicPrice}
              onChange={e => setBasicPrice(e.target.value)}
            />
          </div>
        </div>
        <div>
          <h2 className="text-sm font-black uppercase text-white mb-2">Módulos do Plano Básico</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {basicModules.map(mod => (
              <label key={mod.id} className="flex items-center gap-2 bg-slate-900 rounded p-2 border border-blue-900 text-white text-sm font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mod.included}
                  onChange={() => handleBasicModuleToggle(mod.id)}
                  className="w-4 h-4 accent-blue-600"
                  disabled={mod.id === 'visao_geral'}
                />
                {mod.label}
                {mod.id === 'visao_geral' && <span className="ml-2 px-2 py-0.5 rounded bg-blue-700 text-xs font-black uppercase">INCLUSO</span>}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <h2 className="text-sm font-black uppercase text-white mb-2">Módulos Opcionais (por vidraçaria)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {modules.map(mod => (
              <div key={mod.id} className="flex items-center gap-2 bg-slate-900 rounded p-2 border border-blue-900">
                <span className="font-bold text-white min-w-[110px] text-sm">{mod.label}</span>
                <input
                  type="number"
                  placeholder="Valor mensal"
                  className="w-24 bg-slate-900 border border-blue-800 text-white font-bold px-2 py-1 rounded focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-white/60 text-sm"
                  value={mod.price}
                  onChange={e => handleModuleChange(mod.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-950/90 border border-blue-900 shadow-xl rounded-2xl p-4 w-full">
        <h2 className="text-sm font-black uppercase text-white mb-2">Limite de Usuários do Sistema</h2>
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1 w-56">
            <label className="text-white font-bold text-sm">Limite de usuários</label>
            <input
              type="number"
              className="w-full bg-slate-900 border border-blue-800 text-white font-bold px-2 py-1 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder:text-white/60"
              value={userLimit}
              onChange={e => setUserLimit(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1 w-56">
            <label className="text-white font-bold text-sm">Valor por usuário adicional (R$)</label>
            <input
              type="number"
              className="w-full bg-slate-900 border border-blue-800 text-white font-bold px-2 py-1 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder:text-white/60"
              value={userExtraPrice}
              onChange={e => setUserExtraPrice(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-950/90 border border-blue-900 shadow-xl rounded-2xl p-4 w-full">
        <h2 className="text-sm font-black uppercase text-white mb-2">WhatsApp</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex flex-col gap-1 w-56">
            <label className="text-white font-bold text-sm">Limite de usuários</label>
            <input
              type="number"
              className="w-full bg-slate-900 border border-blue-800 text-white font-bold px-2 py-1 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder:text-white/60"
              value={waUserLimit}
              onChange={e => setWaUserLimit(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1 w-56">
            <label className="text-white font-bold text-sm">Valor por usuário adicional (R$)</label>
            <input
              type="number"
              className="w-full bg-slate-900 border border-blue-800 text-white font-bold px-2 py-1 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder:text-white/60"
              value={waUserExtraPrice}
              onChange={e => setWaUserExtraPrice(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1 w-56">
            <label className="text-white font-bold text-sm">Limite de mensagens</label>
            <input
              type="number"
              className="w-full bg-slate-900 border border-blue-800 text-white font-bold px-2 py-1 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder:text-white/60"
              value={waMsgLimit}
              onChange={e => setWaMsgLimit(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1 w-56">
            <label className="text-white font-bold text-sm">Valor por mensagem adicional (R$)</label>
            <input
              type="number"
              className="w-full bg-slate-900 border border-blue-800 text-white font-bold px-2 py-1 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder:text-white/60"
              value={waMsgExtraPrice}
              onChange={e => setWaMsgExtraPrice(e.target.value)}
            />
          </div>
        </div>
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
