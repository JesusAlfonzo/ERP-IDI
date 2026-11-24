"use client";

import React, { useState, useEffect, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BankAccountService } from "@/services/bank-account.service";
import {
  InventoryMasterService,
  type DepartmentItem,
} from "@/services/inventory-master.service";
import { PurchasingClientService } from "@/services/purchasing.service";
import { CurrencyService } from "@/services/currency.service";
import type { Supplier } from "@/types/purchasing";
import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/common/SearchableSelect";
import { RifInput } from "@/components/common/RifInput";
import { PhoneInput } from "@/components/common/PhoneInput";
import {
  validatePhoneValue,
  validateRifValue,
} from "@/utils/venezuela-formatters";
import { cn } from "@/lib/utils";
import {
  Wallet,
  Building2,
  Calendar,
  AlertCircle,
  Loader2,
  ArrowLeft,
  FileCheck2,
  FileText,
  Link2,
  X,
  Plus,
  Wrench,
  User,
  Mail,
  MapPin,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/utils/toast";

type SupplierMode = "EXISTING" | "NEW";

const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  VENTAS: "Ventas / Insumos",
  SERVICIOS: "Servicios",
  AMBOS: "Mixto (Ventas y Servicios)",
};

export default function NewServiceOrderPage() {
  const router = useRouter();

  // Maestros
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [bcvRates, setBcvRates] = useState<{
    USD: number;
    EUR: number;
    VED: number;
  }>({
    USD: 75.0,
    EUR: 81.5,
    VED: 1.0,
  });
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Modo de selección de proveedor
  const [supplierMode, setSupplierMode] = useState<SupplierMode>("EXISTING");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | number>(
    ""
  );

  // Formulario estructurado para Nuevo Proveedor de Servicio (auto-guardado)
  const [newSupplierForm, setNewSupplierForm] = useState({
    rifOrId: "",
    name: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
  });
  const [conflictSupplier, setConflictSupplier] = useState<Supplier | null>(
    null
  );
  const [linkingExisting, setLinkingExisting] = useState(false);

  // Resto del formulario de Orden de Servicio
  const [departmentId, setDepartmentId] = useState<string>("");
  const [concept, setConcept] = useState("");
  const [transactionCurrency, setTransactionCurrency] = useState<
    "USD" | "VED" | "EUR"
  >("USD");
  const [amountPaid, setAmountPaid] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [estimatedDate, setEstimatedDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [supportUrl, setSupportUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    void (async () => {
      try {
        const [sups, deps, ratesData] = await Promise.all([
          PurchasingClientService.getSuppliers({ includeInactive: true }).catch(
            () => []
          ),
          InventoryMasterService.getDepartments(true).catch(() => []),
          CurrencyService.getCurrentRates().catch(() => null),
        ]);

        if (!ignore) {
          setAllSuppliers(sups);
          setDepartments(deps);
          if (ratesData) {
            setBcvRates({
              USD: Number(ratesData.USD || ratesData.rates?.USD || 75.0),
              EUR: Number(ratesData.EUR || ratesData.rates?.EUR || 81.5),
              VED: 1.0,
            });
          }
        }
      } catch {
        toast.error("Error al cargar catálogos.");
      } finally {
        if (!ignore) setLoadingInitial(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  // Solo proveedores activos de tipo SERVICIOS o AMBOS en el selector principal
  const serviceSuppliers = useMemo(() => {
    return allSuppliers.filter(
      (s) =>
        s.isActive !== false &&
        (s.supplierType === "SERVICIOS" || s.supplierType === "AMBOS")
    );
  }, [allSuppliers]);

  const supplierOptions = useMemo<SearchableOption<Supplier>[]>(() => {
    return serviceSuppliers.map((s) => ({
      value: s.id,
      label: s.name,
      sublabel: [
        s.rifOrId || s.rif,
        s.supplierType === "AMBOS" ? "Mixto" : "Servicios",
        s.contactName,
        s.phone,
      ]
        .filter(Boolean)
        .join(" · "),
      searchTerms: [
        s.name,
        s.rifOrId || s.rif || "",
        s.contactName || "",
        s.phone || "",
        s.email || "",
      ],
      badgeText: s.rifOrId || s.rif,
      data: s,
    }));
  }, [serviceSuppliers]);

  const selectedSupplierObj = useMemo(
    () =>
      allSuppliers.find((s) => String(s.id) === String(selectedSupplierId)) ||
      null,
    [allSuppliers, selectedSupplierId]
  );

  // Detección instantánea en memoria cuando el usuario escribe un RIF ya registrado
  const detectedExistingByRif = useMemo(() => {
    if (supplierMode !== "NEW") return null;
    const targetRif = newSupplierForm.rifOrId.trim().toUpperCase();
    if (!targetRif) return null;
    return (
      allSuppliers.find(
        (s) => (s.rifOrId || s.rif || "").trim().toUpperCase() === targetRif
      ) || null
    );
  }, [supplierMode, newSupplierForm.rifOrId, allSuppliers]);

  const matchedExistingSupplier = detectedExistingByRif || conflictSupplier;

  const handleLinkExistingSupplier = async (sup: Supplier) => {
    setLinkingExisting(true);
    setFeedback(null);
    try {
      const needsPromotion =
        sup.supplierType === "VENTAS" || !sup.supplierType || sup.isActive === false;
      let resolvedSup = sup;

      if (needsPromotion) {
        const nextType =
          sup.supplierType === "VENTAS" || !sup.supplierType
            ? "AMBOS"
            : sup.supplierType;
        resolvedSup = await PurchasingClientService.updateSupplier(sup.id, {
          supplierType: nextType,
          isActive: true,
        });
        setAllSuppliers((prev) =>
          prev.map((item) => (item.id === resolvedSup.id ? resolvedSup : item))
        );
        toast.success(
          `"${resolvedSup.name}" ahora está habilitado también como Proveedor de Servicios (Mixto) y vinculado a esta orden.`
        );
      } else {
        toast.success(
          `Proveedor "${resolvedSup.name}" vinculado a esta orden de servicio.`
        );
      }

      setSelectedSupplierId(resolvedSup.id);
      setSupplierMode("EXISTING");
      setConflictSupplier(null);
    } catch (err: unknown) {
      let msg = "No se pudo vincular el proveedor existente.";
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        if (resErr.response?.data?.message) msg = resErr.response.data.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      toast.error(msg);
      setFeedback(msg);
    } finally {
      setLinkingExisting(false);
    }
  };

  const handleCurrencyChange = (curr: "USD" | "VED" | "EUR") => {
    setTransactionCurrency(curr);
    if (curr === "VED") {
      setExchangeRate(bcvRates.USD.toFixed(2));
    } else if (curr === "EUR") {
      setExchangeRate(bcvRates.EUR.toFixed(2));
    } else {
      setExchangeRate("");
    }
  };

  const dynamicEquivalentUsd = useMemo(() => {
    const amt = parseFloat(amountPaid);
    if (Number.isNaN(amt) || amt <= 0) return 0;
    if (transactionCurrency === "USD") return amt;
    if (transactionCurrency === "VED") {
      const rate = parseFloat(exchangeRate) || bcvRates.USD || 1;
      return rate > 0 ? amt / rate : 0;
    }
    const eurRate = parseFloat(exchangeRate) || bcvRates.EUR || 1;
    const usdRate = bcvRates.USD || 1;
    return usdRate > 0 ? (amt * eurRate) / usdRate : amt;
  }, [amountPaid, transactionCurrency, exchangeRate, bcvRates]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!concept.trim()) {
      setFeedback("Debe describir el concepto del servicio.");
      return;
    }

    if (supplierMode === "EXISTING") {
      if (!selectedSupplierId) {
        setFeedback(
          "Seleccione un proveedor de servicio registrado o cambie a 'Nuevo Proveedor de Servicio'."
        );
        return;
      }
    } else {
      const rifCheck = validateRifValue(newSupplierForm.rifOrId);
      if (!rifCheck.valid) {
        setFeedback(rifCheck.error || "El RIF/Cédula del proveedor es inválido.");
        return;
      }
      if (!newSupplierForm.name.trim()) {
        setFeedback(
          "La Razón Social o Nombre del prestador de servicio es obligatoria."
        );
        return;
      }
      const phoneCheck = validatePhoneValue(newSupplierForm.phone);
      if (!phoneCheck.valid) {
        setFeedback(phoneCheck.error || "El número de teléfono es inválido.");
        return;
      }
      if (matchedExistingSupplier) {
        setFeedback(
          `El RIF ${matchedExistingSupplier.rifOrId || matchedExistingSupplier.rif} ya está registrado (${matchedExistingSupplier.name}). Use el botón "Vincular proveedor" para asociarlo sin duplicarlo.`
        );
        return;
      }
    }

    const parsedAmt = parseFloat(amountPaid);
    if (Number.isNaN(parsedAmt) || parsedAmt <= 0) {
      setFeedback("El monto estimado del servicio debe ser mayor a 0.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await BankAccountService.createDirectPayment({
        concept: concept.trim(),
        supplierId:
          supplierMode === "EXISTING" ? Number(selectedSupplierId) : null,
        newSupplier:
          supplierMode === "NEW"
            ? {
                rifOrId: newSupplierForm.rifOrId.trim(),
                name: newSupplierForm.name.trim(),
                contactName: newSupplierForm.contactName.trim() || null,
                phone: newSupplierForm.phone.trim() || null,
                email: newSupplierForm.email.trim() || null,
                address: newSupplierForm.address.trim() || null,
                supplierType: "SERVICIOS",
              }
            : null,
        departmentId: departmentId ? Number(departmentId) : null,
        amountPaid: parsedAmt,
        transactionCurrency,
        exchangeRate:
          transactionCurrency === "USD"
            ? 1.0
            : parseFloat(exchangeRate) ||
              (transactionCurrency === "EUR" ? bcvRates.EUR : bcvRates.USD),
        estimatedDate: estimatedDate || null,
        supportUrl: supportUrl.trim() || null,
        notes: notes.trim() || null,
      });

      toast.success(
        supplierMode === "NEW"
          ? `Orden de servicio ${created.serviceOrderNumber || `#${created.id}`} creada y proveedor registrado automáticamente en el catálogo.`
          : `Orden de servicio ${created.serviceOrderNumber || `#${created.id}`} creada en estado Borrador.`
      );
      router.push(`/admin/financial/payments/${created.id}`);
    } catch (err: unknown) {
      let msg = "Error al crear la orden de servicio.";
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as {
          response?: {
            status?: number;
            data?: { message?: string; existingSupplier?: Supplier };
          };
        };
        if (resErr.response?.data?.message) msg = resErr.response.data.message;
        if (
          resErr.response?.status === 409 &&
          resErr.response?.data?.existingSupplier
        ) {
          setConflictSupplier(resErr.response.data.existingSupplier);
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setFeedback(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Cargando catálogos de proveedores y áreas...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================
          ENCABEZADO ESTANDARIZADO
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => router.push("/admin/financial/payments")}
            className="h-9 w-9 shrink-0 cursor-pointer"
            title="Volver a Órdenes de Servicio"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Wallet className="w-6 h-6 text-primary" />
                Nueva Orden de Servicio
              </h1>
              <Badge
                variant="secondary"
                className="text-xs bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
              >
                Borrador
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registro inicial del servicio para posterior aprobación, orden de pago y liquidación
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/financial/payments")}
            className="h-9 text-xs cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            form="service-order-form"
            type="submit"
            size="sm"
            disabled={submitting}
            className="h-9 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileCheck2 className="w-4 h-4" />
            )}
            <span>{submitting ? "Creando..." : "Crear Orden de Servicio"}</span>
          </Button>
        </div>
      </div>

      {feedback && (
        <Alert variant="destructive" className="animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Verifique los datos</AlertTitle>
          <AlertDescription className="flex items-center justify-between text-xs">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="opacity-70 hover:opacity-100 cursor-pointer ml-3"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      <form id="service-order-form" onSubmit={handleSubmit} className="space-y-6">
        {/* ========================================================
            SECCIÓN 1: PROVEEDOR DE SERVICIO Y ÁREA SOLICITANTE
           ======================================================== */}
        <Card className="p-5 border-border shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold text-foreground">
                1. Proveedor de Servicio y Área Solicitante
              </CardTitle>
            </div>

            {/* Selector de modo: Registrado vs Nuevo Proveedor */}
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSupplierMode("EXISTING");
                  setConflictSupplier(null);
                  setFeedback(null);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                  supplierMode === "EXISTING"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Proveedor Registrado ({serviceSuppliers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSupplierMode("NEW");
                  setSelectedSupplierId("");
                  setFeedback(null);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                  supplierMode === "NEW"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Proveedor de Servicio</span>
              </button>
            </div>
          </div>

          {supplierMode === "EXISTING" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold">
                  Proveedor de Servicio Registrado *
                </Label>
                <SearchableSelect
                  options={supplierOptions}
                  value={selectedSupplierId}
                  onChange={(val) => setSelectedSupplierId(val)}
                  placeholder="Buscar proveedor de servicio por nombre o RIF..."
                  emptyMessage="No hay proveedores de servicio registrados. Use 'Nuevo Proveedor de Servicio'."
                />
                {selectedSupplierObj && (
                  <div className="p-2.5 rounded-lg bg-muted/30 border border-border text-[11px] flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                    <span className="font-mono font-semibold text-foreground">
                      {selectedSupplierObj.rifOrId || selectedSupplierObj.rif}
                    </span>
                    {selectedSupplierObj.phone && (
                      <span>Tel: {selectedSupplierObj.phone}</span>
                    )}
                    {selectedSupplierObj.contactName && (
                      <span>Contacto: {selectedSupplierObj.contactName}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold">
                  Área / Departamento Solicitante
                </Label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
                >
                  <option value="">-- Seleccione un departamento --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
                <span>
                  Al crear la orden, este proveedor se{" "}
                  <strong>guardará automáticamente en el sistema</strong> bajo
                  la categoría <strong>Proveedor de Servicios</strong>. Solo
                  RIF/Cédula y Razón Social son obligatorios; el resto puedes
                  completarlo ahora o editarlo luego en el módulo de
                  Proveedores.
                </span>
              </div>

              {/* Aviso inteligente si el RIF ya existe en el catálogo */}
              {matchedExistingSupplier && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2.5">
                  <div className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div className="space-y-0.5">
                      <p className="font-bold">
                        Este RIF/Cédula ya está registrado en el sistema
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        <strong>{matchedExistingSupplier.name}</strong> (
                        <span className="font-mono">
                          {matchedExistingSupplier.rifOrId ||
                            matchedExistingSupplier.rif}
                        </span>
                        ) · Clasificación actual:{" "}
                        <strong>
                          {SUPPLIER_TYPE_LABELS[
                            matchedExistingSupplier.supplierType || "VENTAS"
                          ] || "Ventas / Insumos"}
                        </strong>
                        {matchedExistingSupplier.isActive === false
                          ? " (Inactivo)"
                          : ""}
                        .
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <Button
                      type="button"
                      size="sm"
                      disabled={linkingExisting}
                      onClick={() =>
                        void handleLinkExistingSupplier(matchedExistingSupplier)
                      }
                      className="h-8 text-xs font-semibold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                    >
                      {linkingExisting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      {matchedExistingSupplier.supplierType === "VENTAS" ||
                      !matchedExistingSupplier.supplierType
                        ? "Vincular y habilitar también para Servicios (Mixto)"
                        : "Vincular este proveedor a la orden"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-semibold">
                    RIF / Cédula *
                  </Label>
                  <RifInput
                    value={newSupplierForm.rifOrId}
                    onChange={(val) => {
                      setNewSupplierForm({ ...newSupplierForm, rifOrId: val });
                      setConflictSupplier(null);
                    }}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-semibold">
                    Razón Social / Nombre del Prestador *
                  </Label>
                  <Input
                    type="text"
                    value={newSupplierForm.name}
                    onChange={(e) =>
                      setNewSupplierForm({
                        ...newSupplierForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="Ej: Servicios Técnicos ABC C.A. o Juan Pérez"
                    className="text-xs h-9"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-semibold">
                    Teléfono (Opcional)
                  </Label>
                  <PhoneInput
                    value={newSupplierForm.phone}
                    onChange={(val) =>
                      setNewSupplierForm({ ...newSupplierForm, phone: val })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-semibold">
                    Persona de Contacto (Opcional)
                  </Label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      value={newSupplierForm.contactName}
                      onChange={(e) =>
                        setNewSupplierForm({
                          ...newSupplierForm,
                          contactName: e.target.value,
                        })
                      }
                      placeholder="Nombre del técnico o representante"
                      className="pl-8 text-xs h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-semibold">
                    Correo Electrónico (Opcional)
                  </Label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      value={newSupplierForm.email}
                      onChange={(e) =>
                        setNewSupplierForm({
                          ...newSupplierForm,
                          email: e.target.value,
                        })
                      }
                      placeholder="servicios@empresa.com"
                      className="pl-8 text-xs h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-semibold">
                    Área / Departamento Solicitante
                  </Label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
                  >
                    <option value="">-- Seleccione un departamento --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs uppercase font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    Dirección Fiscal / Ubicación (Opcional)
                  </Label>
                  <Input
                    type="text"
                    value={newSupplierForm.address}
                    onChange={(e) =>
                      setNewSupplierForm({
                        ...newSupplierForm,
                        address: e.target.value,
                      })
                    }
                    placeholder="Dirección fiscal, oficina o ciudad..."
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ========================================================
            SECCIÓN 2: CONCEPTO, MONTO Y SOPORTE
           ======================================================== */}
        <Card className="p-5 border-border shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <FileText className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              2. Detalle del Servicio y Presupuesto
            </CardTitle>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Concepto / Descripción del Servicio *
              </Label>
              <Textarea
                rows={3}
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Ej: Mantenimiento preventivo de equipos de refrigeración del laboratorio central, calibración de centrífugas..."
                className="text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold">
                  Moneda *
                </Label>
                <select
                  value={transactionCurrency}
                  onChange={(e) =>
                    handleCurrencyChange(
                      e.target.value as "USD" | "VED" | "EUR"
                    )
                  }
                  className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="VED">VED (Bs.)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold">
                  Monto (
                  {transactionCurrency === "VED"
                    ? "Bs."
                    : transactionCurrency === "EUR"
                      ? "€"
                      : "$"}
                  ) *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                  className="font-mono font-bold text-xs h-9"
                  required
                />
                {dynamicEquivalentUsd > 0 && transactionCurrency !== "USD" && (
                  <span className="text-[10px] text-primary font-mono block">
                    ≈ ${dynamicEquivalentUsd.toFixed(2)} USD
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold">
                  {transactionCurrency === "USD"
                    ? "Tasa Referencial"
                    : `Tasa BCV (Bs./${transactionCurrency === "EUR" ? "€" : "$"})`}
                </Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={transactionCurrency === "USD" ? "1.00" : exchangeRate}
                  disabled={transactionCurrency === "USD"}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="font-mono text-xs h-9"
                />
                <span className="text-[10px] text-muted-foreground font-mono block">
                  BCV: {bcvRates.USD.toFixed(2)} Bs./$ ·{" "}
                  {bcvRates.EUR.toFixed(2)} Bs./€
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  Fecha Estimada
                </Label>
                <Input
                  type="date"
                  value={estimatedDate}
                  onChange={(e) => setEstimatedDate(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                  Enlace a Cotización / Soporte (Opcional)
                </Label>
                <Input
                  type="url"
                  value={supportUrl}
                  onChange={(e) => setSupportUrl(e.target.value)}
                  placeholder="https://..."
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold">
                  Observaciones Adicionales (Opcional)
                </Label>
                <Input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Condiciones de ejecución, urgencia o notas..."
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Barra Inferior */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/financial/payments")}
            className="cursor-pointer"
          >
            Volver al Listado
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="gap-2 cursor-pointer shadow-xs px-6"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileCheck2 className="w-4 h-4" />
            )}
            {submitting ? "Creando Orden..." : "Crear Orden de Servicio"}
          </Button>
        </div>
      </form>
    </div>
  );
}
