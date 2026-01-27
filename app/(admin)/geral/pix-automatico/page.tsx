'use client';

import React, { useState, useEffect } from 'react';
import {
    Zap,
    RefreshCw,
    Calendar,
    Building2,
    User,
    CheckCircle2,
    Clock,
    AlertCircle,
    ArrowUpRight,
    Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function PixAutomaticoPage() {
    const [agreements, setAgreements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchAgreements = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/inter/recurrence-agreements?days=90');
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            // O Inter retorna em data.rec ou algo similar conforme a versão
            const list = data.parametros?.paginacao?.quantidadeRegistros > 0 ? (data.rec || []) : [];
            setAgreements(list);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgreements();
    }, []);

    const filteredAgreements = agreements.filter(acc =>
        acc.vinculo?.devedor?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.identificador?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <Zap className="text-blue-500 w-10 h-10" fill="currentColor" />
                        Pix Automático
                    </h1>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">
                        Gestão de Contratos e Recorrências Inter
                    </p>
                </div>
                <Button
                    onClick={fetchAgreements}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest h-12 px-6 rounded-xl gap-2"
                >
                    <RefreshCw className={loading ? "animate-spin" : ""} size={18} />
                    Sincronizar Banco
                </Button>
            </div>

            <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-800 bg-slate-900/50 p-6">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <Input
                                placeholder="Buscar por cliente ou ID do contrato..."
                                className="pl-10 h-12 bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus:ring-blue-500/20"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center space-y-4">
                            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
                            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Buscando contratos no Inter...</p>
                        </div>
                    ) : error ? (
                        <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center">
                            <AlertCircle className="w-12 h-12 text-red-500" />
                            <div className="space-y-1">
                                <p className="text-white font-black uppercase tracking-widest text-sm">Falha na Sincronização</p>
                                <p className="text-slate-500 text-xs font-bold">{error}</p>
                            </div>
                            <Button variant="outline" onClick={fetchAgreements} className="border-slate-800 text-slate-400 hover:text-white uppercase text-[10px] font-black tracking-widest">Tentar Novamente</Button>
                        </div>
                    ) : filteredAgreements.length === 0 ? (
                        <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center">
                            <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-600">
                                <Zap size={32} />
                            </div>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum contrato ativo encontrado.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-950/50">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Contrato / Cliente</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Periodicidade</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Valor Rec.</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Data Inicial</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {filteredAgreements.map((acc: any) => (
                                        <tr key={acc.identificador} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                                        <User size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-white uppercase tracking-tight">{acc.vinculo?.devedor?.nome}</p>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">{acc.identificador}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge className="bg-slate-800 text-slate-300 font-black uppercase text-[9px] tracking-widest border-none">
                                                    {acc.calendario?.periodicidade || 'MENSAL'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-black text-emerald-500 uppercase">
                                                    R$ {Number(acc.valor?.valorRec || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                                                    <Calendar size={14} className="text-slate-600" />
                                                    {acc.calendario?.dataInicial}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${acc.status === 'ATIVO' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                                                        {acc.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button size="sm" variant="ghost" className="text-slate-500 hover:text-white hover:bg-white/5 gap-2 font-black uppercase text-[10px] tracking-widest">
                                                    Detalhes
                                                    <ArrowUpRight size={14} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900 border-slate-800 p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Contratos Ativos</p>
                            <p className="text-2xl font-black text-white">{agreements.filter(a => a.status === 'ATIVO').length}</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-slate-900 border-slate-800 p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                            <Zap size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Próximos Ciclos</p>
                            <p className="text-2xl font-black text-white">Automático</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-slate-900 border-slate-800 p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Adesões Recentes</p>
                            <p className="text-2xl font-black text-white">{agreements.filter(a => {
                                const start = new Date(a.calendario?.dataInicial);
                                const today = new Date();
                                return (today.getTime() - start.getTime()) / (1000 * 3600 * 24) <= 7;
                            }).length}</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
