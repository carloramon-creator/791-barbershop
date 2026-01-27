"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Package, CheckCircle2, TrendingDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpsellModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    planSlug: string | null;
    planPrice: number;
    addons: any[];
    selectedAddonsSlugs: string[];
    selectedInterval: number;
    onAddonToggle: (slug: string) => void;
    onIntervalChange: (interval: number) => void;
    onContinue: () => void;
}

export function UpsellModal({
    open,
    onOpenChange,
    planSlug,
    planPrice,
    addons,
    selectedAddonsSlugs,
    selectedInterval,
    onAddonToggle,
    onIntervalChange,
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

    // Calcular desconto baseado no intervalo
    const getDiscount = (interval: number) => {
        if (interval === 12) return 20;
        if (interval === 6) return 10;
        return 0;
    };

    const discount = getDiscount(selectedInterval);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-2 border-blue-500/30 max-w-2xl p-0 overflow-hidden max-h-[95vh] flex flex-col">
                {/* Header Compacto */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-center relative overflow-hidden flex-shrink-0">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                    <div className="relative z-10 flex items-center justify-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Zap className="w-5 h-5 text-white fill-white" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none mb-1">
                                Turbine Seu Plano!
                            </h2>
                            <p className="text-blue-100 font-medium text-[10px] opacity-80">
                                Adicione módulos e economize com planos anuais
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body - Scrollable if needed */}
                <div className="p-4 space-y-4 overflow-y-auto flex-1">
                    {/* Seleção de Intervalo (Mais Compacto) */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: "Mensal", interval: 1, discount: 0, color: "blue" },
                            { label: "Semestral", interval: 6, discount: 10, color: "emerald" },
                            { label: "Anual", interval: 12, discount: 20, color: "amber" },
                        ].map((item) => {
                            const isActive = selectedInterval === item.interval;
                            const monthlyValue = planPrice * (1 - item.discount / 100);
                            const colorClass = item.color === "blue" ? "blue" : item.color === "emerald" ? "emerald" : "amber";

                            return (
                                <button
                                    key={item.interval}
                                    onClick={() => onIntervalChange(item.interval)}
                                    className={cn(
                                        "relative p-2 rounded-xl border-2 transition-all duration-300",
                                        isActive
                                            ? `border-${colorClass}-500 bg-${colorClass}-500/10 ring-2 ring-${colorClass}-500/20`
                                            : "border-slate-800 bg-slate-800/40 hover:border-slate-700"
                                    )}
                                >
                                    {item.discount > 0 && (
                                        <div className={cn(
                                            "absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full text-[8px] font-black text-white",
                                            item.color === "emerald" ? "bg-emerald-500" : "bg-amber-500"
                                        )}>
                                            -{item.discount}%
                                        </div>
                                    )}
                                    <div className="text-center">
                                        <div className="text-[9px] font-black text-slate-400 uppercase mb-0.5">{item.label}</div>
                                        <div className={cn(
                                            "text-sm font-black",
                                            isActive ? `text-${colorClass}-400` : "text-white"
                                        )}>
                                            R$ {monthlyValue.toFixed(2).replace(".", ",")}
                                        </div>
                                        <div className="text-[8px] text-slate-500">/mês</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Módulos Lado a Lado */}
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                            Turbine com os Módulos:
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Módulo Financeiro */}
                            {planSlug === "basic" && financeiroAddon && (
                                <div
                                    onClick={() => onAddonToggle(financeiroAddon.slug)}
                                    className={cn(
                                        "group cursor-pointer border-2 rounded-2xl p-3 transition-all duration-300 relative overflow-hidden flex flex-col h-full",
                                        selectedAddonsSlugs.includes(financeiroAddon.slug)
                                            ? "border-emerald-500/60 bg-emerald-500/10 ring-4 ring-emerald-500/5 shadow-lg shadow-emerald-500/10"
                                            : "border-slate-800 bg-slate-800/30 hover:border-slate-700 hover:bg-slate-800/50"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                                            selectedAddonsSlugs.includes(financeiroAddon.slug) ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"
                                        )}>
                                            <Zap size={14} />
                                        </div>
                                        <h4 className="text-[11px] font-black text-white uppercase leading-tight">
                                            Financeiro
                                        </h4>
                                        {selectedAddonsSlugs.includes(financeiroAddon.slug) && (
                                            <CheckCircle2 size={12} className="text-emerald-500 ml-auto" />
                                        )}
                                    </div>

                                    <p className="text-[9px] text-slate-500 leading-tight mb-3 line-clamp-2">
                                        Controle de caixa, despesas e faturamento profissional.
                                    </p>

                                    <div className="mt-auto pt-2 border-t border-white/5 space-y-1">
                                        <div className="text-[8px] text-slate-500 font-bold">
                                            TOTAL: R$ {(Number(financeiroAddon.price || 0) * (1 - discount / 100) * selectedInterval).toFixed(2).replace(".", ",")}
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-sm font-black text-emerald-400">
                                                {selectedInterval}x
                                            </span>
                                            <span className="text-[10px] text-slate-400">de</span>
                                            <span className="text-lg font-black text-emerald-400">
                                                R$ {(Number(financeiroAddon.price || 0) * (1 - discount / 100)).toFixed(2).replace(".", ",")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Módulo Estoque */}
                            {estoqueAddon && (
                                <div
                                    onClick={() => onAddonToggle(estoqueAddon.slug)}
                                    className={cn(
                                        "group cursor-pointer border-2 rounded-2xl p-3 transition-all duration-300 relative overflow-hidden flex flex-col h-full",
                                        selectedAddonsSlugs.includes(estoqueAddon.slug)
                                            ? "border-amber-500/60 bg-amber-500/10 ring-4 ring-amber-500/5 shadow-lg shadow-amber-500/10"
                                            : "border-slate-800 bg-slate-800/30 hover:border-slate-700 hover:bg-slate-800/50"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                                            selectedAddonsSlugs.includes(estoqueAddon.slug) ? "bg-amber-500 text-white" : "bg-slate-700 text-slate-400"
                                        )}>
                                            <Package size={14} />
                                        </div>
                                        <h4 className="text-[11px] font-black text-white uppercase leading-tight">
                                            Estoque
                                        </h4>
                                        {selectedAddonsSlugs.includes(estoqueAddon.slug) && (
                                            <CheckCircle2 size={12} className="text-amber-500 ml-auto" />
                                        )}
                                    </div>

                                    <p className="text-[9px] text-slate-500 leading-tight mb-3 line-clamp-2">
                                        Gestão de produtos e controle absoluto de suprimentos.
                                    </p>

                                    <div className="mt-auto pt-2 border-t border-white/5 space-y-1">
                                        <div className="text-[8px] text-slate-500 font-bold">
                                            TOTAL: R$ {(Number(estoqueAddon.price || 0) * (1 - discount / 100) * selectedInterval).toFixed(2).replace(".", ",")}
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-sm font-black text-amber-400">
                                                {selectedInterval}x
                                            </span>
                                            <span className="text-[10px] text-slate-400">de</span>
                                            <span className="text-lg font-black text-amber-400">
                                                R$ {(Number(estoqueAddon.price || 0) * (1 - discount / 100)).toFixed(2).replace(".", ",")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-slate-900 flex flex-col gap-3">
                    <div className="flex items-center justify-between px-2">
                        <div className="text-[10px] text-slate-400 font-bold">
                            VALOR MENSAL ESTIMADO:
                        </div>
                        <div className="text-xl font-black text-white flex items-baseline gap-1">
                            <span className="text-[10px] text-blue-400">R$</span>
                            {(
                                (planPrice * (1 - discount / 100)) +
                                selectedAddonsSlugs.reduce((acc, slug) => {
                                    const addon = addons?.find(a => a.slug === slug);
                                    return acc + (Number(addon?.price || 0) * (1 - discount / 100));
                                }, 0)
                            ).toFixed(2).replace(".", ",")}
                            <span className="text-[10px] text-slate-500 uppercase">/mês</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={() => onOpenChange(false)}
                            variant="outline"
                            className="flex-1 h-12 border-slate-800 text-slate-500 hover:text-white hover:bg-slate-800 font-black uppercase text-[10px]"
                        >
                            Agora não
                        </Button>
                        <Button
                            onClick={onContinue}
                            className="flex-[2] h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] shadow-xl shadow-blue-500/20 group"
                        >
                            <span>Continuar e Assinar</span>
                            <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
