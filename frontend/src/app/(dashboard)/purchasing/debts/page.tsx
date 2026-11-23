"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthService } from "@/services/auth.service";
import { useDebounce } from "@/hooks/use-debounce";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/common/TablePagination";
import { TreasuryService } from "@/services/treasury.service";
import { PurchasingClientService } from "@/services/purchasing.service";
import { CurrencyService } from "@/services/currency.service";
import type {
  EligiblePaymentSource,
  EligibleSourcesResponse,
  PaymentOrder,
  PaymentOrderStatus,
} from "@/types/treasury";
import type { SupplierDebt, SupplierStatement } from "@/types/purchasing";
import type { AuthUser } from "@/types/auth";
import {
  UniversalPdfDownloadButton,
  SupplierDebtPdfDocument,
} from "@/components/pdf";
import { cn } from "@/lib/utils";
import { toast } from "@/utils/toast";
import {
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  Eye,
  FileCheck2,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Wallet,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type OperationalTab = "ALL" | "PENDING_APPROVAL" | "PAYABLE" | "PAID" | "SUPPLIERS";
type SourceFilter = "ALL" | "PURCHASE_ORDER" | "SERVICE_ORDER";

const STATUS_BADGES: Record<
  PaymentOrderStatus,
  { label: string; className: string }
> = {
  BORRADOR: {
    label: "Borrador",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  PENDIENTE_APROBACION: {
    label: "Por Aprobar",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  APROBADA: {
    label: "Aprobada",
    className:
      "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  },
  PAGADA_PARCIALMENTE: {
    label: "Pago Parcial",
    className:
      "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
  },
  PAGADA: {
    label: "Pagada",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  RECHAZADA: {
    label: "Rechazada",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  ANULADA: {
    label: "Anulada",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
};

function currencySymbol(code?: string): string {
  const c = (code || "USD").toUpperCase();
  if (c === "VED" || c === "VES") return "Bs.";
  if (c === "EUR") return "€";
  return "$";
}

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getApiError(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function TreasuryPaymentsPage() {
  const router = useRouter();
  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );
  const userRoles = currentUser?.roles || [];
  const canCreateOp = userRoles.some((r) =>
    ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION", "COORDINADOR"].includes(r)
  );

  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
  const [supplierDebts, setSupplierDebts] = useState<SupplierDebt[]>([]);
  const [bcvRates, setBcvRates] = useState<{ USD: number; EUR: number }>({
    USD: 75.0,
    EUR: 81.5,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [activeTab, setActiveTab] = useState<OperationalTab>("ALL");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [showFullPaidHistory, setShowFullPaidHistory] = useState(false);

  // Modal: Nueva Orden de Pago
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [eligibleSources, setEligibleSources] = useState<EligibleSourcesResponse>({
    purchaseOrders: [],
    serviceOrders: [],
  });
  const [createSourceTab, setCreateSourceTab] = useState<
    "PURCHASE_ORDER" | "SERVICE_ORDER"
  >("PURCHASE_ORDER");
  const [selectedSource, setSelectedSource] =
    useState<EligiblePaymentSource | null>(null);
  const [sourceSearch, setSourceSearch] = useState("");
  const [opNotes, setOpNotes] = useState("");
  const [creatingOp, setCreatingOp] = useState(false);

  // Modal: Estado de Cuenta por Proveedor (pestaña Saldos por Proveedor)
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDebt | null>(
    null
  );
  const [statement, setStatement] = useState<SupplierStatement | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [ordersData, debtsData, ratesData] = await Promise.all([
        TreasuryService.getPaymentOrders(),
        PurchasingClientService.getSupplierDebts().catch(() => []),
        CurrencyService.getCurrentRates().catch(() => null),
      ]);
      setPaymentOrders(ordersData);
      setSupplierDebts(debtsData);
      if (ratesData) {
        setBcvRates({
          USD: Number(ratesData.USD || ratesData.rates?.USD || 75.0),
          EUR: Number(ratesData.EUR || ratesData.rates?.EUR || 81.5),
        });
      }
    } catch (err) {
      toast.error(getApiError(err, "No se pudo cargar el módulo de Tesorería."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }
    void (async () => {
      try {
        const [ordersData, debtsData, ratesData] = await Promise.all([
          TreasuryService.getPaymentOrders(),
          PurchasingClientService.getSupplierDebts().catch(() => []),
          CurrencyService.getCurrentRates().catch(() => null),
        ]);
        if (ignore) return;
        setPaymentOrders(ordersData);
        setSupplierDebts(debtsData);
        if (ratesData) {
          setBcvRates({
            USD: Number(ratesData.USD || ratesData.rates?.USD || 75.0),
            EUR: Number(ratesData.EUR || ratesData.rates?.EUR || 81.5),
          });
        }
      } catch (err) {
        if (!ignore) {
          toast.error(
            getApiError(err, "No se pudo cargar el módulo de Tesorería.")
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [router]);

  const openCreateModal = async () => {
    setCreateModalOpen(true);
    setSelectedSource(null);
    setSourceSearch("");
    setOpNotes("");
    setLoadingSources(true);
    try {
      const data = await TreasuryService.getEligibleSources();
      setEligibleSources(data);
      if (data.purchaseOrders.length === 0 && data.serviceOrders.length > 0) {
        setCreateSourceTab("SERVICE_ORDER");
      } else {
        setCreateSourceTab("PURCHASE_ORDER");
      }
    } catch (err) {
      toast.error(
        getApiError(err, "Error al consultar órdenes pendientes por pagar.")
      );
    } finally {
      setLoadingSources(false);
    }
  };

  const handleCreatePaymentOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSource) {
      toast.error("Seleccione una Orden de Compra u Orden de Servicio.");
      return;
    }
    setCreatingOp(true);
    try {
      const created = await TreasuryService.createPaymentOrder({
        sourceType: selectedSource.sourceType,
        purchaseOrderId:
          selectedSource.sourceType === "PURCHASE_ORDER"
            ? selectedSource.id
            : undefined,
        serviceOrderId:
          selectedSource.sourceType === "SERVICE_ORDER"
            ? selectedSource.id
            : undefined,
        notes: opNotes.trim() || null,
      });
      toast.success(
        `Orden de Pago ${created.paymentOrderNumber} creada y enviada a aprobación.`
      );
      setCreateModalOpen(false);
      router.push(`/purchasing/debts/${created.id}`);
    } catch (err) {
      toast.error(getApiError(err, "No se pudo crear la Orden de Pago."));
    } finally {
      setCreatingOp(false);
    }
  };

  const openSupplierStatement = async (supplier: SupplierDebt) => {
    setSelectedSupplier(supplier);
    setStatement(null);
    setLoadingStatement(true);
    try {
      const data = await PurchasingClientService.getSupplierStatement(
        supplier.id
      );
      setStatement(data);
    } catch {
      toast.error("Error al consultar estado de cuenta del proveedor.");
    } finally {
      setLoadingStatement(false);
    }
  };

  const [mountNow] = useState(() => Date.now());
  const isWithin7Days = useCallback(
    (iso?: string | null) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return !Number.isNaN(t) && mountNow - t <= SEVEN_DAYS_MS;
    },
    [mountNow]
  );

  // KPIs
  const pendingApprovalCount = useMemo(
    () =>
      paymentOrders.filter(
        (po) =>
          po.status === "PENDIENTE_APROBACION" || po.status === "BORRADOR"
      ).length,
    [paymentOrders]
  );

  const payableOrders = useMemo(
    () =>
      paymentOrders.filter(
        (po) =>
          po.status === "APROBADA" || po.status === "PAGADA_PARCIALMENTE"
      ),
    [paymentOrders]
  );

  const totalPendingUsdEq = useMemo(() => {
    return payableOrders.reduce((acc, po) => {
      const rem = Number(po.remainingBalance || 0);
      const curr = (po.debtCurrency || "USD").toUpperCase();
      if (curr === "VED" || curr === "VES") {
        return acc + (bcvRates.USD > 0 ? rem / bcvRates.USD : 0);
      }
      if (curr === "EUR") {
        return acc + (bcvRates.USD > 0 ? (rem * bcvRates.EUR) / bcvRates.USD : rem);
      }
      return acc + rem;
    }, 0);
  }, [payableOrders, bcvRates]);

  const paid7dCount = useMemo(
    () =>
      paymentOrders.filter(
        (po) => po.status === "PAGADA" && isWithin7Days(po.updatedAt || po.createdAt)
      ).length,
    [paymentOrders, isWithin7Days]
  );

  const paidAllCount = useMemo(
    () => paymentOrders.filter((po) => po.status === "PAGADA").length,
    [paymentOrders]
  );

  // Filtrado de Órdenes de Pago
  const filteredOrders = useMemo(() => {
    const q = normalizeText(debouncedSearch.trim());
    return paymentOrders.filter((po) => {
      if (activeTab === "PENDING_APPROVAL") {
        if (po.status !== "PENDIENTE_APROBACION" && po.status !== "BORRADOR") {
          return false;
        }
      } else if (activeTab === "PAYABLE") {
        if (po.status !== "APROBADA" && po.status !== "PAGADA_PARCIALMENTE") {
          return false;
        }
      } else if (activeTab === "PAID") {
        if (po.status !== "PAGADA") return false;
        if (!showFullPaidHistory && !isWithin7Days(po.updatedAt || po.createdAt)) {
          return false;
        }
      }

      if (sourceFilter !== "ALL" && po.sourceType !== sourceFilter) {
        return false;
      }

      if (!q) return true;
      const haystack = normalizeText(
        [
          po.paymentOrderNumber,
          po.beneficiaryName,
          po.concept,
          po.purchaseOrder?.orderNumber || "",
          po.serviceOrder?.serviceOrderNumber || "",
          po.supplier?.rifOrId || "",
        ].join(" ")
      );
      return haystack.includes(q);
    });
  }, [
    paymentOrders,
    activeTab,
    sourceFilter,
    debouncedSearch,
    showFullPaidHistory,
    isWithin7Days,
  ]);

  // Filtrado de Proveedores (pestaña Saldos por Proveedor)
  const filteredSuppliers = useMemo(() => {
    const q = normalizeText(debouncedSearch.trim());
    return supplierDebts.filter((s) => {
      if (!q) return true;
      return (
        normalizeText(s.name || "").includes(q) ||
        normalizeText(s.rifOrId || "").includes(q)
      );
    });
  }, [supplierDebts, debouncedSearch]);

  const ordersPagination = usePagination(filteredOrders, { initialPageSize: 10 });
  const suppliersPagination = usePagination(filteredSuppliers, {
    initialPageSize: 10,
  });
  const { resetPage: resetOrdersPage } = ordersPagination;
  const { resetPage: resetSuppliersPage } = suppliersPagination;

  useEffect(() => {
    resetOrdersPage();
    resetSuppliersPage();
  }, [
    activeTab,
    sourceFilter,
    debouncedSearch,
    showFullPaidHistory,
    resetOrdersPage,
    resetSuppliersPage,
  ]);

  const modalSourcesList = useMemo(() => {
    const list =
      createSourceTab === "PURCHASE_ORDER"
        ? eligibleSources.purchaseOrders
        : eligibleSources.serviceOrders;
    const q = normalizeText(sourceSearch.trim());
    if (!q) return list;
    return list.filter((item) =>
      normalizeText(
        `${item.code} ${item.beneficiaryName} ${item.concept} ${item.rifOrId || ""}`
      ).includes(q)
    );
  }, [eligibleSources, createSourceTab, sourceSearch]);

  const hasSupplierDebt = (d: SupplierDebt) =>
    (d.balanceUsd || 0) > 0.009 ||
    (d.balanceBs || 0) > 0.009 ||
    (d.balanceEur || 0) > 0.009;

  return (
    <div className="space-y-6 pb-10">
      {/* ========================================================
          ENCABEZADO ESTANDARIZADO ERP-IDI
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Banknote className="w-6 h-6 text-primary" />
            Pagos y Tesorería
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Órdenes de pago aprobadas, liquidación multimoneda y pagos mixtos para Compras y Servicios
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void fetchAll(true)}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs cursor-pointer"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", refreshing && "animate-spin")}
            />
            <span>Actualizar</span>
          </Button>

          {canCreateOp && (
            <Button
              type="button"
              size="sm"
              onClick={() => void openCreateModal()}
              className="h-9 gap-1.5 text-xs font-bold cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Orden de Pago</span>
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================
          4 TARJETAS KPI ESTANDARIZADAS
         ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-border shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Por Aprobar
            </p>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">
              {pendingApprovalCount}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-border shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Listas para Pagar
            </p>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">
              {payableOrders.length}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-border shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Saldo Pendiente (USD)
            </p>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">
              ${totalPendingUsdEq.toLocaleString("es-VE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-border shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pagadas (7 días)
            </p>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">
              {paid7dCount}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* ========================================================
          BARRA DE PESTAÑAS OPERATIVAS + BÚSQUEDA + ORIGEN
         ======================================================== */}
      <Card className="p-3.5 border-border shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { key: "ALL", label: `Todas (${paymentOrders.length})` },
                {
                  key: "PENDING_APPROVAL",
                  label: `Por Aprobar (${pendingApprovalCount})`,
                },
                {
                  key: "PAYABLE",
                  label: `Por Pagar (${payableOrders.length})`,
                },
                {
                  key: "PAID",
                  label: showFullPaidHistory
                    ? `Pagadas (${paidAllCount})`
                    : `Pagadas 7d (${paid7dCount})`,
                },
                {
                  key: "SUPPLIERS",
                  label: `Saldos por Proveedor (${supplierDebts.length})`,
                },
              ] as const
            ).map((tab) => (
              <Button
                key={tab.key}
                type="button"
                size="sm"
                variant={activeTab === tab.key ? "default" : "outline"}
                onClick={() => setActiveTab(tab.key)}
                className="h-8 text-xs px-3 cursor-pointer"
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {activeTab === "PAID" && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowFullPaidHistory((prev) => !prev)}
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>
                {showFullPaidHistory
                  ? "Ver últimos 7 días"
                  : "Ver historial completo"}
              </span>
            </Button>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === "SUPPLIERS"
                  ? "Buscar proveedor por razón social o RIF..."
                  : "Buscar por N° OP, Orden de Compra, Orden de Servicio, proveedor o concepto..."
              }
              className="pl-9 pr-8 h-9 text-xs bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {activeTab !== "SUPPLIERS" && (
            <div className="flex items-center gap-1.5 shrink-0">
              {(
                [
                  { key: "ALL", label: "Todos" },
                  { key: "PURCHASE_ORDER", label: "Compras" },
                  { key: "SERVICE_ORDER", label: "Servicios" },
                ] as const
              ).map((src) => (
                <Button
                  key={src.key}
                  type="button"
                  size="sm"
                  variant={sourceFilter === src.key ? "secondary" : "outline"}
                  onClick={() => setSourceFilter(src.key)}
                  className="h-9 text-xs px-3 cursor-pointer"
                >
                  {src.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ========================================================
          CONTENIDO PRINCIPAL: ÓRDENES DE PAGO UNIFICADAS O SALDOS
         ======================================================== */}
      {activeTab !== "SUPPLIERS" ? (
        <Card className="overflow-hidden border-border shadow-2xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="px-4 py-3 text-xs font-semibold">
                    Orden de Pago
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold">
                    Origen
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold">
                    Proveedor / Concepto
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold text-right">
                    Deuda Total
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold text-right">
                    Abonado
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold text-right">
                    Saldo Pendiente
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold text-center">
                    Estado
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold text-center">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-12 text-center text-xs text-muted-foreground"
                    >
                      <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
                      Cargando órdenes de pago y tesorería...
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-12 text-center text-xs text-muted-foreground"
                    >
                      No hay órdenes de pago que coincidan con los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : (
                  ordersPagination.paginatedItems.map((po) => {
                    const st =
                      STATUS_BADGES[po.status] || STATUS_BADGES.PENDIENTE_APROBACION;
                    const sym = currencySymbol(po.debtCurrency);
                    const total = Number(po.totalDebtAmount || 0);
                    const paid = Number(po.paidAmount || 0);
                    const rem = Number(po.remainingBalance || 0);
                    const isPurchase = po.sourceType === "PURCHASE_ORDER";
                    const originCode = isPurchase
                      ? po.purchaseOrder?.orderNumber ||
                        `ORD-${po.purchaseOrderId}`
                      : po.serviceOrder?.serviceOrderNumber ||
                        `OS-${po.serviceOrderId}`;
                    const originHref = isPurchase
                      ? `/purchasing/orders/${po.purchaseOrderId}`
                      : `/admin/financial/payments/${po.serviceOrderId}`;
                    const canPayNow =
                      po.status === "APROBADA" ||
                      po.status === "PAGADA_PARCIALMENTE";

                    return (
                      <TableRow
                        key={String(po.id)}
                        className="hover:bg-muted/40 transition-colors text-xs"
                      >
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <Link
                            href={`/purchasing/debts/${po.id}`}
                            className="font-mono font-bold text-primary hover:underline"
                          >
                            {po.paymentOrderNumber}
                          </Link>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {new Date(po.createdAt).toLocaleDateString("es-VE")}
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] gap-1 px-1.5 py-0",
                                isPurchase
                                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                                  : "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
                              )}
                            >
                              {isPurchase ? (
                                <ShoppingCart className="w-2.5 h-2.5" />
                              ) : (
                                <Wallet className="w-2.5 h-2.5" />
                              )}
                              <span>{isPurchase ? "Compra" : "Servicio"}</span>
                            </Badge>
                            <Link
                              href={originHref}
                              className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-primary hover:underline"
                            >
                              <span>{originCode}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-3 max-w-xs">
                          <div className="font-semibold text-foreground truncate">
                            {po.beneficiaryName}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {po.concept}
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-3 text-right font-mono font-medium text-foreground whitespace-nowrap">
                          {sym}{" "}
                          {total.toLocaleString("es-VE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>

                        <TableCell className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {sym}{" "}
                          {paid.toLocaleString("es-VE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>

                        <TableCell className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                          <span
                            className={
                              rem > 0.009
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }
                          >
                            {sym}{" "}
                            {rem.toLocaleString("es-VE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </TableCell>

                        <TableCell className="px-4 py-3 text-center whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={cn("text-[11px]", st.className)}
                          >
                            {st.label}
                          </Badge>
                        </TableCell>

                        <TableCell className="px-4 py-3 text-center whitespace-nowrap">
                          <Button
                            asChild
                            size="sm"
                            variant={canPayNow ? "default" : "outline"}
                            className={cn(
                              "h-7 text-xs gap-1.5 cursor-pointer",
                              canPayNow &&
                                "bg-emerald-600 hover:bg-emerald-700 text-white"
                            )}
                          >
                            <Link href={`/purchasing/debts/${po.id}`}>
                              {canPayNow ? (
                                <>
                                  <CreditCard className="w-3 h-3" />
                                  <span>Pagar</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3" />
                                  <span>Gestionar</span>
                                </>
                              )}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            currentPage={ordersPagination.currentPage}
            totalPages={ordersPagination.totalPages}
            pageSize={ordersPagination.pageSize}
            totalItems={ordersPagination.totalItems}
            onPageChange={ordersPagination.onPageChange}
            onPageSizeChange={ordersPagination.onPageSizeChange}
            pageSizeOptions={[10, 25, 50]}
            entityName="órdenes de pago"
          />
        </Card>
      ) : (
        /* Pestaña: Saldos Consolidados por Proveedor */
        <Card className="overflow-hidden border-border shadow-2xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="px-4 py-3 text-xs font-semibold">
                    Proveedor / RIF
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold text-right">
                    Saldo USD
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold text-right">
                    Saldo Bs.
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold text-right">
                    Saldo EUR
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold text-center">
                    Estado
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold text-center">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-center text-xs text-muted-foreground"
                    >
                      No se encontraron proveedores.
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliersPagination.paginatedItems.map((debt) => (
                    <TableRow
                      key={debt.id}
                      className="hover:bg-muted/40 transition-colors text-xs"
                    >
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2 font-semibold text-foreground">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{debt.name}</span>
                        </div>
                        <div className="ml-6 font-mono text-[10px] text-muted-foreground">
                          {debt.rifOrId}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-mono">
                        <div
                          className={
                            (debt.balanceUsd || 0) > 0.009
                              ? "font-bold text-rose-600 dark:text-rose-400"
                              : "text-muted-foreground"
                          }
                        >
                          $ {(debt.balanceUsd || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          C: {(debt.totalPurchasedUsd || 0).toFixed(2)} · P:{" "}
                          {(debt.totalPaidUsd || 0).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-mono">
                        <div
                          className={
                            (debt.balanceBs || 0) > 0.009
                              ? "font-bold text-rose-600 dark:text-rose-400"
                              : "text-muted-foreground"
                          }
                        >
                          Bs. {(debt.balanceBs || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          C: {(debt.totalPurchasedBs || 0).toFixed(2)} · P:{" "}
                          {(debt.totalPaidBs || 0).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-mono">
                        <div
                          className={
                            (debt.balanceEur || 0) > 0.009
                              ? "font-bold text-rose-600 dark:text-rose-400"
                              : "text-muted-foreground"
                          }
                        >
                          € {(debt.balanceEur || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          C: {(debt.totalPurchasedEur || 0).toFixed(2)} · P:{" "}
                          {(debt.totalPaidEur || 0).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        {!hasSupplierDebt(debt) ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                          >
                            Solvente
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[11px]"
                          >
                            Con Saldo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void openSupplierStatement(debt)}
                          className="h-7 text-xs gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Estado de Cuenta</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            currentPage={suppliersPagination.currentPage}
            totalPages={suppliersPagination.totalPages}
            pageSize={suppliersPagination.pageSize}
            totalItems={suppliersPagination.totalItems}
            onPageChange={suppliersPagination.onPageChange}
            onPageSizeChange={suppliersPagination.onPageSizeChange}
            pageSizeOptions={[10, 25, 50]}
            entityName="proveedores"
          />
        </Card>
      )}

      {/* ========================================================
          MODAL: NUEVA ORDEN DE PAGO (DESDE OC O OS APROBADA)
         ======================================================== */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-primary" />
              Nueva Orden de Pago
            </DialogTitle>
            <DialogDescription className="text-xs">
              Seleccione una Orden de Compra enviada o una Orden de Servicio aprobada para emitir su Orden de Pago en Tesorería.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePaymentOrder} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Button
                type="button"
                size="sm"
                variant={
                  createSourceTab === "PURCHASE_ORDER" ? "default" : "outline"
                }
                onClick={() => {
                  setCreateSourceTab("PURCHASE_ORDER");
                  setSelectedSource(null);
                }}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>
                  Órdenes de Compra ({eligibleSources.purchaseOrders.length})
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  createSourceTab === "SERVICE_ORDER" ? "default" : "outline"
                }
                onClick={() => {
                  setCreateSourceTab("SERVICE_ORDER");
                  setSelectedSource(null);
                }}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>
                  Órdenes de Servicio ({eligibleSources.serviceOrders.length})
                </span>
              </Button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                placeholder="Filtrar por número, proveedor o concepto..."
                className="pl-8 h-9 text-xs"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 border border-border rounded-xl p-2 bg-muted/20">
              {loadingSources ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-primary" />
                  Buscando documentos pendientes...
                </div>
              ) : modalSourcesList.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No hay{" "}
                  {createSourceTab === "PURCHASE_ORDER"
                    ? "órdenes de compra"
                    : "órdenes de servicio"}{" "}
                  disponibles sin Orden de Pago activa.
                </div>
              ) : (
                modalSourcesList.map((item) => {
                  const isSelected =
                    selectedSource?.id === item.id &&
                    selectedSource?.sourceType === item.sourceType;
                  const sym = currencySymbol(item.debtCurrency);
                  return (
                    <button
                      key={`${item.sourceType}-${item.id}`}
                      type="button"
                      onClick={() => setSelectedSource(item)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3",
                        isSelected
                          ? "bg-primary/10 border-primary ring-1 ring-primary/30"
                          : "bg-background border-border hover:border-primary/40"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-foreground">
                            {item.code}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono py-0"
                          >
                            {item.debtCurrency}
                          </Badge>
                        </div>
                        <div className="text-xs font-medium text-foreground truncate mt-0.5">
                          {item.beneficiaryName}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {item.concept}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-xs text-foreground">
                          {sym}{" "}
                          {item.remainingBalance.toLocaleString("es-VE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Saldo pendiente
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase">
                Instrucciones / Notas para Aprobación (Opcional)
              </Label>
              <Textarea
                rows={2}
                value={opNotes}
                onChange={(e) => setOpNotes(e.target.value)}
                placeholder="Ej: Prioridad semanal, verificar cuenta destino..."
                className="text-xs"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!selectedSource || creatingOp}
                className="gap-1.5"
              >
                {creatingOp && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Generar Orden de Pago</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL: ESTADO DE CUENTA POR PROVEEDOR
         ======================================================== */}
      <Dialog
        open={Boolean(selectedSupplier)}
        onOpenChange={(open) => {
          if (!open) setSelectedSupplier(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Estado de Cuenta · {selectedSupplier?.name}
            </DialogTitle>
            <DialogDescription className="text-xs font-mono">
              RIF / Cédula: {selectedSupplier?.rifOrId}
            </DialogDescription>
          </DialogHeader>

          {loadingStatement ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              Cargando estado de cuenta...
            </div>
          ) : statement ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                <UniversalPdfDownloadButton
                  document={<SupplierDebtPdfDocument statement={statement} />}
                  fileName={`Estado_Cuenta_${(selectedSupplier?.name || "Proveedor").replace(/\s+/g, "_")}`}
                  buttonLabel="Descargar PDF"
                  previewLabel="Vista Previa"
                  dialogTitle={`Estado de Cuenta - ${selectedSupplier?.name}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="p-3 border-border shadow-none">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Saldo USD
                  </div>
                  <div className="text-lg font-bold font-mono text-foreground mt-0.5">
                    $ {(statement.balanceUsd || 0).toFixed(2)}
                  </div>
                </Card>
                <Card className="p-3 border-border shadow-none">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Saldo Bolívares
                  </div>
                  <div className="text-lg font-bold font-mono text-foreground mt-0.5">
                    Bs. {(statement.balanceBs || 0).toFixed(2)}
                  </div>
                </Card>
                <Card className="p-3 border-border shadow-none">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Saldo Euros
                  </div>
                  <div className="text-lg font-bold font-mono text-foreground mt-0.5">
                    € {(statement.balanceEur || 0).toFixed(2)}
                  </div>
                </Card>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="px-3 py-2 text-xs">Orden</TableHead>
                      <TableHead className="px-3 py-2 text-xs text-right">
                        Total
                      </TableHead>
                      <TableHead className="px-3 py-2 text-xs text-right">
                        Pagado
                      </TableHead>
                      <TableHead className="px-3 py-2 text-xs text-right">
                        Saldo
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statement.orders.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-6 text-center text-xs text-muted-foreground"
                        >
                          Sin órdenes registradas.
                        </TableCell>
                      </TableRow>
                    ) : (
                      statement.orders.map((ord) => {
                        const sym = currencySymbol(ord.orderCurrency);
                        return (
                          <TableRow key={ord.id} className="text-xs">
                            <TableCell className="px-3 py-2 font-mono">
                              <Link
                                href={`/purchasing/orders/${ord.id}`}
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                <span>{ord.orderNumber}</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </TableCell>
                            <TableCell className="px-3 py-2 text-right font-mono">
                              {sym} {(ord.totalAgreed ?? ord.totalUsd).toFixed(2)}
                            </TableCell>
                            <TableCell className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                              {sym} {(ord.paidAgreed ?? ord.paidUsd).toFixed(2)}
                            </TableCell>
                            <TableCell className="px-3 py-2 text-right font-mono font-bold">
                              {sym}{" "}
                              {(ord.balanceAgreed ?? ord.balanceUsd).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
