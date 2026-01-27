"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Package, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpsellModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    planSlug: string | null;
    addons: any[];
    selectedAddonsSlugs: string[];
    onAddonToggle: (slug: string) => void;
    onContinue: () => void;
}

export function UpsellModal({
    open,
    onOpenChange,
    planSlug,
    addons,
    selectedAddonsSlugs,
    onAddonToggle,
    onContinue,
}: UpsellModalProps) {
    const financeiroAddon = addons?.find(a =>
        a.slug === "financeiro" ||
        a.slug === "finance" ||
        a.name?.toLowerCase().includes("financeiro")
    );
    const estoqueAddon = addons?.find(a =>
        a.slug === "estoque" ||
        a.slug === "stock" ||
        a.name?.toLowerCase().includes("estoque")
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-2 border-blue-500/30 max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header com gradiente */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center relative overflow-hidden flex-shrink-0">
                    <div className="absolute inset-0 opacity-30" />
                    <div className="relative z-10">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                            <Zap className="w-7 h-7 text-white fill-white" />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">
                            Turbine Seu Plano!
                        </h2>
                        <p className="text-blue-100 font-medium text-xs">
                            Adicione módulos profissionais e maximize seus resultados
                        </p>
                    </div>
                </div>

                {/* Body - Scrollable */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-2">
                        <div className="w-7 h-7 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Package size={14} className="text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-white uppercase tracking-wide mb-0.5">
                                Você selecionou: {planSlug === "basic" ? "Plano Básico" : "Plano Completo"}
                            </h3>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                                {planSlug === "basic"
                                    ? "Ótima escolha para começar! Que tal adicionar recursos profissionais?"
                                    : "Excelente! Falta apenas o controle de estoque para ter tudo!"}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Módulos Recomendados para Você:
                        </h3>

                        {/* Módulo Financeiro (só para Básico) */}
                        {planSlug === "basic" && financeiroAddon && (
                            <div
                                onClick={() => onAddonToggle(financeiroAddon.slug)}
                                className={cn(
                                    "group cursor-pointer bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-2 rounded-xl p-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-emerald-500/20",
                                    selectedAddonsSlugs.includes(financeiroAddon.slug)
                                        ? "border-emerald-500 ring-2 ring-emerald-500/20"
                                        : "border-emerald-500/30 hover:border-emerald-500/60"
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-7 h-7 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                                <Zap size={14} className="text-emerald-400" />
                                            </div>
                                            <h4 className="text-sm font-black text-white uppercase tracking-tight">
                                                {financeiroAddon.name}
                                            </h4>
                                            {selectedAddonsSlugs.includes(financeiroAddon.slug) && (
                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-relaxed mb-2">
                                            Controle completo de caixa, despesas e faturamento. Relatórios profissionais e gestão financeira inteligente.
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-black text-emerald-400">
                                                R$ {Number(financeiroAddon.price || 0).toFixed(2).replace(".", ",")}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-bold">/mês</span>
                                            <span className="ml-auto px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase rounded-full">
                                                Recomendado
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Módulo Estoque (para Básico e Completo) */}
                        {estoqueAddon && (
                            <div
                                onClick={() => onAddonToggle(estoqueAddon.slug)}
                                className={cn(
                                    "group cursor-pointer bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-2 rounded-xl p-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-amber-500/20",
                                    selectedAddonsSlugs.includes(estoqueAddon.slug)
                                        ? "border-amber-500 ring-2 ring-amber-500/20"
                                        : "border-amber-500/30 hover:border-amber-500/60"
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-7 h-7 bg-amber-500/20 rounded-lg flex items-center justify-center">
                                                <Package size={14} className="text-amber-400" />
                                            </div>
                                            <h4 className="text-sm font-black text-white uppercase tracking-tight">
                                                {estoqueAddon.name}
                                            </h4>
                                            {selectedAddonsSlugs.includes(estoqueAddon.slug) && (
                                                <CheckCircle2 size={14} className="text-amber-500" />
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-relaxed mb-2">
                                            Gestão de produtos, controle de estoque e suprimentos. Nunca mais fique sem produtos essenciais!
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-black text-amber-400">
                                                R$ {Number(estoqueAddon.price || 0).toFixed(2).replace(".", ",")}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-bold">/mês</span>
                                            <span className="ml-auto px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase rounded-full">
                                                Recomendado
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer com ações - Sticky */}
                <div className="flex gap-2 p-4 border-t border-white/5 bg-slate-900 flex-shrink-0">
                    <Button
                        onClick={() => onOpenChange(false)}
                        variant="outline"
                        className="flex-1 h-10 border-white/10 text-slate-400 hover:text-white hover:bg-white/5 font-bold uppercase text-[10px]"
                    >
                        Não, Obrigado
                    </Button>
                    <Button
                        onClick={onContinue}
                        className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black uppercase text-[10px] shadow-lg shadow-blue-500/20"
                    >
                        {selectedAddonsSlugs.length > 0 ? "Continuar com Módulos" : "Continuar sem Módulos"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
