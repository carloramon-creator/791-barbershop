"use client";

// RAILWAY MIGRATION TRIGGER - GOL DA VITÓRIA ⚽
import React, { useState, useEffect } from "react";
import {
  Users,
  Building2,
  CreditCard,
  Check,
  Shield,
  FileText,
  ExternalLink,
  Copy,
  Activity,
  Zap,
  FileCheck,
  CheckCircle2,
  Package,
  ArrowRight,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Api } from "@/lib/api";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import AsaasCheckoutModal from "@/components/asaas/AsaasCheckoutModal";
import { supabaseClient } from "@/lib/supabase-client";
import { UpsellModal } from "@/components/upsell-modal";

// Use NEXT_PUBLIC_BACKEND_URL if set, else fallback.
// Hardcoding production URL to ensure immediate fix
const API_URL = "";

export default function PlanPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("expired") === "true";

  const [dynamicPlans, setDynamicPlans] = useState<any[]>([]);
  const [dynamicAddons, setDynamicAddons] = useState<any[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>("basic");
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedAddonsSlugs, setSelectedAddonsSlugs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "card" | "pix" | "boleto-inter" | "boleto-result" | "pix-result"
  >("card");
  const [couponCode, setCouponCode] = useState("");
  const [pixData, setPixData] = useState<{
    pixPayload: string;
    amount: number;
    expiresAt: string;
    pdfUrl?: string;
  } | null>(null);
  const [boletoData, setBoletoData] = useState<{
    nossoNumero: string;
    codigoBarras: string;
    linhaDigitavel: string;
    pdfUrl: string;
    amount?: number;
  } | null>(null);
  const [pendingData, setPendingData] = useState<{
    message: string;
    pending: boolean;
    seu_numero?: string;
    checkoutId?: string;
  } | null>(null);
  const [tenantHasDocument, setTenantHasDocument] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState<string | null>(null);
  const [asaasSubscriptionId, setAsaasSubscriptionId] = useState<string | null>(null);
  const [interRecurrenceId, setInterRecurrenceId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null,);
  const [activeAddons, setActiveAddons] = useState<string[]>([]);
  const [tenantCreatedAt, setTenantCreatedAt] = useState<string | null>(null);
  const [tenantObject, setTenantObject] = useState<any>(null);
  const [canceling, setCanceling] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<number>(1);
  const [checkingAsaasPayment, setCheckingAsaasPayment] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isPaymentExpanded, setIsPaymentExpanded] = useState(false);
  const paymentRef = React.useRef<HTMLDivElement>(null);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [upsellPlan, setUpsellPlan] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  // Refs para o polling universal (evitar stale closures)
  const pixDataRef = React.useRef(pixData);
  const boletoDataRef = React.useRef(boletoData);
  const pendingDataRef = React.useRef(pendingData);

  useEffect(() => { pixDataRef.current = pixData; }, [pixData]);
  useEffect(() => { boletoDataRef.current = boletoData; }, [boletoData]);
  useEffect(() => { pendingDataRef.current = pendingData; }, [pendingData]);

  // Monitorar se deve abrir automaticamente
  useEffect(() => {
    if (isPaymentExpanded && paymentRef.current) {
      paymentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isPaymentExpanded]);

  const tabs = [
    { name: "Geral", href: "/configuracoes/barbearia", icon: Building2 },
    { name: "Usuários", href: "/configuracoes/usuarios", icon: Users },
    { name: "Permissões", href: "/configuracoes/permissoes", icon: Shield },
    { name: "Plano", href: "/configuracoes/plano", icon: CreditCard },
  ];

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Chama tudo em paralelo (Planos do sistema, Invoices/Sync e Status atual)
        await Promise.all([
          (async () => {
            const [plans, addons] = await Promise.all([
              Api.getSystemPlans(),
              Api.getSystemAddons(),
            ]);
            setDynamicPlans(plans || []);
            setDynamicAddons(addons || []);
          })(),
          fetchInvoices(),
          fetchCurrentPlan(false),
        ]);
      } catch (e) {
        console.error("Erro na inicialização:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Monitorar pagamento pendente do Asaas
  useEffect(() => {
    const checkPendingAsaasPayment = async (silent = false) => {
      const pendingStr = localStorage.getItem("asaas_pending_payment");
      if (!pendingStr) {
        if (!silent) setCheckingAsaasPayment(false);
        return;
      }

      try {
        if (!silent) setCheckingAsaasPayment(true);
        const pending = JSON.parse(pendingStr);
        const { paymentId, checkoutId, timestamp } = pending;

        // Verificar se não é muito antigo (máximo 30 minutos)
        const thirtyMinutes = 30 * 60 * 1000;
        if (Date.now() - timestamp > thirtyMinutes) {
          localStorage.removeItem("asaas_pending_payment");
          return;
        }

        console.log(
          `[ASAAS] Verificando pagamento pendente (${silent ? "SILENT" : "FULL"}):`,
          paymentId || checkoutId,
        );

        // Verificar status do pagamento
        const query = paymentId
          ? `paymentId=${paymentId}`
          : `checkoutId=${checkoutId}`;
        const res = await fetch(`/api/asaas/check-payment?${query}`);
        if (!res.ok) {
          console.error("[ASAAS] Erro ao verificar pagamento");
          return;
        }

        const data = await res.json();
        console.log("[ASAAS] Status do pagamento:", data.payment?.status);

        if (data.payment?.isPaid || data.payment?.localRecord?.isPaid) {
          // Pagamento confirmado!
          localStorage.removeItem("asaas_pending_payment");
          // Mostrar mensagem de sucesso
          alert("✅ Pagamento confirmado! Seu plano foi ativado com sucesso.");
          // Atualizar dados
          await fetchCurrentPlan();
          await fetchInvoices();
        } else {
          // Ainda pendente. Se for o primeiro check (full), avisamos que estamos monitorando
          console.log("[ASAAS] Pagamento ainda não consta como pago.");

          // Se já passou algum tempo e ainda não confirmou, paramos de "travar" a tela e deixamos só o log
          // mas mantemos no localStorage para o interval continuar (silenciosamente)
        }
      } catch (error) {
        console.error("[ASAAS] Erro ao verificar pagamento pendente:", error);
      } finally {
        if (!silent) setCheckingAsaasPayment(false);
      }
    };

    // Verificar imediatamente (com overlay) ao carregar a página
    checkPendingAsaasPayment(false);

    // Polling Universal: monitorar tanto Asaas quanto status da assinatura direta (para Inter/PIX e outros)
    const interval = setInterval(async () => {
      // 1. Check Asaas (via localStorage)
      const pendingStr = localStorage.getItem("asaas_pending_payment");
      if (pendingStr) {
        checkPendingAsaasPayment(true);
      }

      // 2. Check Subscription Status (Universal) - Resolve travamentos do Inter
      try {
        const res = await fetch("/api/tenant/subscription-status");
        if (res.ok) {
          const data = await res.json();
          if (data.subscription_status === "active") {
            // Se ativou, limpar todos os estados pendentes se houver algo ativo
            if (
              localStorage.getItem("asaas_pending_payment") ||
              pendingDataRef.current ||
              pixDataRef.current ||
              boletoDataRef.current
            ) {
              localStorage.removeItem("asaas_pending_payment");
              setCheckingAsaasPayment(false);
              setPendingData(null);
              setPixData(null);
              setBoletoData(null);
              setPaymentSuccess(true);

              await fetchCurrentPlan(false);
              await fetchInvoices();

              // Recarrega em 5s
              setTimeout(() => {
                window.location.reload();
              }, 5000);
            }
          }
        }
      } catch (err) {
        // silêncio é ouro no polling
      }
    }, 3000); // 3 segundos

    return () => clearInterval(interval);
  }, []);

  // Função para iniciar polling manualmente
  const startPaymentPolling = () => {
    // O polling já está rodando automaticamente no useEffect acima
    // Esta função apenas força uma verificação imediata
    const pendingStr = localStorage.getItem("asaas_pending_payment");
    if (pendingStr) {
      setCheckingAsaasPayment(true);
      // O interval do useEffect vai pegar automaticamente
    }
  };

  async function fetchCurrentPlan(shouldSetLoading = true) {
    try {
      if (shouldSetLoading) setLoading(true);

      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      // Busca plano e detalhes do tenant em paralelo
      const [planRes, tenantRes] = await Promise.all([
        fetch(`${API_URL}/api/barbershop/plan`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`${API_URL}/api/barbershop`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      const [planData, tenantData] = await Promise.all([
        planRes.json(),
        tenantRes.json(),
      ]);

      if (!planRes.ok) throw new Error(planData.error);

      setCurrentPlan(planData.currentPlan || "trial");
      setStripeSubscriptionId(planData.stripeSubscriptionId);
      setAsaasSubscriptionId(planData.asaasSubscriptionId);
      setInterRecurrenceId(planData.interRecurrenceId);
      setSubscriptionStatus(planData.subscriptionStatus);
      setActiveAddons(planData.activeAddons || []);
      setTenantCreatedAt(tenantData.created_at);
      setTenantObject(tenantData);

      const doc = tenantData.cnpj || tenantData.cpf_cnpj || "";
      setTenantHasDocument(doc.replace(/\D/g, "").length >= 11);

      // NOVO: Buscar assinatura da tabela subscriptions
      const { data: subData } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenantData.id)
        .maybeSingle();

      setSubscriptionData(subData);

    } catch (err: unknown) {
      const errorObj = err as Error;
      console.error("Erro ao buscar plano:", errorObj.message);
      setError(errorObj.message);
    } finally {
      if (shouldSetLoading) setLoading(false);
    }
  }

  async function handleCancelSubscription() {
    if (!confirm("Tem certeza que deseja cancelar sua renovação automática? Você manterá acesso até o fim do período pago.")) return;

    try {
      setCanceling(true);
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao cancelar assinatura");
      }

      toast.success("Assinatura cancelada com sucesso!");
      fetchCurrentPlan(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCanceling(false);
    }
  }

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

  // --- POLLING PARA COBRANÇAS PENDENTES ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (pendingData?.pending) {
      console.log("[POLLING] Iniciando busca por cobrança processada...");
      interval = setInterval(async () => {
        try {
          const {
            data: { session },
          } = await supabaseClient.auth.getSession();
          if (!session) return;

          // Busca na tabela finance pelo seu_numero que salvamos no pending_data
          const pollRes = await fetch(
            `/api/barbershop/check-pending-payment?seu_numero=${pendingData.seu_numero}`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            },
          );

          if (pollRes.ok) {
            const data = await pollRes.json();
            if (data.ready) {
              console.log("[POLLING] Cobrança encontrada e pronta!");
              if (data.type === "pix") {
                setPixData(data.payload);
                setPaymentMethod("pix-result");
              } else {
                setBoletoData(data.payload);
                setPaymentMethod("boleto-result");
              }
              setPendingData(null);
              fetchInvoices(); // Atualiza o histórico assim que pronto!
            }
          }
        } catch (e) {
          console.error("[POLLING ERROR]", e);
        }
      }, 4000); // 4 segundos
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pendingData]);


  const [installments, setInstallments] = useState(1);

  const toggleAddon = (slug: string) => {
    setSelectedAddonsSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  async function handleChangePlan() {
    console.log("[DEBUG CHECKOUT] handleChangePlan triggered", { selectedPlan, selectedAddonsSlugs, paymentMethod, selectedInterval });
    if (!selectedPlan && selectedAddonsSlugs.length === 0) {
      setError("Por favor, selecione um plano ou módulo adicional.");
      return;
    }

    // Bloqueio inteligente de assinatura
    // PERMITIR LIVRE MUDANÇA SE:
    // 1. Estiver em trial/trialing (independente do plano ser premium)
    // 2. Estiver nos primeiros 10 dias (grace period)
    const now = new Date();
    const referenceDate = tenantCreatedAt ? new Date(tenantCreatedAt) : new Date();
    const diffDays = Math.ceil(Math.abs(now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
    const isTrialPeriod = ['trial', 'trialing'].includes(subscriptionStatus || '') || diffDays <= 10;

    if (currentPlan && currentPlan !== "trial" && !isTrialPeriod) {
      const planLevels: Record<string, number> = {
        "basic": 1,
        "complete": 2,
        "premium": 3
      };

      const currentLevel = planLevels[currentPlan] || 0;
      const selectedLevel = selectedPlan ? (planLevels[selectedPlan] || 0) : currentLevel;

      const isUpgrade = selectedLevel > currentLevel;
      const isSamePlan = selectedLevel === currentLevel;
      const addingNewAddons = selectedAddonsSlugs.some(slug => !activeAddons.includes(slug));

      if (!isUpgrade && isSamePlan && !addingNewAddons) {
        setError("Você já possui este plano. Para adicionar novos módulos, selecione-os acima.");
        return;
      }

      if (!isUpgrade && !isSamePlan) {
        setError("Para mudar para um plano inferior, entre em contato com nosso suporte.");
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      setPixData(null);
      setBoletoData(null);
      setPendingData(null);

      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!session)
        throw new Error("Usuário não autenticado ou sessão expirada");

      const paymentMethodMap = {
        card: "CREDIT_CARD",
        pix: "PIX",
        "boleto-inter": "BOLETO",
      };

      let endpoint = "/api/asaas/create-checkout";
      if (paymentMethod === "pix" || paymentMethod === "boleto-inter") {
        if (paymentMethod === "pix" && selectedInterval === 1) {
          setPendingData({
            pending: true,
            message: "Gerando seu PIX no Banco Inter...",
          });
          endpoint = "/api/checkout/inter-pix"; // Usando Pix normal + sistema interno de renovação
        } else {
          setPendingData({
            pending: true,
            message:
              paymentMethod === "pix"
                ? "Gerando seu PIX no Banco Inter..."
                : "Gerando seu Boleto no Banco Inter...",
          });
          endpoint =
            paymentMethod === "pix"
              ? "/api/checkout/inter-pix"
              : "/api/checkout/inter-boleto";
        }
      }

      const payload = {
        plan: selectedPlan,
        addons: selectedAddonsSlugs,
        coupon: couponCode,
        interval: selectedInterval,
        paymentMethod:
          paymentMethodMap[paymentMethod as keyof typeof paymentMethodMap] ||
          "CREDIT_CARD",
        installments: paymentMethod === "card" ? installments : 1,
      };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("[PAYMENT DEBUG] Response:", {
        ok: res.ok,
        status: res.status,
        data,
        paymentMethod,
      });
      if (!res.ok) throw new Error(data.error || "Erro ao processar pagamento");

      if (data.checkoutUrl && paymentMethod === "card") {
        // Salvar no localStorage para polling ao voltar para a página
        if (data.checkoutId) {
          localStorage.setItem(
            "asaas_pending_payment",
            JSON.stringify({
              checkoutId: data.checkoutId,
              timestamp: Date.now(),
            }),
          );
        }

        // Abrir NA MESMA ABA (Evita bloqueios e travamentos)
        window.location.href = data.checkoutUrl;

        // (Opcional) Mostrar mensagem antes de redirecionar
        setPendingData({
          pending: true,
          message: "Redirecionando para o Asaas...",
          checkoutId: data.checkoutId,
        });
      } else if (
        data.seu_numero ||
        data.pending ||
        data.pixPayload ||
        data.pdfUrl ||
        data.idRec ||
        data.txid
      ) {
        // Resposta do Banco Inter (Pix ou Boleto)
        if (paymentMethod === "pix") {
          if (data.pixPayload) {
            setPixData({
              pixPayload: data.pixPayload,
              amount: data.amount,
              expiresAt: data.expiresAt,
              pdfUrl: data.pdfUrl,
            } as any);
            setPaymentMethod("pix-result");
            setPendingData(null);
          } else {
            setPendingData({
              pending: true,
              message: data.message || "Gerando seu PIX no Banco Inter...",
              seu_numero: data.seu_numero || data.txid,
            });
          }
          // setSelectedAddonsSlugs([]); // Limpar ao gerar Pix Inter
          setOpenDialog(true);
        } else if (paymentMethod === "boleto-inter") {
          if (data.pdfUrl && data.linhaDigitavel) {
            setBoletoData({
              linhaDigitavel: data.linhaDigitavel,
              codigoBarras: data.codigoBarras,
              pdfUrl: data.pdfUrl,
              amount: data.amount,
              nossoNumero: data.nossoNumero || "",
            } as any);
            setPaymentMethod("boleto-result");
            setPendingData(null);
          } else {
            setPendingData({
              pending: true,
              message: "Registrando boleto no Banco Inter...",
              seu_numero: data.seu_numero,
            });
            setOpenDialog(true);
          }
        }
        fetchInvoices();
      } else if (data.pixQrCode || data.pixData) {
        // Fallback Asaas Pix
        setPixData({
          pixPayload: data.pixCopyPaste || data.pixData?.payload,
          amount: data.amount,
          expiresAt: data.expiresAt || data.pixData?.expirationDate,
          encodedImage: data.pixData?.encodedImage,
        } as any);
        setOpenDialog(true);
        fetchInvoices();
      } else if (data.boletoUrl || data.boletoData) {
        // Fallback Asaas Boleto
        setBoletoData({
          nossoNumero: "",
          codigoBarras: data.barCode || data.boletoData?.barCode,
          linhaDigitavel: data.barCode || data.boletoData?.identificationField,
          pdfUrl: data.boletoUrl || data.boletoData?.bankSlipUrl,
          amount: data.amount || data.boletoData?.value,
        } as any);
        setPaymentMethod("boleto-result");
        // setSelectedAddonsSlugs([]); // Manter seleção visualmente
        fetchInvoices();
      } else {
        throw new Error("Retorno desconhecido do gateway");
      }

      if (paymentMethod === "card") {
        setSelectedAddonsSlugs([]);
      }
    } catch (err: any) {
      console.error("[CHECKOUT ERROR]", err);
      setError(err.message || "Erro inesperado ao processar pagamento");
    } finally {
      setSaving(false);
    }
  }

  const selectedPlanData = dynamicPlans.find((p) => p.slug === selectedPlan);

  // Lógica de Desconto de Primeira Assinatura (Banner 10%)
  let hasFirstSubscriptionDiscount = false;
  if (tenantCreatedAt) {
    const created = new Date(tenantCreatedAt);
    const now = new Date();
    const diffTime = now.getTime() - created.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 5) {
      hasFirstSubscriptionDiscount = true;
    }
  }

  const intervalDiscountPercent = selectedInterval === 12 ? 20 : selectedInterval === 6 ? 10 : 0;
  const intervalDiscountFactor = (1 - intervalDiscountPercent / 100);

  const planTotal = selectedPlanData
    ? selectedPlanData.price * intervalDiscountFactor * selectedInterval
    : 0;

  let addonsTotal = 0;
  selectedAddonsSlugs.forEach((slug) => {
    const addon = dynamicAddons.find((a) => a.slug === slug);
    // Aplicar o mesmo desconto de intervalo aos módulos
    if (addon) addonsTotal += (Number(addon.price) * intervalDiscountFactor) * selectedInterval;
  });

  const rawTotal = planTotal + addonsTotal;
  const oneMonthValue = rawTotal / selectedInterval;
  const firstSubscriptionDiscountAmount = hasFirstSubscriptionDiscount ? oneMonthValue * 0.1 : 0;
  const grandTotal = rawTotal - firstSubscriptionDiscountAmount;

  return (
    <div className="space-y-6 pb-20">
      {/* SEÇÃO DE SELEÇÃO NO TOPO (NOVA) */}
      {(selectedPlan || selectedAddonsSlugs.length > 0) && !isPaymentExpanded && (
        <div className="w-full bg-slate-900/40 backdrop-blur-xl border-2 border-blue-500/20 p-5 rounded-[28px] shadow-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* ESQUERDA: Plano e Preço */}
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                  Pacote Selecionado
                </span>
                <span className="px-2 py-0.5 bg-blue-500/10 text-[9px] font-black text-blue-400 rounded-lg border border-blue-500/20 uppercase">
                  {selectedPlanData?.name || selectedPlan}
                </span>
              </div>
            </div>

            {/* CENTRO: Módulos selecionados */}
            <div className="flex items-center gap-2 flex-1 justify-center flex-wrap">
              {dynamicAddons
                .filter(a => selectedAddonsSlugs.includes(a.slug))
                .map((addon) => (
                  <div
                    key={addon.slug}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl"
                  >
                    <Zap size={10} className="text-amber-500" />
                    <span className="text-[9px] font-black uppercase text-amber-500">
                      {addon.name.replace("Módulo ", "")}
                    </span>
                  </div>
                ))}
              {selectedAddonsSlugs.length === 0 && (
                <button
                  onClick={() => {
                    const el = document.getElementById('turbinar-pacote');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="text-[10px] font-black text-slate-500 hover:text-amber-500 uppercase tracking-widest border border-dashed border-slate-800 px-3 py-1.5 rounded-xl transition-colors"
                >
                  + ADICIONAR MÓDULOS
                </button>
              )}
            </div>

            <Button
              onClick={() => setIsPaymentExpanded(!isPaymentExpanded)}
              className={cn(
                "h-14 px-8 rounded-2xl font-black uppercase tracking-[0.1em] transition-all duration-300 text-[11px] shadow-xl hover:scale-[1.02] active:scale-95 flex items-center gap-2",
                isPaymentExpanded
                  ? "bg-slate-800 text-slate-400 border border-white/5"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
              )}
            >
              {isPaymentExpanded ? "REVER PLANOS" : "CONTINUAR"}
              <ArrowRight size={18} className={cn("transition-transform duration-500", isPaymentExpanded && "rotate-90")} />
            </Button>
          </div>
        </div>
      )}

      {/* SEÇÃO DE PAGAMENTO EXPANSÍVEL */}
      {isPaymentExpanded && (
        <div ref={paymentRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in zoom-in-95 duration-500">
          {/* QUADRADO 1: RESUMO (MAIS FINO) */}
          <div className="lg:col-span-4 bg-slate-900 border border-white/5 p-6 rounded-[32px] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 blur-3xl" />

            <div className="relative z-10 space-y-6">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em]">Resumo do Pedido</span>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                  {selectedPlanData?.name || selectedPlan}
                </h3>
              </div>

              <div className="space-y-3 border-y border-white/5 py-4">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Base</span>
                    <span className="text-[10px] text-slate-400 font-medium">TOTAL: R$ {planTotal.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-black text-white">{selectedInterval}x</span>
                    <span className="text-lg font-black text-white">R$ {(planTotal / selectedInterval).toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>

                {selectedAddonsSlugs.map(slug => {
                  const addon = dynamicAddons.find(a => a.slug === slug);
                  // Valor do módulo com desconto de intervalo aplicado
                  const addonPriceWithIntervalDiscount = Number(addon?.price || 0) * intervalDiscountFactor;
                  const addonTotal = addonPriceWithIntervalDiscount * selectedInterval;
                  return (
                    <div key={slug} className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest leading-none mb-0.5">{addon?.name.replace("Módulo ", "")}</span>
                        <span className="text-[10px] text-slate-400 font-medium">TOTAL: R$ {addonTotal.toFixed(2).replace(".", ",")}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-slate-300">+{selectedInterval}x</span>
                        <span className="text-base font-black text-slate-300">R$ {addonPriceWithIntervalDiscount.toFixed(2).replace(".", ",")}</span>
                      </div>
                    </div>
                  );
                })}

                {hasFirstSubscriptionDiscount && (
                  <div className="flex justify-between items-center py-2 px-3 bg-blue-500/10 border border-blue-500/20 rounded-xl gap-2 mt-1 min-h-[44px]">
                    <div className="flex flex-col min-w-0">
                      <span className="text-blue-400 font-black uppercase text-[8px] leading-none tracking-wider mb-1">Desconto Boas-vindas</span>
                      <span className="text-[9px] text-blue-300/70 font-bold leading-none whitespace-nowrap">Bônus: 10% OFF 1ª parcela</span>
                    </div>
                    <span className="text-blue-400 font-black text-sm whitespace-nowrap tabular-nums">- R$ {firstSubscriptionDiscountAmount.toFixed(2).replace(".", ",")}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 pt-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Mensal</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-blue-500 tracking-tighter tabular-nums">
                    R$ {oneMonthValue.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">/mês</span>
                </div>
                <div className="text-[11px] font-bold text-slate-400 mt-1 pb-1">
                  Pagamento Total (Hoje): <span className="text-white">R$ {grandTotal.toFixed(2).replace(".", ",")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* QUADRADO 2: PAGAMENTO (MAIOR) */}
          <div className="lg:col-span-8 bg-slate-950 border border-white/10 p-5 md:p-6 rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
            {/* O ROBÔ VISUAL */}
            {!pixData && !boletoData && !pendingData && (
              <div className="absolute top-10 right-10 animate-bounce duration-[3000ms]">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                  <Bot size={48} className="text-blue-500 relative z-10" />
                </div>
              </div>
            )}

            <div className="w-full max-w-xl space-y-10">
              {!pixData && !boletoData && !pendingData ? (
                <>
                  <div className="space-y-6">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] text-center block">Escolha como pagar</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { id: "pix", icon: Zap, label: selectedInterval === 1 ? "PIX AUTOMÁTICO" : "PIX", color: "emerald" },
                        { id: "card", icon: CreditCard, label: "CARTÃO", color: "blue" },
                        { id: "boleto-inter", icon: FileText, label: "BOLETO", color: "orange" }
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setPaymentMethod(m.id as any)}
                          className={cn(
                            "flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all duration-300 gap-3 group",
                            paymentMethod === m.id
                              ? `border-${m.color}-500 bg-${m.color}-500/10 text-white shadow-xl`
                              : "border-white/5 bg-slate-900/40 text-slate-600 hover:border-white/20"
                          )}
                        >
                          <m.icon size={28} className={cn(paymentMethod === m.id ? `text-${m.color}-400` : "text-slate-700")} />
                          <span className="text-[10px] font-black tracking-widest uppercase">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="CUPOM DE DESCONTO"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-4 text-center font-black tracking-widest text-white outline-none focus:border-blue-500/30"
                    />
                    <Button
                      onClick={handleChangePlan}
                      disabled={saving}
                      className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] rounded-2xl text-base shadow-xl transition-all duration-300 active:scale-95"
                    >
                      {saving ? (
                        <div className="flex items-center gap-3">
                          <Activity className="animate-spin w-5 h-5" />
                          <span>PROCESSANDO...</span>
                        </div>
                      ) : (
                        "ASSINAR AGORA"
                      )}
                    </Button>

                    {error && (
                      <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                        <AlertCircle size={14} />
                        <span>{error}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-full animate-in zoom-in-95">
                  {paymentSuccess ? (
                    <div className="flex flex-col items-center justify-center space-y-6 text-center animate-in zoom-in-90 duration-500">
                      <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-[32px] flex items-center justify-center border border-emerald-500/30 shadow-[0_0_50px_-12px_rgba(16,185,129,0.4)]">
                        <CheckCircle2 size={48} className="animate-bounce" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                          Pagamento Confirmado!
                        </h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                          Tudo certo por aqui. Seu plano já foi ativado.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">
                        <Activity size={12} className="animate-spin" />
                        Atualizando sua conta...
                      </div>
                    </div>
                  ) : (
                    <>
                      {pixData && (
                        <div className="flex flex-col items-center space-y-8">
                          {selectedInterval === 1 && (
                            <div className="w-full bg-blue-500/10 border border-blue-500/20 p-5 rounded-3xl space-y-2 animate-in fade-in slide-in-from-top-4">
                              <div className="flex items-center gap-2 text-blue-400 font-black text-[10px] uppercase tracking-widest">
                                <Zap size={14} fill="currentColor" />
                                <span>Aviso de Pix Automático</span>
                              </div>
                              <p className="text-slate-400 text-[10px] leading-relaxed font-bold uppercase tracking-tight">
                                Ao pagar, você autoriza o <strong>{tenantObject?.name}</strong> a realizar cobranças automáticas mensais. É prático e você pode cancelar quando quiser no seu app bancário.
                              </p>
                            </div>
                          )}
                          <div className="bg-white p-6 rounded-[32px] shadow-2xl">
                            <QRCodeCanvas value={pixData?.pixPayload || ""} size={240} level="H" includeMargin={true} />
                          </div>
                          <div className="w-full space-y-4">
                            <div className="bg-slate-900 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-slate-400 break-all text-center">
                              {pixData?.pixPayload}
                            </div>
                            <Button
                              className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase rounded-2xl"
                              onClick={() => { if (pixData?.pixPayload) { navigator.clipboard.writeText(pixData.pixPayload); alert('Copiado!'); } }}
                            >
                              Copiar Código Pix
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {boletoData && (
                    <div className="flex flex-col items-center space-y-8">
                      <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center text-orange-500 border border-orange-500/20">
                        <FileText size={40} />
                      </div>
                      <div className="w-full space-y-4">
                        <div className="bg-slate-900 p-4 rounded-xl border border-white/5 font-mono text-xs text-slate-300 text-center">
                          {boletoData?.linhaDigitavel}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Button
                            variant="outline"
                            className="h-16 border-white/10 bg-transparent text-white font-black uppercase rounded-2xl"
                            onClick={() => { if (boletoData?.linhaDigitavel) { navigator.clipboard.writeText(boletoData.linhaDigitavel); alert('Copiado!'); } }}
                          >
                            Copiar Linha
                          </Button>
                          <Button
                            className="h-16 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase rounded-2xl"
                            onClick={() => { if (boletoData?.pdfUrl) window.open(boletoData.pdfUrl, '_blank'); }}
                          >
                            Ver PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {pendingData && (
                    <div className="text-center space-y-6">
                      <Activity className="animate-spin text-blue-500 w-12 h-12 mx-auto" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest">{pendingData?.message}</p>
                    </div>
                  )}

                  <button
                    onClick={() => { setPixData(null); setBoletoData(null); setPendingData(null); }}
                    className="w-full text-slate-600 hover:text-white text-[10px] font-black uppercase tracking-widest pt-10"
                  >
                    Alterar forma de pagamento
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {checkingAsaasPayment && (
        <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl space-y-4 animate-pulse">
          <div className="flex items-start gap-4">
            <Activity className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1 animate-spin" />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-blue-500">
                Verificando Pagamento
              </h3>
              <p className="text-blue-400 font-medium leading-relaxed">
                Estamos verificando o status do seu pagamento no Asaas. Aguarde
                alguns instantes...
              </p>
            </div>
          </div>
        </div>
      )}

      {isExpired && (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl space-y-4">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-red-500">
                Atenção: Acesso Bloqueado
              </h3>
              <p className="text-red-400 font-medium leading-relaxed">
                Sua assinatura expirou ou o período de teste encerrou. Para
                continuar utilizando a plataforma, escolha um plano abaixo e
                realize o pagamento.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pl-0 md:pl-12">
            <a
              href={`mailto:contato@791solucoes.com.br?subject=Erro de Pagamento - ${tenantObject?.name || "791 Barber"}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold uppercase transition-colors"
            >
              <ExternalLink size={14} /> Reportar Erro (Email)
            </a>
            <a
              href="https://wa.me/5548991803379?text=Olá, preciso de ajuda com minha assinatura no 791 Barber."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-bold uppercase transition-colors"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                alt="WhatsApp"
                className="w-4 h-4"
              />
              Falar no Suporte
            </a>

            <Button
              variant="default"
              onClick={() => {
                const targetPlan =
                  currentPlan && currentPlan !== "trial"
                    ? currentPlan
                    : "basic";
                setSelectedPlan(targetPlan);
                setPaymentMethod("card");
                setOpenDialog(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Regularizar Assinatura
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400">
          <p>Carregando plano...</p>
        </div>
      ) : (
        <>
          {/* --- LÓGICA DE REORDENAMENTO --- */}
          {(() => {
            // Se estiver no trial (até 10 dias) ou pagamento pendente, mostramos planos no topo
            const now = new Date();
            const referenceDate = tenantCreatedAt
              ? new Date(tenantCreatedAt)
              : new Date();
            const diffTime = Math.abs(now.getTime() - referenceDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const isUnderTrialGrace = diffDays <= 10;

            const isTrialOrPending =
              (currentPlan === "trial" ||
                isUnderTrialGrace ||
                isExpired ||
                [
                  "past_due",
                  "unpaid",
                  "pending_payment",
                  "trialing",
                  "trial_expired",
                ].includes(subscriptionStatus || "")) &&
              subscriptionStatus !== "active";

            const CurrentPlanSection = (
              <div
                key="current-plan"
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                {/* COLUNA ESQUERDA: PLANO ATUAL */}
                <div className="lg:col-span-4 space-y-6">
                  <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden ring-1 ring-white/5">
                    <CardHeader className="py-4 px-5 border-b border-slate-800/50 bg-slate-950/30">
                      <CardTitle className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <CreditCard size={14} className="text-blue-500" /> Plano
                        Atual
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-6">
                        <div className="flex flex-col items-center text-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center font-black text-white text-3xl shadow-xl shadow-blue-900/40 transform -rotate-3 hover:rotate-0 transition-transform mb-2">
                            {currentPlan.charAt(0).toUpperCase()}
                          </div>
                          <div className="w-full">
                            <h3 className="text-3xl font-black text-slate-100 capitalize tracking-tight leading-none mb-2">
                              {dynamicPlans.find((p) => p.slug === currentPlan)
                                ?.name || currentPlan}
                            </h3>
                            <p className="text-xl font-black text-blue-500">
                              {(subscriptionData?.next_billing_date || tenantObject?.subscription_current_period_end) ? (
                                <>
                                  Próxima Cobrança:{" "}
                                  {new Date(
                                    subscriptionData?.next_billing_date || tenantObject.subscription_current_period_end,
                                  ).toLocaleDateString("pt-BR")}
                                </>
                              ) : (
                                "Período de Teste"
                              )}
                            </p>

                            {subscriptionData?.status === 'active' && (
                              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl max-w-xs mx-auto">
                                <p className="text-[10px] font-black text-blue-400 uppercase mb-2 tracking-widest">Renovação Pix Mensal</p>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                  Seu Pix será gerado automaticamente em <span className="text-blue-400 font-bold">{new Date(subscriptionData.next_billing_date).toLocaleDateString("pt-BR")}</span>.
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-center h-auto p-0 mt-3 text-red-500 hover:text-red-400 text-[10px] font-black uppercase underline tracking-widest"
                                  onClick={handleCancelSubscription}
                                  disabled={canceling}
                                >
                                  {canceling ? "Cancelando..." : "Cancelar Renovação Automática"}
                                </Button>
                              </div>
                            )}

                            {subscriptionData?.status === 'canceled' && (
                              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl max-w-xs mx-auto">
                                <p className="text-[10px] font-black text-yellow-600 uppercase mb-2 tracking-widest">Renovação Cancelada</p>
                                <p className="text-xs text-slate-300 leading-relaxed">Sua assinatura não será renovada. O acesso expira em <span className="text-yellow-600 font-bold">{new Date(subscriptionData.next_billing_date).toLocaleDateString("pt-BR")}</span>.</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800/50 flex flex-col items-center gap-3">
                          <span
                            className={cn(
                              "w-fit px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border shadow-sm",
                              subscriptionStatus === "canceled"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                            )}
                          >
                            {subscriptionStatus === "canceled"
                              ? "Cancelamento Pendente"
                              : "Escalável & Ativo"}
                          </span>
                          {(stripeSubscriptionId || (asaasSubscriptionId && tenantObject?.asaas_subscription_id) || interRecurrenceId) &&
                            subscriptionStatus !== "canceled" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-[10px] text-red-500/60 hover:text-red-500 hover:bg-red-500/10 font-black uppercase tracking-widest p-0 flex items-center justify-center gap-2"
                                onClick={handleCancelSubscription}
                                disabled={canceling}
                              >
                                {canceling
                                  ? "Processando..."
                                  : "✖ Cancelar Assinatura"}
                              </Button>
                            )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* COLUNA DIREITA: TURBINAR PACOTE */}
                <div className="lg:col-span-8 space-y-6">
                  <div id="turbinar-pacote" className="scroll-mt-32">
                    <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
                      <Zap
                        className="text-amber-400 fill-amber-400"
                        size={20}
                      />{" "}
                      Turbinar Pacote
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                      Recursos específicos para sua necessidade.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dynamicAddons
                      .filter((addon) => {
                        // RADICAL FIX RAMON: Se for Trial ou não for Assinatura Paga Ativa, MOSTRA SEMPRE.
                        // Isso garante que o usuário consiga montar o carrinho no teste.
                        const isPaidActive =
                          subscriptionStatus === "active" &&
                          !!tenantObject?.asaas_subscription_id;
                        if (!isPaidActive) return true;

                        // Logica de filtro para assinantes pagos (evitar duplicidade)
                        const currentPlanData = dynamicPlans.find(
                          (p) => p.slug === currentPlan,
                        );
                        if (!currentPlanData) return true;
                        const addonName = (addon.name || "")
                          .toLowerCase()
                          .replace("módulo ", "")
                          .trim();
                        const features = (currentPlanData.features || []).map(
                          (f: any) => String(f || "").toLowerCase(),
                        );
                        return !features.some(
                          (f: string) =>
                            f.includes(addonName) || f.includes(addon.slug),
                        );
                      })
                      .map((addon) => {
                        const isActive = activeAddons.includes(addon.slug);
                        return (
                          <Card
                            key={addon.id}
                            className={cn(
                              "bg-slate-900/40 border-slate-800 transition-all hover:border-slate-700 relative overflow-hidden group shadow-sm backdrop-blur-sm",
                              isActive &&
                              "border-emerald-500/50 bg-emerald-500/5",
                            )}
                          >
                            {isActive && (
                              <div className="absolute top-2 right-2">
                                <CheckCircle2
                                  className="text-emerald-500"
                                  size={16}
                                />
                              </div>
                            )}
                            <CardContent className="p-5">
                              <div className="mb-4">
                                <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight mb-1">
                                  {addon.name}
                                </h3>
                                <p className="text-[11px] text-slate-500 font-medium leading-normal h-8 line-clamp-2">
                                  {addon.description}
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                                <div className="flex flex-col">
                                  <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                                    Investimento
                                  </span>
                                  <p className="text-sm font-black text-amber-500">
                                    R${" "}
                                    {Number(addon.price).toLocaleString(
                                      "pt-BR",
                                      { minimumFractionDigits: 2 },
                                    )}
                                    <span className="text-[9px] text-slate-600 ml-1 lowercase">
                                      /mês
                                    </span>
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant={
                                    isActive
                                      ? "outline"
                                      : selectedAddonsSlugs.includes(addon.slug)
                                        ? "default"
                                        : "outline"
                                  }
                                  disabled={isActive || saving}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleAddon(addon.slug);
                                  }}
                                  className={cn(
                                    "h-9 text-[10px] font-black uppercase tracking-widest px-4 shadow-lg active:scale-95 transition-all text-white",
                                    isActive
                                      ? "border-emerald-500/50 text-emerald-500 bg-transparent"
                                      : selectedAddonsSlugs.includes(addon.slug)
                                        ? "bg-amber-600 border-amber-600"
                                        : "border-slate-700 hover:border-amber-500",
                                  )}
                                >
                                  {isActive
                                    ? "Ativo"
                                    : selectedAddonsSlugs.includes(addon.slug)
                                      ? "Selecionado"
                                      : "Adicionar"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                </div>
              </div >
            );

            const PlanSelectionSection = (
              <div
                key="plan-selection"
                className={cn(
                  "space-y-6",
                  isTrialOrPending
                    ? "mb-8"
                    : "pt-8 mt-8 border-t border-slate-800/50",
                )}
              >
                <div className="text-center space-y-1">
                  <h2 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-tighter">
                    Escolha seu Próximo Nível
                  </h2>
                  <p className="text-slate-500 text-[10px] font-medium">
                    Migre agora e libere todo o potencial da sua barbearia.
                  </p>
                </div>

                {/* SELETOR DE PERÍODO */}
                <div className="flex justify-center mt-8">
                  <div className="bg-slate-900 border border-slate-800 p-1 rounded-2xl flex gap-1 shadow-2xl">
                    {[
                      { id: 1, label: "Mensal", discount: 0 },
                      { id: 6, label: "Semestral", discount: 10 },
                      { id: 12, label: "Anual", discount: 20 },
                    ].map((period) => (
                      <button
                        key={period.id}
                        onClick={() => {
                          setSelectedInterval(period.id);
                          setInstallments(1); // Resetar parcelas ao mudar ciclo
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden",
                          selectedInterval === period.id
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800",
                        )}
                      >
                        {period.label}
                        {period.discount > 0 && (
                          <span className="ml-2 bg-emerald-500 text-[8px] px-1.5 py-0.5 rounded-full text-white animate-pulse">
                            -{period.discount}%
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {dynamicPlans
                    .filter((p) => p.slug !== "trial")
                    .map((plan) => (
                      <Card
                        key={plan.id}
                        onClick={() => {
                          if (selectedPlan === plan.slug) {
                            setSelectedPlan(null);
                          } else {
                            setSelectedPlan(plan.slug);
                          }
                        }}
                        className={cn(
                          "bg-slate-900 border-2 border-slate-800 cursor-pointer transition-all duration-300 rounded-[24px] overflow-hidden relative group shadow-xl flex flex-col h-full",
                          currentPlan === plan.slug && "border-blue-500/50 bg-slate-900/80",
                          selectedPlan === plan.slug && "border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5 shadow-blue-900/20"
                        )}
                      >
                        <div className="p-5 flex flex-col h-full">
                          <div className="flex justify-between items-start mb-3">
                            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-[0.15em] rounded-lg border border-blue-500/10">
                              {plan.slug}
                            </span>
                            {currentPlan === plan.slug && (
                              <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/10">
                                <CheckCircle2 size={10} /> Ativo
                              </span>
                            )}
                          </div>

                          <div className="space-y-2 mb-4">
                            <h3 className="text-lg font-black text-white tracking-tight uppercase">
                              {plan.name}
                            </h3>
                            <div className="space-y-0.5">
                              {(() => {
                                const basePrice = plan.price || 0;
                                const discount =
                                  selectedInterval === 6
                                    ? 10
                                    : selectedInterval === 12
                                      ? 20
                                      : 0;
                                const totalPrice =
                                  basePrice *
                                  selectedInterval *
                                  (1 - discount / 100);
                                const monthlyEquivalent =
                                  totalPrice / selectedInterval;

                                return (
                                  <>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-xl font-black text-white tabular-nums tracking-tighter">
                                        R${" "}
                                        {(monthlyEquivalent || 0)
                                          .toFixed(2)
                                          .replace(".", ",")}
                                      </span>
                                      <span className="text-[9px] text-slate-500 font-bold lowercase">
                                        /mês
                                      </span>
                                    </div>
                                    {selectedInterval > 1 && (
                                      <div className="text-[10px] font-black text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Zap size={10} /> Total: R${" "}
                                        {(totalPrice || 0)
                                          .toFixed(2)
                                          .replace(".", ",")}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                            {plan.description && (
                              <p className="text-[10px] font-bold text-slate-500 leading-snug line-clamp-2">
                                {plan.description}
                              </p>
                            )}
                          </div>

                          <div className="space-y-3 flex-grow pb-4">
                            <div className="h-px bg-slate-800/50 w-full" />
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em]">
                              Inclusos:
                            </p>
                            <div className="space-y-2">
                              {plan.features?.map(
                                (feature: any, i: number) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-2 group/item"
                                  >
                                    <div className="mt-0.5 w-3.5 h-3.5 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-sm">
                                      <Check className="w-2 h-2 text-blue-500" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 group-hover/item:text-slate-200 transition-colors leading-tight">
                                      {feature}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>

                          <Button
                            className={cn(
                              "w-full h-12 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] transition-all duration-300 shadow-lg mt-auto",
                              currentPlan === plan.slug &&
                                subscriptionStatus === "active"
                                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5 opacity-50"
                                : selectedPlan === plan.slug
                                  ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20 scale-[1.01]"
                                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 hover:scale-[1.01] active:scale-95"
                            )}
                            disabled={
                              currentPlan === plan.slug &&
                              subscriptionStatus === "active"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              // Define o plano selecionado antes de abrir o modal ou expandir
                              setSelectedPlan(plan.slug);

                              // Premium vai direto para pagamento
                              if (plan.slug === "premium") {
                                setIsPaymentExpanded(true);
                                setTimeout(() => {
                                  paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 100);
                              }
                              // Basic e Complete mostram modal de upsell
                              else if (plan.slug === "basic" || plan.slug === "complete") {
                                setUpsellPlan(plan.slug);
                                setShowUpsellModal(true);
                              }
                            }}
                          >
                            {currentPlan === plan.slug &&
                              subscriptionStatus === "active"
                              ? "Plano Ativo"
                              : selectedPlan === plan.slug
                                ? "SELECIONADO"
                                : "ASSINAR AGORA"}
                          </Button>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            );

            if (isTrialOrPending) {
              return (
                <div className="space-y-8">
                  {PlanSelectionSection}
                  {CurrentPlanSection}
                </div>
              );
            }

            return (
              <div className="space-y-8">
                {PlanSelectionSection}
                {CurrentPlanSection}
              </div>
            );
          })()}

          {/* O loading agora fecha mais abaixo, englobando tudo */}



          {/* --- SEÇÃO DE HISTÓRICO DE FATURAS --- */}
          <div className="mt-12 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">
                    Meu Histórico de Faturas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Acompanhe seus pagamentos e baixe boletos anteriores.
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              {loadingInvoices ? (
                <div className="py-12 text-center text-slate-500 animate-pulse uppercase text-[10px] font-black tracking-widest">
                  {" "}
                  Carregando faturas...{" "}
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-12 text-center text-slate-600 uppercase text-[10px] font-black tracking-widest">
                  {" "}
                  Nenhuma fatura encontrada.{" "}
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
                              {/* Só mostra botões de ação se NÃO estiver pago E NÃO estiver cancelado/expirado */}
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
                                          // Tenta pelo seu_numero ou txid
                                          const seuNumero =
                                            inv.metadata.seu_numero;
                                          const txid = inv.metadata.txid;

                                          // Chama endpoint de Polling para atualizar status
                                          let url = `/api/barbershop/check-pending-payment?force=true`;
                                          if (seuNumero)
                                            url += `&seu_numero=${seuNumero}`;
                                          else if (txid) url += `&txid=${txid}`; // Fallback se o endpoint suportar txid direto no query

                                          // Nota: o endpoint atual suporta seu_numero e busca pelo txid interno no metadada.
                                          // Se o seu_numero falhar, podemos ter que usar o debug endpoint.

                                          // Vamos usar também o endpoint de DEBUG FORCE CHECK que é garantido
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

                                          // Fallback para polling normal
                                          if (seuNumero) {
                                            const res = await fetch(
                                              `/api/barbershop/check-pending-payment?seu_numero=${seuNumero}`,
                                            );
                                            const data = await res.json();
                                            if (
                                              data.ready ||
                                              data.statusUpdated
                                            ) {
                                              // O pooling já atualiza o is_paid se detectar
                                              fetchInvoices();
                                            } else {
                                              // Feedback sutil em vez de alert bloqueante
                                              // alert('Ainda consta como pendente no banco.');
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

                                    {inv.metadata?.method === "pix_inter" ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-black uppercase"
                                        onClick={() => {
                                          // Reabrir Modal Pix
                                          setPixData({
                                            amount: inv.value,
                                            pixPayload:
                                              inv.metadata?.pix_payload || "",
                                            expiresAt:
                                              inv.metadata?.expires_at ||
                                              new Date().toISOString(),
                                            pdfUrl: undefined,
                                          });
                                          setPendingData({
                                            pending: true,
                                            message: "Aguardando pagamento...",
                                            seu_numero: inv.metadata?.seu_numero,
                                          });
                                          setIsPaymentExpanded(true);
                                        }}
                                      >
                                        <Zap className="w-3 h-3 mr-1" /> Ver Pix
                                      </Button>
                                    ) : (
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
                                        PDF
                                      </Button>
                                    )}
                                  </>
                                )}

                              {/* --- AÇÃO: EMITIR NFS-E (SÓ PARA PAGOS SEM NOTA) --- */}
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
                                    console.log("Emitindo NFS-e...");
                                  }}
                                >
                                  <FileCheck className="w-3 h-3 mr-1" /> Emitir
                                  NFS-e
                                </Button>
                              )}

                              {/* --- AÇÃO: VER NOTA (SE JÁ EXISTIR) --- */}
                              {inv.metadata?.nfe_id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-black uppercase"
                                  onClick={async () => {
                                    if (inv.metadata?.nfe_pdf_url) {
                                      try {
                                        // Se a URL for do nosso provedor, precisamos mandar os dados da note para gerar
                                        if (
                                          inv.metadata.nfe_pdf_url.includes(
                                            "/nfse/pdf",
                                          )
                                        ) {
                                          const {
                                            data: { session },
                                          } =
                                            await supabaseClient.auth.getSession();
                                          const res = await fetch(
                                            inv.metadata.nfe_pdf_url,
                                            {
                                              method: "POST",
                                              headers: {
                                                "Content-Type":
                                                  "application/json",
                                                Authorization: `Bearer ${session?.access_token}`,
                                              },
                                              body: JSON.stringify({
                                                dpsData: {
                                                  numero:
                                                    inv.metadata.nfe_id ||
                                                    inv.id.slice(-8),
                                                  dataEmissao:
                                                    inv.metadata
                                                      .nfe_emission_date ||
                                                    inv.date,
                                                  prestador: {
                                                    cnpj: "XX.XXX.XXX/0001-XX",
                                                    inscricaoMunicipal:
                                                      "XXXXXXX",
                                                  },
                                                  tomador: {
                                                    razaoSocial:
                                                      inv.description,
                                                    cnpj: "XX.XXX.XXX/0001-XX",
                                                  }, // Simplificado
                                                  servico: {
                                                    valorServicos: inv.value,
                                                    discriminacao:
                                                      inv.description,
                                                    codigoItemListaServico:
                                                      "0101",
                                                  },
                                                },
                                              }),
                                            },
                                          );
                                          const blob = await res.blob();
                                          const url =
                                            window.URL.createObjectURL(blob);
                                          window.open(url, "_blank");
                                        } else {
                                          window.open(
                                            inv.metadata.nfe_pdf_url,
                                            "_blank",
                                          );
                                        }
                                      } catch (e) {
                                        console.error("Erro ao abrir PDF:", e);
                                        alert("Erro ao gerar PDF da nota.");
                                      }
                                    } else {
                                      alert(
                                        "PDF da nota não disponível. ID: " +
                                        inv.metadata.nfe_id,
                                      );
                                    }
                                  }}
                                >
                                  <FileCheck className="w-3 h-3 mr-1" /> Ver
                                  NFS-e
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
        </>
      )}

      {/* Modal de Checkout Integrado do Asaas */}
      {
        checkoutUrl && (
          <AsaasCheckoutModal
            checkoutUrl={checkoutUrl}
            isOpen={showCheckoutModal}
            boletoData={
              boletoData
                ? {
                  identificationField: boletoData?.linhaDigitavel || "",
                  barCode: boletoData?.codigoBarras || "",
                  value: boletoData?.amount || 0,
                  dueDate: (boletoData as any)?.dueDate || "",
                  bankSlipUrl: boletoData?.pdfUrl,
                }
                : null
            }
            pixData={
              pixData
                ? {
                  encodedImage: (pixData as any)?.encodedImage,
                  payload: pixData?.pixPayload,
                  expirationDate: pixData?.expiresAt,
                }
                : null
            }
            onClose={() => {
              setShowCheckoutModal(false);
              setCheckoutUrl(null);
              setBoletoData(null);
              setPixData(null);
              fetchCurrentPlan();
              fetchInvoices();
            }}
          />
        )
      }

      {/* MODAL DE UPSELL DE MÓDULOS */}
      <UpsellModal
        open={showUpsellModal}
        onOpenChange={setShowUpsellModal}
        planSlug={upsellPlan}
        planPrice={dynamicPlans.find(p => p.slug === upsellPlan)?.price || 0}
        addons={dynamicAddons}
        selectedAddonsSlugs={selectedAddonsSlugs}
        selectedInterval={selectedInterval}
        onAddonToggle={(slug) => {
          if (!selectedAddonsSlugs.includes(slug)) {
            setSelectedAddonsSlugs([...selectedAddonsSlugs, slug]);
          }
        }}
        onIntervalChange={(interval) => setSelectedInterval(interval)}
        onContinue={() => {
          setShowUpsellModal(false);
          setIsPaymentExpanded(true);
          setTimeout(() => {
            paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }}
      />
    </div >
  );
}
