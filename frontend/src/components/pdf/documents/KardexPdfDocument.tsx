"use client";

import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import {
  BasePdfDocument,
  PdfPage,
  PdfHeader,
  PdfInfoBar,
  PdfInfoCard,
  PdfCardGrid,
  PdfSignatures,
  PdfNotice,
} from "../BasePdfLayout";
import {
  PdfTable,
  PdfTableHeader,
  PdfTableHeaderCell,
  PdfTableRow,
  PdfTableCell,
} from "../PdfTable";
import { PDF_COLORS, PDF_FONTS } from "../theme";

const styles = StyleSheet.create({
  totalsBox: {
    alignSelf: "flex-end",
    width: "45%",
    borderWidth: 0.8,
    borderColor: PDF_COLORS.borderLight,
    borderStyle: "solid",
    borderRadius: 3,
    backgroundColor: PDF_COLORS.bgSubtle,
    padding: 6,
    marginBottom: 8,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  totalsLabel: {
    fontSize: 7,
    fontFamily: PDF_FONTS.regular,
    color: PDF_COLORS.textSecondary,
  },
  totalsVal: {
    fontSize: 7.2,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.textPrimary,
  },
  totalsTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.8,
    borderTopColor: PDF_COLORS.navyDark,
    borderTopStyle: "solid",
    paddingTop: 3,
    marginTop: 2,
  },
  totalsTotalLabel: {
    fontSize: 7.5,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.navyDark,
    textTransform: "uppercase",
  },
  totalsTotalVal: {
    fontSize: 8.5,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.navyMedium,
  },
});

export interface KardexMovementItem {
  id: string | number;
  quantity: string | number;
  unitCost: string | number | null;
  batch?: {
    id: string | number;
    lotNumber: string;
    expirationDate: string | null;
    product?: {
      id: string | number;
      name: string;
      sku: string;
      category?: { name: string } | null;
      baseUnit?: { abbreviation: string } | null;
    } | null;
  } | null;
}

export interface KardexMovementData {
  id: string | number;
  referenceNumber: string | null;
  type: string;
  notes: string | null;
  createdAt: string;
  createdBy?: {
    fullName: string | null;
    username: string;
    department?: string | null;
  } | null;
  originLocation?: { id?: number | string; name: string } | null;
  destinationLocation?: { id?: number | string; name: string } | null;
  order?: {
    orderNumber: string;
    supplier?: { name: string; rif?: string; rifOrId?: string } | null;
  } | null;
  items?: KardexMovementItem[];
}

export interface KardexPdfDocumentProps {
  movement: KardexMovementData;
}

