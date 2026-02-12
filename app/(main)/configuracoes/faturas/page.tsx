"use client";

import React, { useState, useEffect } from "react";
import {
    FileText,
    Activity,
    Zap,
    FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/supabase-client";

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(true);

    useEffect(() => {
        fetchInvoices();
    }, []);

    async function fetchInvoices() {
        try {
            setLoadingInvoices(true);
            const {
                data: { session },
            } = await supabaseClient.auth.getSession();
            if (!session) return;

            const res = await fetch("/api/barbershop/invoices", {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });
            const data = await res.json();
            if (data.invoices) {
                setInvoices(data.invoices);
            }
        } catch (err) {
            console.error("Erro ao buscar faturas:", err);
        } finally {
            setLoadingInvoices(false);
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500/10 p-2 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">
                            Histórico de Faturas
                        </h2>
                        <p className="text-xs text-slate-500">
                            Acompanhe seus pagamentos e baixe boletos anteriores.
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchInvoices}
                    className="text-xs font-bold uppercase tracking-widest"
                >
                    Atualizar
                </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm shadow-xl">
                {loadingInvoices ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-slate-500 uppercase text-[10px] font-black tracking-widest">
                            Carregando faturas...
                        </span>
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
                        <FileText className="w-12 h-12 text-slate-800" />
                        <div className="text-slate-600 uppercase text-[10px] font-black tracking-widest">
                            Nenhuma fatura encontrada.
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950/50 border-b border-slate-800">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        Data
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        Descrição
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        Método
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        Valor
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {invoices.map((inv) => (
                                    <tr
                                        key={inv.id}
                                        className="hover:bg-slate-800/30 transition-colors"
                                    >
                                        <td className="px-6 py-4 text-xs text-slate-400">
                                            {(() => {
                                                const dateStr = inv.date;
                                                if (!dateStr) return "---";
                                                if (dateStr.length === 10) {
                                                    const [y, m, d] = dateStr.split("-");
                                                    return `${d}/${m}/${y}`;
                                                }
                                                return new Date(dateStr).toLocaleDateString(
                                                    "pt-BR",
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-bold text-slate-200">
                                                {inv.description}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-mono">
                                                ID:{" "}
                                                {inv.metadata?.nosso_numero || inv.id.slice(0, 8)}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {inv.metadata?.method === "pix_inter" ? (
                                                    <span className="flex items-center gap-1 font-black text-[9px] text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-tighter">
                                                        <Zap className="w-2.5 h-2.5" /> Pix
                                                    </span>
                                                ) : inv.metadata?.method === "boleto_inter" ? (
                                                    <span className="flex items-center gap-1 font-black text-[9px] text-blue-500 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-tighter">
                                                        <FileText className="w-2.5 h-2.5" /> Boleto
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-500 uppercase">
                                                        Cartão
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-black text-slate-200">
                                            R$ {(inv.value || 0).toFixed(2).replace(".", ",")}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {inv.is_paid ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase">
                                                    Pago
                                                </span>
                                            ) : inv.metadata?.status_inter === "CANCELADO" ||
                                                inv.metadata?.status_inter === "EXPIRADO" ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase">
                                                    Cancelado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">
                                                    Pendente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-left whitespace-nowrap">
                                            <div className="flex items-center justify-start gap-3">
                                                {!inv.is_paid &&
                                                    (inv.metadata?.method === "boleto_inter" ||
                                                        inv.metadata?.method === "pix_inter") &&
                                                    inv.metadata?.status_inter !== "CANCELADO" &&
                                                    inv.metadata?.status_inter !== "EXPIRADO" && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 text-[10px] font-black uppercase"
                                                                onClick={async () => {
                                                                    if (
                                                                        !confirm(
                                                                            "Verificar status do pagamento no banco agora?",
                                                                        )
                                                                    )
                                                                        return;
                                                                    try {
                                                                        const seuNumero =
                                                                            inv.metadata.seu_numero;
                                                                        const txid = inv.metadata.txid;

                                                                        if (txid) {
                                                                            const debugRes = await fetch(
                                                                                `/api/debug/force-check?txid=${txid}`,
                                                                            );
                                                                            const debugData =
                                                                                await debugRes.json();
                                                                            if (
                                                                                debugData?.updatedIsPaid ||
                                                                                debugData?.updated
                                                                            ) {
                                                                                alert("Status Atualizado! 🚀");
                                                                                fetchInvoices();
                                                                                return;
                                                                            }
                                                                        }

                                                                        if (seuNumero) {
                                                                            const res = await fetch(
                                                                                `/api/barbershop/check-pending-payment?seu_numero=${seuNumero}`,
                                                                            );
                                                                            const data = await res.json();
                                                                            if (
                                                                                data.ready ||
                                                                                data.statusUpdated
                                                                            ) {
                                                                                fetchInvoices();
                                                                            } else {
                                                                                alert('Ainda consta como pendente no banco.');
                                                                            }
                                                                        }
                                                                    } catch (e: any) {
                                                                        console.error(e);
                                                                    }
                                                                }}
                                                            >
                                                                <Activity className="w-3 h-3 mr-1" />{" "}
                                                                Check
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 text-[10px] font-black uppercase"
                                                                onClick={() => {
                                                                    const codigoSolicitacao =
                                                                        inv.metadata?.txid;
                                                                    const nossoNumero =
                                                                        inv.metadata?.nosso_numero || "";
                                                                    const url = codigoSolicitacao
                                                                        ? `/api/checkout/inter-boleto/pdf?codigoSolicitacao=${codigoSolicitacao}&nossoNumero=${nossoNumero}`
                                                                        : `/api/checkout/inter-boleto/pdf?nossoNumero=${nossoNumero}`;
                                                                    window.open(url, "_blank");
                                                                }}
                                                            >
                                                                <FileText className="w-3 h-3 mr-1" />{" "}
                                                                PDF ou Pix
                                                            </Button>
                                                        </>
                                                    )}

                                                {inv.is_paid && !inv.metadata?.nfe_id && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 text-[10px] font-black uppercase"
                                                        onClick={async () => {
                                                            if (
                                                                !confirm(
                                                                    "Deseja emitir a NFS-e Nacional para este pagamento agora?",
                                                                )
                                                            )
                                                                return;
                                                            try {
                                                                const {
                                                                    data: { session },
                                                                } =
                                                                    await supabaseClient.auth.getSession();
                                                                if (!session) return;

                                                                const res = await fetch(
                                                                    "/api/barbershop/invoices/emit-nfse",
                                                                    {
                                                                        method: "POST",
                                                                        headers: {
                                                                            "Content-Type": "application/json",
                                                                            Authorization: `Bearer ${session.access_token}`,
                                                                        },
                                                                        body: JSON.stringify({
                                                                            financeId: inv.id,
                                                                        }),
                                                                    },
                                                                );

                                                                const data = await res.json();
                                                                if (!res.ok) throw new Error(data.error);

                                                                alert(
                                                                    "NFS-e emitida com sucesso! A página será atualizada.",
                                                                );
                                                                fetchInvoices();
                                                            } catch (e: any) {
                                                                alert("Erro ao emitir: " + e.message);
                                                            }
                                                        }}
                                                    >
                                                        <FileCheck className="w-3 h-3 mr-1" /> Emitir
                                                        NFS-e
                                                    </Button>
                                                )}

                                                {inv.metadata?.nfe_id && (
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-black uppercase"
                                                    >
                                                        <a
                                                            href={(() => {
                                                                if (!inv.metadata?.nfe_pdf_url) return "#";
                                                                const baseUrl = inv.metadata.nfe_pdf_url.startsWith('http')
                                                                    ? inv.metadata.nfe_pdf_url
                                                                    : (typeof window !== 'undefined' ? `${window.location.origin}${inv.metadata.nfe_pdf_url}` : inv.metadata.nfe_pdf_url);

                                                                return baseUrl.includes("/nfse/pdf")
                                                                    ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}id=${inv.id}`
                                                                    : baseUrl;
                                                            })()}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => {
                                                                if (e.currentTarget.getAttribute('href') === "#") {
                                                                    e.preventDefault();
                                                                    alert("Nota fiscal emitida! ID: " + inv.metadata.nfe_id);
                                                                } else {
                                                                    console.log(`[VER-NF] Abrindo link nativo: ${e.currentTarget.href}`);
                                                                }
                                                            }}
                                                        >
                                                            <FileCheck className="w-3 h-3 mr-1" /> Ver NF
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
