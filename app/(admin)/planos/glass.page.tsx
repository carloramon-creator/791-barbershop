import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ALL_MODULES } from '@/lib/modules';

export default function GlassPlansPage() {
  // Estado para valores dos módulos
  const [modules, setModules] = useState(() =>
    ALL_MODULES.map(mod => ({
      ...mod,
      price: '',
      whatsapp: mod.id === 'whatsapp' ? {
        maxUsers: '',
        pricePerUser: '',
        maxMessages: '',
        pricePerMessage: '',
        planPrice: '',
        planUsers: '',
        planMessages: '',
      } : undefined
    }))
  );

  const handleModuleChange = (id: string, field: string, value: string) => {
    setModules(prev => prev.map(m =>
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleWhatsappChange = (field: string, value: string) => {
    setModules(prev => prev.map(m => {
      if (m.id !== 'whatsapp') return m;
      // Garante que todos os campos existem como string
      const w = m.whatsapp || {
        maxUsers: '',
        pricePerUser: '',
        maxMessages: '',
        pricePerMessage: '',
        planPrice: '',
        planUsers: '',
        planMessages: '',
      };
      return {
        ...m,
        whatsapp: {
          maxUsers: field === 'maxUsers' ? value : w.maxUsers,
          pricePerUser: field === 'pricePerUser' ? value : w.pricePerUser,
          maxMessages: field === 'maxMessages' ? value : w.maxMessages,
          pricePerMessage: field === 'pricePerMessage' ? value : w.pricePerMessage,
          planPrice: field === 'planPrice' ? value : w.planPrice,
          planUsers: field === 'planUsers' ? value : w.planUsers,
          planMessages: field === 'planMessages' ? value : w.planMessages,
        }
      };
    }));
  };

  const handleSave = () => {
    // Salvar lógica (API ou local)
    alert('Valores salvos!');
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase">Planos e Valores - 791glass</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {modules.map(mod => (
            <div key={mod.id} className="flex flex-col gap-2 border-b border-slate-800 pb-4 mb-2">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white text-[15px] uppercase min-w-[160px]">{mod.label}</span>
                {mod.id === 'whatsapp' ? (
                  <>
                    <span className="text-xs text-blue-300 font-bold ml-2">WhatsApp</span>
                  </>
                ) : (
                  <Input
                    type="number"
                    placeholder="Valor mensal (R$)"
                    className="w-40 bg-slate-900 border-slate-700 text-white"
                    value={mod.price}
                    onChange={e => handleModuleChange(mod.id, 'price', e.target.value)}
                  />
                )}
              </div>
              {mod.id === 'whatsapp' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-blue-200 font-bold whitespace-nowrap">Qtd. Máx. Usuários</label>
                    <Input
                      type="number"
                      className="w-24 bg-slate-900 border-slate-700 text-white"
                      value={mod.whatsapp?.maxUsers || ''}
                      onChange={e => handleWhatsappChange('maxUsers', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-blue-200 font-bold whitespace-nowrap">Valor por usuário adicional (R$)</label>
                    <Input
                      type="number"
                      className="w-24 bg-slate-900 border-slate-700 text-white"
                      value={mod.whatsapp?.pricePerUser || ''}
                      onChange={e => handleWhatsappChange('pricePerUser', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-blue-200 font-bold whitespace-nowrap">Qtd. Mensagens do Plano</label>
                    <Input
                      type="number"
                      className="w-24 bg-slate-900 border-slate-700 text-white"
                      value={mod.whatsapp?.maxMessages || ''}
                      onChange={e => handleWhatsappChange('maxMessages', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-blue-200 font-bold whitespace-nowrap">Valor por mensagem adicional (R$)</label>
                    <Input
                      type="number"
                      className="w-24 bg-slate-900 border-slate-700 text-white"
                      value={mod.whatsapp?.pricePerMessage || ''}
                      onChange={e => handleWhatsappChange('pricePerMessage', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-blue-200 font-bold whitespace-nowrap">Valor do Plano WhatsApp (R$)</label>
                    <Input
                      type="number"
                      className="w-24 bg-slate-900 border-slate-700 text-white"
                      value={mod.whatsapp?.planPrice || ''}
                      onChange={e => handleWhatsappChange('planPrice', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-blue-200 font-bold whitespace-nowrap">Inclui X usuários</label>
                    <Input
                      type="number"
                      className="w-16 bg-slate-900 border-slate-700 text-white"
                      value={mod.whatsapp?.planUsers || ''}
                      onChange={e => handleWhatsappChange('planUsers', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-blue-200 font-bold whitespace-nowrap">Inclui X mensagens</label>
                    <Input
                      type="number"
                      className="w-16 bg-slate-900 border-slate-700 text-white"
                      value={mod.whatsapp?.planMessages || ''}
                      onChange={e => handleWhatsappChange('planMessages', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white text-[13px] uppercase font-bold">Salvar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
