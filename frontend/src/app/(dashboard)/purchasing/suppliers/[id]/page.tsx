"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { PurchasingClientService } from "@/services/purchasing.service";
import { AuthService } from "@/services/auth.service";
import type { SupplierDetail, SupplierType } from "@/types/purchasing";
import axios from "axios";
import { cn } from "@/lib/utils";
import { RifInput } from "@/components/common/RifInput";
import { PhoneInput } from "@/components/common/PhoneInput";
import {
  validatePhoneValue,
  validateRifValue,
} from "@/utils/venezuela-formatters";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Building2,
  ArrowLeft,
  Pencil,
  Phone,
  Mail,
  MapPin,
  User,
  Calendar,
  FileText,
  DollarSign,
  Package,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Wrench,
  ShoppingBag,
  Layers,
  Wallet,
} from "lucide-react";

const SUPPLIER_TYPE_META: Record<
  SupplierType,
  { label: string; className: string }
> = {
  VENTAS: {
    label: "Ventas / Insumos",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  SERVICIOS: {
    label: "Servicios",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  AMBOS: {
    label: "Mixto (Ventas y Servicios)",
    className: "bg-teal-50 text-teal-700 border-teal-200",
  },
};

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params?.id as string;

  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Editar
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    rifOrId: "",
    name: "",
    supplierType: "VENTAS" as SupplierType,
    contactName: "",
    phone: "",
    email: "",
    address: "",
    isActive: true,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFeedback, setEditFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadSupplier = useCallback(async () => {
    if (!supplierId) return;
    try {
      const data = await PurchasingClientService.getSupplierById(supplierId);
      setSupplier(data);
      setEditForm({
        rifOrId: data.rifOrId || data.rif || "",
        name: data.name,
        supplierType: data.supplierType || "VENTAS",
        contactName: data.contactName || "",
        phone: data.phone || "",
        email: data.email || "",
        address: data.address || "",
        isActive: data.isActive !== false,
      });
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : err instanceof Error
            ? err.message
            : "No se pudo cargar la información del proveedor.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    let isMounted = true;

    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    if (!supplierId) return;

    PurchasingClientService.getSupplierById(supplierId)
      .then((data) => {
        if (!isMounted) return;
        setSupplier(data);
        setEditForm({
          rifOrId: data.rifOrId || data.rif || "",
          name: data.name,
          supplierType: data.supplierType || "VENTAS",
          contactName: data.contactName || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          isActive: data.isActive !== false,
        });
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : err instanceof Error
              ? err.message
              : "No se pudo cargar la información del proveedor.";
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [supplierId, router]);

  const handleUpdateSupplier = async (e: FormEvent) => {
    e.preventDefault();
    if (!supplier) return;
    setEditFeedback(null);

    if (!editForm.rifOrId.trim() || !editForm.name.trim()) {
      setEditFeedback({
        status: "error",
        message: "El RIF/ID y la Razón Social son obligatorios.",
      });
      return;
    }

    const rifCheck = validateRifValue(editForm.rifOrId);
    if (!rifCheck.valid) {
      setEditFeedback({
        status: "error",
        message: rifCheck.error || "Formato de RIF/Cédula inválido.",
      });
      return;
    }

    const phoneCheck = validatePhoneValue(editForm.phone);
    if (!phoneCheck.valid) {
      setEditFeedback({
        status: "error",
        message: phoneCheck.error || "Formato de teléfono inválido.",
      });
      return;
    }

    setEditSubmitting(true);
    try {
      await PurchasingClientService.updateSupplier(supplier.id, {
        rifOrId: editForm.rifOrId.trim(),
        name: editForm.name.trim(),
        supplierType: editForm.supplierType,
        contactName: editForm.contactName.trim() || null,
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        address: editForm.address.trim() || null,
        isActive: editForm.isActive,
      });

      setEditFeedback({
        status: "success",
        message: "Ficha del proveedor actualizada correctamente.",
      });
      await loadSupplier();

      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditFeedback(null);
      }, 1000);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : err instanceof Error
            ? err.message
            : "Error al actualizar el proveedor.";
      setEditFeedback({ status: "error", message: msg });
    } finally {
      setEditSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">
          Cargando ficha técnica del proveedor...
        </p>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/purchasing/suppliers")}
          className="gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Directorio de Proveedores
        </Button>

        <Card className="border-destructive/30 text-center p-8 space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Proveedor No Encontrado
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {error || "El registro solicitado no existe en la base de datos."}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => router.push("/purchasing/suppliers")}
            className="cursor-pointer"
          >
            Regresar al Listado
          </Button>
        </Card>
      </div>
    );
  }

  const orders = supplier.orders ?? [];
  const serviceOrders = supplier.directPayments ?? [];
  const supplierType: SupplierType = supplier.supplierType || "VENTAS";
  const typeMeta = SUPPLIER_TYPE_META[supplierType];
  const totalOrders = supplier._count?.orders ?? orders.length;
  const totalServiceOrders =
    supplier._count?.directPayments ?? serviceOrders.length;
  const totalPurchasedUsd = orders.reduce((sum, ord) => {
    const val = Number(ord.totalAmountUsd ?? ord.total ?? 0);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Botón Volver y Barra Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/purchasing/suppliers")}
            title="Volver al Directorio"
            className="cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">
                {supplier.name}
              </h1>
              <Badge variant="outline" className="font-mono text-xs font-semibold">
                {supplier.rifOrId || supplier.rif || "SIN RIF"}
              </Badge>
              <Badge
                variant="outline"
                className={cn("gap-1 text-xs font-semibold", typeMeta.className)}
              >
                {supplierType === "SERVICIOS" ? (
                  <Wrench className="w-3 h-3" />
                ) : supplierType === "AMBOS" ? (
                  <Layers className="w-3 h-3" />
                ) : (
                  <ShoppingBag className="w-3 h-3" />
                )}
                {typeMeta.label}
              </Badge>
              {supplier.isActive !== false ? (
                <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Activo
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 bg-muted text-muted-foreground border-border">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Inactivo
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ficha Técnica Institucional y Resumen Histórico de Órdenes de Compra
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsEditModalOpen(true)}
            size="sm"
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
          >
            <Pencil className="w-4 h-4" />
            Editar Proveedor
          </Button>
        </div>
      </div>

      {/* Resumen en Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Órdenes Emitidas
              </p>
              <p className="text-xl font-bold text-slate-800">{totalOrders}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Volumen Compras (USD)
              </p>
              <p className="text-xl font-bold text-slate-800 font-mono">
                ${totalPurchasedUsd.toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Estado Operativo
              </p>
              <p className="text-sm font-bold text-slate-800">
                {supplier.isActive !== false ? "Habilitado para Compras" : "Inhabilitado (Solo Historial)"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ficha Técnica del Proveedor */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Ficha de Contacto y Datos Fiscales
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Razón Social / Comercial
              </span>
              <p className="font-semibold text-slate-800 text-sm">
                {supplier.name}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                RIF / Identificación Fiscal
              </span>
              <p className="font-mono font-bold text-slate-800 text-sm">
                {supplier.rifOrId || supplier.rif || "No registrado"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Representante / Persona de Contacto
              </span>
              <p className="flex items-center gap-1.5 text-slate-700">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                {supplier.contactName || "No especificado"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Teléfono de Contacto
              </span>
              <p className="flex items-center gap-1.5 text-slate-700">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                {supplier.phone ? (
                  <a
                    href={`tel:${supplier.phone}`}
                    className="hover:text-primary hover:underline"
                  >
                    {supplier.phone}
                  </a>
                ) : (
                  "No registrado"
                )}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Correo Electrónico
              </span>
              <p className="flex items-center gap-1.5 text-slate-700">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                {supplier.email ? (
                  <a
                    href={`mailto:${supplier.email}`}
                    className="hover:text-primary hover:underline"
                  >
                    {supplier.email}
                  </a>
                ) : (
                  "No registrado"
                )}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Fecha de Registro en ERP
              </span>
              <p className="flex items-center gap-1.5 text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {supplier.createdAt
                  ? new Date(supplier.createdAt).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "Fecha no disponible"}
              </p>
            </div>

            <div className="md:col-span-3 space-y-1 border-t border-border pt-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Dirección Fiscal / Despacho
              </span>
              <p className="flex items-start gap-1.5 text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <span>{supplier.address || "Dirección no registrada"}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-tabla: Órdenes de Compra Asociadas */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle className="font-bold text-slate-800 text-sm">
              Órdenes de Compra Institucionales (Historial Reciente)
            </CardTitle>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {orders.length} {orders.length === 1 ? "orden" : "órdenes"} en historial
          </span>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="py-3 px-4 font-semibold">N° de Orden</TableHead>
                <TableHead className="py-3 px-4 font-semibold">Fecha de Emisión</TableHead>
                <TableHead className="py-3 px-4 text-center font-semibold">Estado de Orden</TableHead>
                <TableHead className="py-3 px-4 text-center font-semibold">Recepción Almacén</TableHead>
                <TableHead className="py-3 px-4 text-center font-semibold">Estado de Pago</TableHead>
                <TableHead className="py-3 px-4 text-right font-semibold">Monto Total</TableHead>
                <TableHead className="py-3 px-4 text-center font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    No se han registrado órdenes de compra para este proveedor.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((ord) => (
                  <TableRow
                    key={ord.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {ord.orderNumber}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {ord.createdAt
                        ? new Date(ord.createdAt).toLocaleDateString("es-VE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "-"}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={
                          ord.status === "COMPLETADA"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : ord.status === "CANCELADA"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : ord.status === "APROBADA"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                        }
                      >
                        {ord.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={
                          ord.receptionStatus === "COMPLETO"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : ord.receptionStatus === "PARCIAL"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-muted text-muted-foreground border-border"
                        }
                      >
                        {ord.receptionStatus || "PENDIENTE"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={
                          ord.paymentStatus === "PAGADO"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : ord.paymentStatus === "PARCIAL" ||
                                ord.paymentStatus === "PAGADO_PARCIAL"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        {ord.paymentStatus || "PENDIENTE"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                      ${Number(ord.totalAmountUsd ?? ord.total ?? 0).toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => router.push(`/purchasing/orders/${ord.id}`)}
                        className="gap-1 text-primary cursor-pointer p-0 h-auto"
                        title="Ver detalle de orden"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver Orden
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sub-tabla: Órdenes de Servicio Asociadas */}
      {(supplierType !== "VENTAS" || serviceOrders.length > 0) && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="p-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-600" />
              <CardTitle className="font-bold text-slate-800 text-sm">
                Órdenes de Servicio Asociadas (Historial Reciente)
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {totalServiceOrders}{" "}
              {totalServiceOrders === 1
                ? "orden de servicio"
                : "órdenes de servicio"}
            </span>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="py-3 px-4 font-semibold">
                    N° Orden de Servicio
                  </TableHead>
                  <TableHead className="py-3 px-4 font-semibold">
                    Concepto
                  </TableHead>
                  <TableHead className="py-3 px-4 font-semibold">
                    Fecha
                  </TableHead>
                  <TableHead className="py-3 px-4 text-center font-semibold">
                    Estado
                  </TableHead>
                  <TableHead className="py-3 px-4 text-right font-semibold">
                    Monto
                  </TableHead>
                  <TableHead className="py-3 px-4 text-center font-semibold">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceOrders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      <Wrench className="w-7 h-7 mx-auto text-muted-foreground/40 mb-2" />
                      No se han registrado órdenes de servicio para este
                      proveedor.
                    </TableCell>
                  </TableRow>
                ) : (
                  serviceOrders.map((so) => (
                    <TableRow
                      key={so.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {so.serviceOrderNumber || `#${so.id}`}
                      </TableCell>
                      <TableCell className="py-3 px-4 max-w-xs truncate text-slate-700">
                        {so.concept}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {so.createdAt
                          ? new Date(so.createdAt).toLocaleDateString("es-VE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge variant="outline" className="text-[11px]">
                          {so.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {so.transactionCurrency === "VED"
                          ? `Bs. ${Number(so.amountPaid || 0).toFixed(2)}`
                          : so.transactionCurrency === "EUR"
                            ? `€${Number(so.amountPaid || 0).toFixed(2)}`
                            : `$${Number(so.amountPaid || 0).toFixed(2)}`}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() =>
                            router.push(`/admin/financial/payments/${so.id}`)
                          }
                          className="gap-1 text-primary cursor-pointer p-0 h-auto"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Ver Orden
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modal: Editar Proveedor */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 text-base">
              <Pencil className="w-5 h-5 text-amber-600" />
              Editar Proveedor Comercial
            </DialogTitle>
          </DialogHeader>

          {editFeedback && (
            <Alert variant={editFeedback.status === "success" ? "default" : "destructive"}>
              {editFeedback.status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription className="text-xs font-medium">
                {editFeedback.message}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleUpdateSupplier} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider">
                Tipo de Proveedor *
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      value: "VENTAS",
                      label: "Ventas / Insumos",
                      icon: ShoppingBag,
                    },
                    { value: "SERVICIOS", label: "Servicios", icon: Wrench },
                    { value: "AMBOS", label: "Ambos (Mixto)", icon: Layers },
                  ] as const
                ).map((opt) => {
                  const Icon = opt.icon;
                  const active = editForm.supplierType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setEditForm({ ...editForm, supplierType: opt.value })
                      }
                      className={cn(
                        "px-2 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-wider">
                  RIF / Cédula *
                </Label>
                <RifInput
                  value={editForm.rifOrId}
                  onChange={(val) =>
                    setEditForm({ ...editForm, rifOrId: val })
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-wider">
                  Razón Social *
                </Label>
                <Input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  placeholder="Nombre comercial o empresa"
                  className="text-xs h-9"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-wider">
                  Persona de Contacto
                </Label>
                <Input
                  type="text"
                  value={editForm.contactName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, contactName: e.target.value })
                  }
                  placeholder="Representante"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-wider">
                  Teléfono
                </Label>
                <PhoneInput
                  value={editForm.phone}
                  onChange={(val) => setEditForm({ ...editForm, phone: val })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider">
                Correo Electrónico
              </Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                placeholder="contacto@proveedor.com"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider">
                Dirección Fiscal o Almacén
              </Label>
              <Textarea
                rows={2}
                value={editForm.address}
                onChange={(e) =>
                  setEditForm({ ...editForm, address: e.target.value })
                }
                placeholder="Ubicación..."
                className="text-xs"
              />
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={editForm.isActive}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, isActive: Boolean(checked) })
                  }
                />
                <span className="text-xs font-medium text-slate-700">
                  Proveedor Activo en el Catálogo de Compras
                </span>
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={editSubmitting}
                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                {editSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editSubmitting ? "Guardando..." : "Actualizar Proveedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