export function KardexPdfDocument({ movement }: KardexPdfDocumentProps) {
  const items = movement.items || [];
  const formattedDate = new Date(movement.createdAt).toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const typeLabel = (movement.type || "MOVIMIENTO").replace(/_/g, " ").toUpperCase();
  const docNumber = movement.referenceNumber || `#MOV-${movement.id}`;

  const originName = movement.originLocation?.name || (movement.order ? `Proveedor (${movement.order.supplier?.name || "Externo"})` : "Almacén Central");
  const destinationName = movement.destinationLocation?.name || "Almacén Central / Área Hospitalaria";

  const totalQuantity = items.reduce(
    (acc, it) => acc + Number(it.quantity || 0),
    0
  );

  const totalValuation = items.reduce((acc, it) => {
    const cost = Number(it.unitCost || 0);
    return acc + Number(it.quantity || 0) * cost;
  }, 0);

  return (
    <BasePdfDocument
      title={`Comprobante_Movimiento_${docNumber}`}
      subject="Comprobante de Movimiento de Almacén - ERP-IDI"
    >
      <PdfPage>
        {/* Cabecera Estandarizada */}
        <PdfHeader
          title="COMPROBANTE DE MOVIMIENTO"
          subtitle="CONTROL DE ALMACÉN E INVENTARIO"
          documentNumber={docNumber}
          date={formattedDate}
          status={typeLabel}
          badge="KARDEX OFICIAL"
        />

        {/* Metadatos Rápidos */}
        <PdfInfoBar
          items={[
            {
              label: "Tipo de Movimiento",
              value: typeLabel,
            },
            {
              label: "Responsable",
              value:
                movement.createdBy?.fullName ||
                movement.createdBy?.username ||
                "Sistema ERP-IDI",
            },
            {
              label: "Total Renglones",
              value: items.length,
            },
            {
              label: "Unidades Movidas",
              value: totalQuantity,
            },
          ]}
        />

        {/* Origen vs Destino (2 Columnas) */}
        <PdfCardGrid>
          <PdfInfoCard
            title="Origen del Movimiento"
            badge="Despacho / Salida"
            fields={[
              { label: "Ubicación / Entidad", value: originName },
              {
                label: "Orden de Compra",
                value: movement.order
                  ? `#${movement.order.orderNumber} (${movement.order.supplier?.name || "Proveedor"})`
                  : "N/A (Movimiento Interno)",
              },
              {
                label: "Departamento",
                value: movement.createdBy?.department || "Unidad de Almacén",
              },
            ]}
          />

          <PdfInfoCard
            title="Destino del Movimiento"
            badge="Recepción / Entrada"
            fields={[
              { label: "Ubicación / Entidad", value: destinationName },
              { label: "Fecha y Hora", value: formattedDate },
              {
                label: "Control de Registro",
                value: `Auditoría ID #${movement.id}`,
              },
            ]}
          />
        </PdfCardGrid>

        {/* Tabla de Renglones del Movimiento */}
        <PdfTable>
          <PdfTableHeader>
            <PdfTableHeaderCell width="18%">SKU</PdfTableHeaderCell>
            <PdfTableHeaderCell width="34%">
              Descripción / Insumo
            </PdfTableHeaderCell>
            <PdfTableHeaderCell width="16%">Lote / Venc.</PdfTableHeaderCell>
            <PdfTableHeaderCell width="8%" align="center">
              Unidad
            </PdfTableHeaderCell>
            <PdfTableHeaderCell width="12%" align="right">
              Cantidad
            </PdfTableHeaderCell>
            <PdfTableHeaderCell width="12%" align="right">
              Costo Unit. ($)
            </PdfTableHeaderCell>
          </PdfTableHeader>

          {items.map((it, idx) => {
            const product = it.batch?.product;
            const unit = product?.baseUnit?.abbreviation || "UND";
            const lot = it.batch?.lotNumber || "S/L";
            const expDate = it.batch?.expirationDate
              ? new Date(it.batch.expirationDate).toLocaleDateString("es-VE")
              : "N/A";
            const cost = Number(it.unitCost || 0);

            return (
              <PdfTableRow key={String(it.id || idx)} isAlt={idx % 2 === 1}>
                <PdfTableCell width="18%" fontSize={6.5} bold>
                  {product?.sku || "---"}
                </PdfTableCell>
                <PdfTableCell width="34%">
                  {product?.name || "Insumo sin nombre"}
                </PdfTableCell>
                <PdfTableCell width="16%" fontSize={6.5}>
                  {lot} ({expDate})
                </PdfTableCell>
                <PdfTableCell width="8%" align="center">
                  {unit}
                </PdfTableCell>
                <PdfTableCell width="12%" align="right" bold>
                  {Number(it.quantity)}
                </PdfTableCell>
                <PdfTableCell width="12%" align="right">
                  {cost > 0 ? `$ ${cost.toFixed(2)}` : "---"}
                </PdfTableCell>
              </PdfTableRow>
            );
          })}
        </PdfTable>

        {/* Resumen de Valoración si aplica */}
        {totalValuation > 0 && (
          <View style={styles.totalsBox} wrap={false}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total Unidades Físicas:</Text>
              <Text style={styles.totalsVal}>{totalQuantity}</Text>
            </View>
            <View style={styles.totalsTotalRow}>
              <Text style={styles.totalsTotalLabel}>
                Valoración Total de Movimiento:
              </Text>
              <Text style={styles.totalsTotalVal}>
                $ {totalValuation.toFixed(2)} USD
              </Text>
            </View>
          </View>
        )}

        {/* Observaciones */}
        {movement.notes && (
          <PdfNotice
            title="Observaciones del Movimiento:"
            text={movement.notes}
          />
        )}

        {/* 3 Firmas de Responsabilidad */}
        <PdfSignatures
          signatures={[
            {
              role: "Entregado por (Almacén)",
              name: movement.createdBy?.fullName || undefined,
              department: "Gestión de Inventario y Despacho",
              stampText: "Firma / Sello Almacén",
            },
            {
              role: "Recibido Conforme",
              department: destinationName,
              stampText: "Firma / Sello Receptor",
            },
            {
              role: "Auditado por (Supervisión)",
              department: "Control Interno y Bienes",
              stampText: "Firma / Sello Control",
            },
          ]}
        />
      </PdfPage>
    </BasePdfDocument>
  );
}

export default KardexPdfDocument;
