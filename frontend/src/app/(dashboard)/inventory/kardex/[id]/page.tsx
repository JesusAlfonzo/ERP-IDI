"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import {
  PrintableDocument,
  DocumentHeader,
  DocumentMetadataGrid,
  DocumentSignatures,
  DocumentFooter,
  PrintActionButton,
} from "@/components/common/PrintableDocument";
import {
  FileText,
  ArrowLeft,
  Calendar,
  User,
  Building,
  Boxes,
  Loader2,
  Printer,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MovementProduct {
  id: string | number;
  name: string;
  sku: string;
  category?: { name: string } | null;
  baseUnit?: { abbreviation: string } | null;
}

interface MovementBatch {
  id: string | number;
  lotNumber: string;
  expirationDate: string | null;
  product?: MovementProduct | null;
}

interface MovementItemDetail {
  id: string | number;
  quantity: string | number;
  unitCost: string | number | null;
  batch?: MovementBatch | null;
}

interface MovementDetail {
  id: string | number;
  referenceNumber: string | null;
  type: string;
  notes: string | null;
  createdAt: string;
  createdBy?: {
    fullName: string | null;
    username: string;
    department: string | null;
  } | null;
  originLocation?: { name: string } | null;
  destinationLocation?: { name: string } | null;
  order?: {
    id: number;
    orderNumber: string;
    supplier?: { name: string } | null;
  } | null;
  items?: MovementItemDetail[];
}

export default function KardexDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const movementId = Array.isArray(rawId) ? rawId[0] : (rawId as string);

  const [currentUser] = useState(() => AuthService.getCurrentUser());
  const isAdmin = currentUser?.roles?.includes("ADMINISTRADOR");

  const [movement, setMovement] = useState<MovementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!movementId) return;

    startTransition(() => {
      void (async () => {
        try {
          const data = await InventoryClientService.getMovementById(movementId);
          setMovement(data as MovementDetail);
        } catch (err) {
          console.error("Error cargando comprobante de movimiento", err);
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [movementId]);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-card rounded-xl border border-border space-y-3 max-w-md mx-auto my-12">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-foreground">Acceso Administrativo Exclusivo</h2>
        <p className="text-xs text-muted-foreground">
          El comprobante de auditoría de movimientos está reservado temporalmente para el perfil de Administración.
        </p>
        <Button onClick={() => router.push("/dashboard")} variant="outline" size="sm">
          Volver al Inicio
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-xs text-slate-500 font-medium">
          Cargando comprobante de auditoría...
        </span>
      </div>
    );
  }


  if (!movement) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <Card className="shadow-xs p-6 space-y-4">
          <CardContent className="space-y-4 p-0">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Comprobante no encontrado
            </h2>
            <Button
              type="button"
              size="sm"
              onClick={() => router.push("/inventory/kardex")}
              className="gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al Kardex
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "ENTRADA_COMPRA":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "DESPACHO_SOLICITUD":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "AJUSTE_INVENTARIO":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "DESCARTE_MERMA":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const totalQuantity = (movement.items || []).reduce(
    (acc, it) => acc + Math.abs(Number(it.quantity)),
    0
  );
  const totalCostVal = (movement.items || []).reduce(
    (acc, it) => acc + Math.abs(Number(it.quantity)) * Number(it.unitCost || 0),
    0
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Barra superior de acciones (no imprimible) */}
      <div className="no-print print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/inventory/kardex")}
          className="gap-2 shadow-xs cursor-pointer"
          title="Regresar al Historial de Movimientos"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Historial</span>
        </Button>

        <div className="flex items-center gap-2">
          <PrintActionButton label="Imprimir / Exportar PDF" />
        </div>
      </div>

      {/* Documento Institucional Imprimible */}
      <PrintableDocument>
        <DocumentHeader
          title="Comprobante de Movimiento de Almacén"
          subtitle="Instituto de Inmunología Clínica · ERP-IDI"
          documentNumber={movement.referenceNumber || `#MOV-${movement.id}`}
          badge={movement.type.replace(/_/g, " ")}
          status={{
            label: movement.type.replace(/_/g, " "),
            className: getTypeBadge(movement.type),
          }}
          date={new Date(movement.createdAt).toLocaleString("es-VE")}
        />

        {/* Metadatos institucionales */}
        <DocumentMetadataGrid
          columns={3}
          items={[
            {
              label: "Fecha y Hora de Registro",
              value: new Date(movement.createdAt).toLocaleString("es-VE"),
            },
            {
              label: "Responsable / Ejecutor",
              value: (
                <div>
                  <div className="font-bold text-slate-900">
                    {movement.createdBy?.fullName ||
                      movement.createdBy?.username ||
                      "Sistema"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {movement.createdBy?.department ?? "Almacén Central"}
                  </div>
                </div>
              ),
            },
            {
              label: "Origen / Destino",
              value: (
                <div>
                  <div className="font-bold text-slate-900">
                    {movement.destinationLocation?.name ??
                      movement.originLocation?.name ??
                      "Almacén Central"}
                  </div>
                  {movement.order && (
                    <div className="text-[10px] text-blue-600 font-mono">
                      Orden: #{movement.order.orderNumber} (
                      {movement.order.supplier?.name})
                    </div>
                  )}
                </div>
              ),
            },
            {
              label: "Tipo de Operación",
              value: movement.type.replace(/_/g, " "),
            },
            {
              label: "Notas / Justificación",
              colSpan: 2,
              value: movement.notes || "Sin observaciones particulares registradas.",
            },
          ]}
        />

        {/* Tabla de Renglones e Insumos Afectados */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-300 pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-slate-700 inline" />
              Renglones e Insumos Afectados
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              {(movement.items || []).length}{" "}
              {(movement.items || []).length === 1 ? "renglón" : "renglones"}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg print:border-black">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 print:bg-slate-100 text-slate-700 print:text-black">
                <tr>
                  <th className="py-2.5 px-3 text-left font-bold uppercase text-[10px] tracking-wider">
                    SKU
                  </th>
                  <th className="py-2.5 px-3 text-left font-bold uppercase text-[10px] tracking-wider">
                    Nombre del Insumo / Reactivo
                  </th>
                  <th className="py-2.5 px-3 text-left font-bold uppercase text-[10px] tracking-wider">
                    Lote
                  </th>
                  <th className="py-2.5 px-3 text-left font-bold uppercase text-[10px] tracking-wider">
                    Vencimiento
                  </th>
                  <th className="py-2.5 px-3 text-right font-bold uppercase text-[10px] tracking-wider">
                    Cantidad Afectada
                  </th>
                  <th className="py-2.5 px-3 text-right font-bold uppercase text-[10px] tracking-wider">
                    Costo Unit. ($)
                  </th>
                  <th className="py-2.5 px-3 text-right font-bold uppercase text-[10px] tracking-wider">
                    Total ($)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                {!movement.items || movement.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500 bg-slate-50/50">
                      <span className="font-semibold text-slate-700 block text-xs">
                        Asiento Financiero de Tesorería ({movement.type})
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Este movimiento corresponde a una transacción monetaria (pago o egreso) y no involucra afectación física de existencias en almacén.
                      </span>
                    </td>
                  </tr>
                ) : (
                  movement.items.map((item, index) => {
                    const isPositive = Number(item.quantity) > 0;
                    const lineTotal =
                      Math.abs(Number(item.quantity)) *
                      Number(item.unitCost || 0);

                    return (
                      <tr
                        key={`${item.id ?? "item"}-${index}`}
                        className="hover:bg-slate-50/80 print:hover:bg-transparent"
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 print:text-black">
                          {item.batch?.product?.sku || "---"}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 print:text-black">
                            {item.batch?.product?.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.batch?.product?.category?.name}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 print:text-black">
                          {item.batch?.lotNumber || "N/A"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 print:text-black">
                          {item.batch?.expirationDate
                            ? new Date(item.batch.expirationDate).toLocaleDateString("es-VE")
                            : "N/A"}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold ${
                            isPositive
                              ? "text-emerald-700 print:text-black"
                              : "text-rose-700 print:text-black"
                          }`}
                        >
                          {isPositive ? `+${item.quantity}` : item.quantity}{" "}
                          <span className="text-[10px] font-normal text-slate-500 print:text-black">
                            {item.batch?.product?.baseUnit?.abbreviation || ""}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 print:text-black">
                          ${Number(item.unitCost ?? 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 print:text-black">
                          ${lineTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {movement.items && movement.items.length > 0 && (
                <tfoot className="bg-slate-50 font-bold border-t border-slate-300 print:bg-slate-100 print:border-black">
                  <tr>
                    <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[10px] tracking-wider text-slate-700 print:text-black">
                      Total Renglones Afectados:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900 print:text-black">
                      {totalQuantity.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right uppercase text-[10px] tracking-wider text-slate-700 print:text-black">
                      Total Valorado:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900 print:text-black">
                      ${totalCostVal.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Firmas Institucionales */}
        <DocumentSignatures
          signatures={[
            {
              role: "Responsable de Registro",
              name: movement.createdBy?.fullName || movement.createdBy?.username || "Sistema",
              department: movement.createdBy?.department || "Almacén Central",
              date: new Date(movement.createdAt).toLocaleDateString("es-VE"),
              stampText: "Firma Responsable",
            },
            {
              role: "Custodio / Entrega Almacén",
              name: "Custodia de Existencias",
              department: "Gestión de Almacén",
              stampText: "Firma y Sello Almacén",
            },
            {
              role: "Visto Bueno / Auditoría",
              name: "Dirección / Administración",
              department: "Auditoría Interna IAC",
              stampText: "Sello Institucional",
            },
          ]}
        />

        {/* Pie institucional */}
        <DocumentFooter
          notes={movement.notes || "Comprobante de movimiento de inventario emitido conforme a las normas de trazabilidad clínica e institucional."}
          institutionText="INMUNOLOGIA ASOCIACION CIVIL · RIF: J-30710739-1"
          systemSignature="ERP-IDI v2.0 · Trazabilidad de Inventario y Kardex"
        />
      </PrintableDocument>
    </div>
  );
}
