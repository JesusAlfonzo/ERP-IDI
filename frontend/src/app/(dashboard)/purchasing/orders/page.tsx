"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PurchasingClientService } from "@/services/purchasing.service";
import { InventoryClientService } from "@/services/inventory.service";
import { CurrencyService } from "@/services/currency.service";
import { AuthService } from "@/services/auth.service";
import {
  type CurrencyCode,
  CURRENCY_OPTIONS,
  getCurrencySymbol,
  normalizeCurrencyCode,
  formatCurrencyAmount,
} from "@/utils/currency";
import type {
  PurchaseOrder,
  Supplier,
  Currency,
  PurchaseOrderStatus,
} from "@/types/purchasing";
import type { Product, Category } from "@/types/inventory";
import { ProductPackagingSelector } from "@/components/purchasing/ProductPackagingSelector";
import {
  ShoppingCart,
  Plus,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Building2,
  Loader2,
  PackageCheck,
  Eye,
  ShieldCheck,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const STATUS_BADGES: Record<
  PurchaseOrderStatus,
  {
    label: string;
    variant:
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | "success"
      | "warning"
      | "info"
      | "purple";
  }
> = {
  BORRADOR: { label: "Borrador", variant: "secondary" },
  PENDIENTE: { label: "Pendiente", variant: "warning" },
  APROBADA: { label: "Aprobada", variant: "info" },
  EN_PROCESO: { label: "En Tránsito", variant: "purple" },
  PARCIAL: { label: "Parcial", variant: "purple" },
  COMPLETADA: { label: "Completada", variant: "success" },
  RECIBIDO: { label: "Recibido", variant: "success" },
  CANCELADA: { label: "Cancelada", variant: "destructive" },
  CANCELADO: { label: "Cancelado", variant: "destructive" },
};

interface FormRow {
  productId: number;
  unitId: number;
  quantityOrdered: number;
  unitPrice: number;
  isExempt: boolean;
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Modal de Creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [currencyId, setCurrencyId] = useState<string>("");
  const [exchangeRate, setExchangeRate] = useState<number>(75.0);
  const [bcvRates, setBcvRates] = useState<{ USD: number; EUR: number; VED: number }>({
    USD: 75.0,
    EUR: 81.5,
    VED: 1.0,
  });
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<FormRow[]>([
    { productId: 0, unitId: 0, quantityOrdered: 1, unitPrice: 0, isExempt: false },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersData, suppliersData, currenciesData, productsData, categoriesData, currentRates] =
        await Promise.all([
          PurchasingClientService.getOrders(statusFilter || undefined).catch(
            () => []
          ),
          PurchasingClientService.getSuppliers().catch(() => []),
          PurchasingClientService.getCurrencies().catch(() => []),
          InventoryClientService.getProducts().catch(() => []),
          InventoryClientService.getCategories().catch(() => []),
          CurrencyService.getCurrentRates().catch(() => null),
        ]);
      setOrders(ordersData);
      setSuppliers(suppliersData);
      setCurrencies(currenciesData);
      setCatalogProducts(productsData);
      setCategories(categoriesData);

      if (currentRates) {
        const rates = {
          USD: Number(currentRates.USD || currentRates.rates?.USD || 75.0),
          EUR: Number(currentRates.EUR || currentRates.rates?.EUR || 81.5),
          VED: 1.0,
        };
        setBcvRates(rates);
        setExchangeRate((prev) => {
          if (currency === "USD") return rates.USD;
          if (currency === "EUR") return rates.EUR;
          if (currency === "VED") return 1.0;
          return prev || rates.USD;
        });
      }

      if (currenciesData.length > 0 && !currencyId) {
        const def = currenciesData.find((c) => c.isDefault) || currenciesData[0];
        setCurrencyId(String(def?.id || ""));
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, currencyId, currency]);

  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    setCurrency(newCurrency);
    if (newCurrency === "USD") {
      setExchangeRate(bcvRates.USD);
    } else if (newCurrency === "EUR") {
      setExchangeRate(bcvRates.EUR);
    } else if (newCurrency === "VED") {
      setExchangeRate(1.0);
    }

    const matched = currencies.find(
      (c) => c.code === (newCurrency === "VED" ? "VES" : newCurrency)
    );
    if (matched) {
      setCurrencyId(String(matched.id));
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const init = async () => {
      if (isMounted) await loadData();
    };
    void init();

    const handleExternalRate = () => {
      if (isMounted) void loadData();
    };
    window.addEventListener("idi:exchange-rate-updated", handleExternalRate);

    return () => {
      isMounted = false;
      window.removeEventListener("idi:exchange-rate-updated", handleExternalRate);
    };
  }, [router, loadData]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { productId: 0, unitId: 0, quantityOrdered: 1, unitPrice: 0, isExempt: false },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, pId: number, unitId: number) => {
    const selectedProd = catalogProducts.find((p) => p.id === pId);
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId: pId,
        unitId,
        isExempt: selectedProd?.isTaxExempt ?? false,
      };
      return updated;
    });
  };

  const handleRowChange = <K extends keyof FormRow>(
    index: number,
    field: K,
    val: FormRow[K]
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: val };
      }
      return updated;
    });
  };

  const handleToggleAllExempt = (exempt: boolean) => {
    setItems((prev) => prev.map((row) => ({ ...row, isExempt: exempt })));
  };

  // Resumen fiscal SENIAT en vivo
  const fiscalSummary = useMemo(() => {
    let taxableAmount = 0;
    let exemptAmount = 0;

    for (const item of items) {
      const lineSubtotal =
        Math.round((Number(item.quantityOrdered) || 0) * (Number(item.unitPrice) || 0) * 100) / 100;
      if (item.isExempt) {
        exemptAmount += lineSubtotal;
      } else {
        taxableAmount += lineSubtotal;
      }
    }

    taxableAmount = Math.round(taxableAmount * 100) / 100;
    exemptAmount = Math.round(exemptAmount * 100) / 100;
    const iva16 = Math.round(taxableAmount * 0.16 * 100) / 100;
    const totalAmount = Math.round((taxableAmount + exemptAmount + iva16) * 100) / 100;
    const rate = Number(exchangeRate) || 1.0;
    const totalBs =
      currency === "VED"
        ? totalAmount
        : Math.round(totalAmount * rate * 100) / 100;

    return {
      taxableAmount,
      exemptAmount,
      iva16,
      totalAmount,
      totalBs,
    };
  }, [items, exchangeRate, currency]);

  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const hasInvalidItem = items.some(
      (it) => !it.productId || it.quantityOrdered <= 0 || it.unitPrice <= 0
    );

    if (hasInvalidItem) {
      setFeedback({
        status: "error",
        message:
          "Asegúrese de seleccionar producto, cantidad y costo unitario válido en cada renglón.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await PurchasingClientService.createOrder({
        supplierId: supplierId ? Number(supplierId) : null,
        currency,
        currencyId: currencyId ? Number(currencyId) : undefined,
        exchangeRate: Number(exchangeRate),
        notes: notes.trim() || null,
        items: items.map((it) => ({
          productId: Number(it.productId),
          unitId: Number(it.unitId),
          quantityOrdered: Number(it.quantityOrdered),
          unitPrice: Number(it.unitPrice),
          isExempt: Boolean(it.isExempt),
        })),
      });

      setFeedback({
        status: "success",
        message: "Orden de compra creada exitosamente con soporte fiscal SENIAT.",
      });
      await loadData();

      setTimeout(() => {
        setIsModalOpen(false);
        setSupplierId("");
        setNotes("");
        setItems([
          { productId: 0, unitId: 0, quantityOrdered: 1, unitPrice: 0, isExempt: false },
        ]);
        setFeedback(null);
      }, 1000);
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error ? err.message : "Error al registrar la orden de compra.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentSymbol = getCurrencySymbol(currency);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            Órdenes de Compra y Abastecimiento
          </h1>
          <p className="text-xs text-muted-foreground">
            Control de adquisiciones comerciales, soporte fiscal SENIAT (IVA 16%), tasa cambiaria BCV y recepción en cuarentena
          </p>
        </div>

        <Button
          onClick={() => {
            setIsModalOpen(true);
            setFeedback(null);
          }}
          className="self-start sm:self-auto gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Orden de Compra
        </Button>
      </div>

      {feedback && (
        <Alert
          variant={feedback.status === "success" ? "default" : "destructive"}
          className={feedback.status === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : ""}
        >
          {feedback.status === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      {/* Barra de Filtros */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-muted/50 border border-input rounded-md px-3 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-ring outline-none"
            >
              <option value="">Todos los estados</option>
              <option value="BORRADOR">Borradores</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="APROBADA">Aprobadas</option>
              <option value="EN_PROCESO">En Tránsito</option>
              <option value="PARCIAL">Entregas Parciales</option>
              <option value="COMPLETADA">Completadas</option>
              <option value="RECIBIDO">Recibidos</option>
              <option value="CANCELADA">Canceladas</option>
            </select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => loadData()}
            title="Actualizar listado"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardContent>
      </Card>

      {/* Tabla de Órdenes */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="py-3 px-4">N° Orden</TableHead>
                <TableHead className="py-3 px-4">Proveedor</TableHead>
                <TableHead className="py-3 px-4">Fecha Emisión</TableHead>
                <TableHead className="py-3 px-4 text-center">Moneda / Tasa</TableHead>
                <TableHead className="py-3 px-4 text-right">Total USD</TableHead>
                <TableHead className="py-3 px-4 text-center">Renglones</TableHead>
                <TableHead className="py-3 px-4 text-center">Estado</TableHead>
                <TableHead className="py-3 px-4 text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    Cargando órdenes de compra...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    No se encontraron órdenes de compra registradas.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const badge = STATUS_BADGES[order.status] || {
                    label: order.status,
                    variant: "secondary" as const,
                  };
                  const canReceive =
                    order.status !== "RECIBIDO" &&
                    order.status !== "COMPLETADA" &&
                    order.status !== "CANCELADA" &&
                    order.status !== "CANCELADO";

                  return (
                    <TableRow key={String(order.id)}>
                      <TableCell className="py-3 px-4 font-mono font-bold text-foreground">
                        <div>{order.orderNumber || `#${order.id}`}</div>
                        {order.requisition && (
                          <div className="text-[10px] text-primary font-mono">
                            Preorden: {order.requisition.requisitionNumber}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          {order.supplier?.name || "Proveedor General"}
                        </div>
                        {(order.supplier?.rifOrId || order.supplier?.rif) && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {order.supplier.rifOrId || order.supplier.rif}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-mono text-foreground">
                        <span className="font-bold">{normalizeCurrencyCode(order.currency)}</span>
                        {normalizeCurrencyCode(order.currency) !== "VED" && Number(order.exchangeRate || 1) > 1 && (
                          <div className="text-[10px] text-muted-foreground">
                            {Number(order.exchangeRate).toFixed(2)} Bs/{normalizeCurrencyCode(order.currency) === "EUR" ? "€" : "$"}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        {formatCurrencyAmount(order.totalAmount ?? order.totalAmountUsd ?? order.total ?? 0, order.currency)}
                        {normalizeCurrencyCode(order.currency) !== "VED" && order.totalAmountBs && (
                          <div className="text-[10px] text-muted-foreground font-normal">
                            Bs. {Number(order.totalAmountBs).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-semibold text-foreground">
                        {order.items?.length || 0}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <Badge variant={badge.variant}>
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button variant="outline" size="sm" asChild className="h-7 text-[11px] gap-1">
                            <Link href={`/purchasing/orders/${order.id}`}>
                              <Eye className="w-3.5 h-3.5" />
                              Detalle
                            </Link>
                          </Button>
                          {canReceive && (
                            <Button variant="outline" size="sm" asChild className="h-7 text-[11px] gap-1 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100">
                              <Link href={`/purchasing/orders/${order.id}/receive`}>
                                <PackageCheck className="w-3.5 h-3.5" />
                                Recibir
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal: Nueva Orden con Soporte Fiscal SENIAT */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
          <DialogHeader className="p-5 border-b border-border shrink-0 bg-muted/40">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Crear Nueva Orden de Compra
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Emisión con soporte fiscal SENIAT (IVA 16% / Exentos), tasa cambiaria BCV y empaques
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmitOrder} className="flex flex-col flex-1 min-h-0">
            {/* Cuerpo Scrolleable */}
            <div className="p-6 overflow-y-auto pr-3 space-y-5 flex-1 scroll-smooth">
              {/* Datos Comerciales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/40 p-4 rounded-xl border border-border">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Proveedor Comercial
                  </Label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium"
                  >
                    <option value="">-- Proveedor Opcional / Caja Chica --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.rifOrId || s.rif || "N/A"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Moneda de Compra *
                  </Label>
                  <select
                    value={currency}
                    onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium"
                    required
                  >
                    {CURRENCY_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    {currency === "VED"
                      ? "Tasa de Cambio (VED)"
                      : `Tasa BCV del Día (${currency === "EUR" ? "Bs./EUR" : "Bs./USD"})`}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={exchangeRate}
                      disabled={currency === "VED"}
                      onChange={(e) => setExchangeRate(Number(e.target.value))}
                      className="pr-12 font-mono font-bold"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                      {currency === "VED" ? "1.00" : currency === "EUR" ? "Bs./€" : "Bs./$"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Renglones / Ítems */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border border-border">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Renglones ({items.length})
                    </span>
                    <span className="text-border hidden sm:inline">|</span>
                    <div className="flex items-center gap-1.5">
                      <Label
                        htmlFor="order-category-filter"
                        className="text-xs font-medium text-muted-foreground whitespace-nowrap"
                      >
                        Filtrar productos por categoría:
                      </Label>
                      <select
                        id="order-category-filter"
                        value={selectedCategoryFilter}
                        onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                        className="bg-background border border-input hover:border-ring rounded-md px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors cursor-pointer"
                      >
                        <option value="">Todas las categorías</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleAllExempt(true)}
                      className="h-7 text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                    >
                      Marcar todo Exento
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleAllExempt(false)}
                      className="h-7 text-[11px]"
                    >
                      Marcar todo Gravable (16%)
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddItem}
                      className="h-7 text-xs gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar renglón
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => {
                    const selectedProd = catalogProducts.find((p) => p.id === item.productId);
                    const activeUnit =
                      item.unitId === selectedProd?.purchaseUnitId
                        ? selectedProd?.purchaseUnit?.abbreviation || selectedProd?.purchaseUnit?.name
                        : selectedProd?.baseUnit?.abbreviation || selectedProd?.baseUnit?.name || "";
                    const hasConversion =
                      selectedProd?.conversionFactor &&
                      Number(selectedProd.conversionFactor) > 1 &&
                      item.unitId === selectedProd?.purchaseUnitId;
                    const baseQty = hasConversion
                      ? Math.round(Number(item.quantityOrdered || 0) * Number(selectedProd.conversionFactor) * 100) / 100
                      : null;

                    return (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-muted/30 p-4 rounded-xl border border-border shadow-2xs"
                      >
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-background border border-border text-xs font-mono font-bold text-muted-foreground shrink-0">
                          {idx + 1}
                        </div>

                        {/* Selector de Producto y Empaque */}
                        <div className="flex-1 min-w-0">
                          <ProductPackagingSelector
                            products={catalogProducts}
                            selectedCategoryId={selectedCategoryFilter}
                            selectedProductId={item.productId}
                            selectedUnitId={item.unitId}
                            onChange={(pId, uId) => handleProductSelect(idx, pId, uId)}
                          />
                        </div>

                        {/* Cantidad ordenada */}
                        <div className="w-full sm:w-32 shrink-0 space-y-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Cantidad {activeUnit ? `(${activeUnit})` : ""}
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={item.quantityOrdered}
                            onChange={(e) =>
                              handleRowChange(
                                idx,
                                "quantityOrdered",
                                Math.max(1, Number(e.target.value))
                              )
                            }
                            className="font-mono font-bold"
                            required
                          />
                          {hasConversion && baseQty !== null && (
                            <span className="text-[10px] text-primary font-medium block mt-0.5 truncate">
                              ≈ {baseQty} {selectedProd?.baseUnit?.abbreviation || "UND"}
                            </span>
                          )}
                        </div>

                        {/* Precio Unitario */}
                        <div className="w-full sm:w-32 shrink-0 space-y-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Costo Unit. ({currentSymbol})
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={item.unitPrice || ""}
                            onChange={(e) =>
                              handleRowChange(
                                idx,
                                "unitPrice",
                                Math.max(0, Number(e.target.value))
                              )
                            }
                            className="font-mono font-bold text-primary"
                            required
                          />
                        </div>

                        {/* Switch Exento */}
                        <div className="sm:self-center shrink-0 pt-3 sm:pt-0">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <Checkbox
                              checked={item.isExempt}
                              onCheckedChange={(checked) =>
                                handleRowChange(idx, "isExempt", checked === true)
                              }
                            />
                            <span
                              className={`text-[11px] font-semibold ${
                                item.isExempt ? "text-emerald-700" : "text-muted-foreground"
                              }`}
                            >
                              {item.isExempt ? "Exento" : "Gravable"}
                            </span>
                          </label>
                        </div>

                        {/* Botón eliminar */}
                        <div className="sm:self-end mb-0.5 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={items.length === 1}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Eliminar renglón"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desglose Fiscal SENIAT */}
              <div className="bg-muted/40 p-4 rounded-xl border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Cálculo de Base Imponible, Exentos e IVA 16% según normativa tributaria. La tasa BCV queda guardada en el comprobante.
                  </span>
                </div>

                <div className="w-full sm:w-80 bg-background p-3 rounded-lg border border-border shadow-2xs space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal Gravable (Base 16%):</span>
                    <span className="font-mono font-semibold">
                      {currentSymbol} {fiscalSummary.taxableAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal Exento:</span>
                    <span className="font-mono font-semibold text-emerald-700">
                      {currentSymbol} {fiscalSummary.exemptAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>IVA (16%):</span>
                    <span className="font-mono font-semibold">
                      {currentSymbol} {fiscalSummary.iva16.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-border pt-1.5 flex justify-between font-bold text-foreground text-sm">
                    <span>Total General ({currency}):</span>
                    <span className="font-mono text-primary">
                      {currentSymbol} {fiscalSummary.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  {currency !== "VED" && (
                    <div className="border-t border-dashed border-border pt-1.5 space-y-0.5">
                      <div className="flex justify-between text-muted-foreground font-mono text-[11px]">
                        <span className="font-semibold text-foreground">Monto Total en Bs.:</span>
                        <span className="font-bold text-foreground">
                          Bs. {fiscalSummary.totalBs.toLocaleString("es-VE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">
                        Calculado a la tasa oficial BCV de {exchangeRate.toFixed(2)} Bs./{currency === "EUR" ? "€" : "$"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Observaciones */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Notas de Compra o Términos de Despacho (Opcional)
                </Label>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Especificaciones sobre transporte en frío, acuerdos de pago..."
                  className="resize-none"
                />
              </div>
            </div>

            {/* Pie Fijo */}
            <DialogFooter className="flex flex-row items-center justify-between p-4 px-6 border-t border-border bg-muted/40 shrink-0 sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Total orden:{" "}
                <strong className="text-foreground">
                  {currentSymbol} {fiscalSummary.totalAmount.toFixed(2)} {currency}
                </strong>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Emitiendo orden..." : "Crear Orden de Compra"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
