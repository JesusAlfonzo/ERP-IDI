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
} from "../BasePdfLayout";
import {
  PdfTable,
  PdfTableHeader,
  PdfTableHeaderCell,
  PdfTableRow,
  PdfTableCell,
} from "../PdfTable";
import { PDF_COLORS, PDF_FONTS } from "../theme";
import type { SupplierStatement } from "@/types/purchasing";

const styles = StyleSheet.create({
  summaryBox: {
    borderWidth: 1,
    borderColor: PDF_COLORS.navyDark,
    borderStyle: "solid",
    borderRadius: 4,
    backgroundColor: PDF_COLORS.bgSubtle,
    padding: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryCol: {
    width: "32%",
    padding: 4,
    backgroundColor: PDF_COLORS.bgWhite,
    borderRadius: 3,
    borderWidth: 0.6,
    borderColor: PDF_COLORS.borderLight,
  },
  summaryLabel: {
    fontSize: 6.2,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.textMuted,
    textTransform: "uppercase",
  },
  summaryValueUsd: {
    fontSize: 9.5,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.rose,
    marginTop: 2,
  },
  summaryValuePaid: {
    fontSize: 9.5,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.emerald,
    marginTop: 2,
  },
  summaryValueTotal: {
    fontSize: 9.5,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.navyDark,
    marginTop: 2,
  },
  summarySub: {
    fontSize: 6.2,
    color: PDF_COLORS.textSecondary,
    marginTop: 1,
  },
});

export interface SupplierDebtPdfDocumentProps {
  statement: SupplierStatement;
}

export function SupplierDebtPdfDocument({
  statement,
}: SupplierDebtPdfDocumentProps) {
  const formattedDate = new Date().toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const supplier = statement.supplier;
  const balanceUsd = Number(statement.balanceUsd || 0);
  const totalPurchasedUsd = Number(statement.totalPurchasedUsd || 0);
  const totalPaidUsd = Number(statement.totalPaidUsd || 0);
  const balanceBs = Number(statement.balanceBs || 0);

  const statusLabel = balanceUsd > 0.01 ? "CON SALDO PENDIENTE" : "SOLVENTE";

  return (
    <BasePdfDocument
      title={`Estado_Cuenta_${(supplier.name || "Proveedor").replace(/[^a-zA-Z0-9]/g, "_")}`}
      subject="Estado de Cuenta y Conciliación Financiera de Proveedor - ERP-IDI"
    >
      <PdfPage>
        {/* Cabecera */}
        <PdfHeader
          title="ESTADO DE CUENTA FINANCIERO"
          subtitle="CONCILIACIÓN DE PROVEEDORES Y AMORTIZACIONES"
          documentNumber={`EC-${supplier.id}`}
          date={formattedDate}
          status={statusLabel}
          badge="ESTADO DE CUENTA"
        />

        {/* Metadatos */}
        <PdfInfoBar
          items={[
            { label: "Proveedor", value: supplier.name },
            { label: "RIF", value: supplier.rifOrId || "N/A" },
            { label: "Órdenes Registradas", value: statement.orders?.length || 0 },
            { label: "Fecha de Corte", value: formattedDate },
          ]}
        />

        {/* Cuadros de Resumen Financiero */}
        <View style={styles.summaryBox} wrap={false}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Total Comprado (Histórico):</Text>
            <Text style={styles.summaryValueTotal}>
              $ {totalPurchasedUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </Text>
            <Text style={styles.summarySub}>Total de adquisiciones pactadas</Text>
          </View>

          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Total Pagado / Amortizado:</Text>
            <Text style={styles.summaryValuePaid}>
              $ {totalPaidUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </Text>
            <Text style={styles.summarySub}>Egresos asentados con comprobante</Text>
          </View>

          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Saldo Deudor Pendiente:</Text>
            <Text style={styles.summaryValueUsd}>
              $ {balanceUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </Text>
            <Text style={styles.summarySub}>
              Equiv. Bs. {balanceBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Datos del Proveedor vs Institución */}
        <PdfCardGrid>
          <PdfInfoCard
            title="Datos del Proveedor"
            badge="Beneficiario"
            fields={[
              { label: "Razón Social", value: supplier.name },
              { label: "RIF / Identificación", value: supplier.rifOrId || "N/A" },
              { label: "Condición Fiscal", value: statusLabel },
            ]}
          />

          <PdfInfoCard
            title="Entidad Emisora"
            badge="Comprador"
            fields={[
              { label: "Institución", value: "INMUNOLOGIA ASOCIACION CIVIL" },
              { label: "RIF", value: "J-30710739-1" },
              { label: "Unidad", value: "Tesorería y Cuentas por Pagar" },
            ]}
          />
        </PdfCardGrid>

        {/* Tabla de Órdenes */}
        <PdfTable>
          <PdfTableHeader>
            <PdfTableHeaderCell width="16%">N° Orden</PdfTableHeaderCell>
            <PdfTableHeaderCell width="14%">Fecha Emisión</PdfTableHeaderCell>
            <PdfTableHeaderCell width="14%" align="center">Estado</PdfTableHeaderCell>
            <PdfTableHeaderCell width="18%" align="right">Total Orden ($)</PdfTableHeaderCell>
            <PdfTableHeaderCell width="18%" align="right">Pagado ($)</PdfTableHeaderCell>
            <PdfTableHeaderCell width="20%" align="right">Saldo ($)</PdfTableHeaderCell>
          </PdfTableHeader>

          {statement.orders?.map((ord, idx) => {
            const ordTotal = Number(ord.totalUsd ?? ord.total ?? 0);
            const ordPaid = Number(ord.paidUsd ?? 0);
            const ordBal = Number(ord.balanceUsd ?? Math.max(0, ordTotal - ordPaid));
            const ordDate = ord.createdAt
              ? new Date(ord.createdAt).toLocaleDateString("es-VE")
              : "---";

            return (
              <PdfTableRow key={String(ord.id || idx)} isAlt={idx % 2 === 1}>
                <PdfTableCell width="16%" bold>
                  {ord.orderNumber || `#${ord.id}`}
                </PdfTableCell>
                <PdfTableCell width="14%">{ordDate}</PdfTableCell>
                <PdfTableCell width="14%" align="center" fontSize={6.5}>
                  {ord.status}
                </PdfTableCell>
                <PdfTableCell width="18%" align="right">
                  $ {ordTotal.toFixed(2)}
                </PdfTableCell>
                <PdfTableCell width="18%" align="right" color={PDF_COLORS.emerald}>
                  $ {ordPaid.toFixed(2)}
                </PdfTableCell>
                <PdfTableCell
                  width="20%"
                  align="right"
                  bold
                  color={ordBal > 0.01 ? PDF_COLORS.rose : PDF_COLORS.textMuted}
                >
                  $ {ordBal.toFixed(2)}
                </PdfTableCell>
              </PdfTableRow>
            );
          })}
        </PdfTable>

        {/* Firmas de Conciliación */}
        <PdfSignatures
          signatures={[
            {
              role: "Elaborado por (Cuentas por Pagar)",
              department: "Tesorería y Finanzas IDI",
              stampText: "Firma / Sello Tesorería",
            },
            {
              role: "Revisado por (Administración)",
              department: "Dirección de Administración",
              stampText: "Firma / Sello Administración",
            },
            {
              role: "Conformidad del Proveedor",
              department: supplier.name,
              stampText: "Firma / Sello Proveedor",
            },
          ]}
        />
      </PdfPage>
    </BasePdfDocument>
  );
}

export default SupplierDebtPdfDocument;
