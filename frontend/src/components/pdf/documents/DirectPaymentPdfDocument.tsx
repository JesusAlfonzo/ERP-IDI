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
import { PDF_COLORS, PDF_FONTS } from "../theme";
import { getCurrencySymbol } from "@/utils/currency";

const styles = StyleSheet.create({
  amountHighlightBox: {
    borderWidth: 1,
    borderColor: PDF_COLORS.navyDark,
    borderStyle: "solid",
    borderRadius: 4,
    backgroundColor: PDF_COLORS.navyLight,
    padding: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountCol: {
    flexDirection: "column",
  },
  amountLabel: {
    fontSize: 6.8,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.navyDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 13,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.navyDark,
    marginTop: 1,
  },
  equivCol: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  equivLabel: {
    fontSize: 6.5,
    color: PDF_COLORS.textMuted,
  },
  equivValue: {
    fontSize: 9.5,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.emerald,
    marginTop: 1,
  },
  detailCard: {
    borderWidth: 0.7,
    borderColor: PDF_COLORS.borderLight,
    borderStyle: "solid",
    borderRadius: 4,
    backgroundColor: PDF_COLORS.bgSubtle,
    padding: 7,
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 7,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.navyDark,
    textTransform: "uppercase",
    marginBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.borderLight,
    paddingBottom: 2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 7,
    color: PDF_COLORS.textMuted,
  },
  detailVal: {
    fontSize: 7.2,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.textPrimary,
  },
});

export interface DirectPaymentData {
  id: string | number;
  concept: string;
  beneficiary: string;
  method: string;
  voucherCode?: string | null;
  referenceNumber?: string | null;
  amountPaid: number | string;
  transactionCurrency: string;
  exchangeRate: number | string;
  equivalentAmountUsd?: number | string | null;
  paymentDate: string;
  notes?: string | null;
  sourceAccount?: {
    bankName: string;
    accountNumber?: string | null;
    currency: string;
    holderName?: string | null;
  } | null;
  destinationAccount?: string | null;
  reviewedBy?: string | null;
  authorizedBy?: string | null;
  approvedBy?: string | null;
  registeredBy?: {
    fullName: string;
  } | null;
}

export interface DirectPaymentPdfDocumentProps {
  payment: DirectPaymentData;
}

export function DirectPaymentPdfDocument({
  payment,
}: DirectPaymentPdfDocumentProps) {
  const formattedDate = new Date(payment.paymentDate).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const voucherCode =
    payment.voucherCode || payment.referenceNumber || `#PAG-${payment.id}`;
  const currCode = payment.transactionCurrency || "USD";
  const symbol = getCurrencySymbol(currCode);
  const amountPaidNum = Number(payment.amountPaid || 0);
  const rateNum = Number(payment.exchangeRate || 1.0);
  const equivalentUsd = payment.equivalentAmountUsd
    ? Number(payment.equivalentAmountUsd)
    : currCode === "USD"
      ? amountPaidNum
      : rateNum > 0
        ? amountPaidNum / rateNum
        : amountPaidNum;

  return (
    <BasePdfDocument
      title={`Comprobante_Egreso_${voucherCode}`}
      subject="Comprobante de Egreso y Pago Directo - ERP-IDI"
    >
      <PdfPage>
        {/* Cabecera */}
        <PdfHeader
          title="COMPROBANTE DE EGRESO"
          subtitle="TESORERÍA Y CONTROL BANCARIO"
          documentNumber={voucherCode}
          date={formattedDate}
          status="ASENTADO / LIQUIDADO"
          badge="ORDEN DE PAGO"
        />

        {/* Barra de Metadatos */}
        <PdfInfoBar
          items={[
            { label: "Método de Pago", value: (payment.method || "TRANSFERENCIA").replace(/_/g, " ") },
            {
              label: "Moneda de Transacción",
              value: `${currCode} (${symbol})`,
            },
            {
              label: "Tasa de Cambio",
              value:
                currCode === "USD"
                  ? "1.00 (Base)"
                  : `${rateNum.toFixed(2)} Bs./divisa`,
            },
            {
              label: "Registrado por",
              value: payment.registeredBy?.fullName || "Administración",
            },
          ]}
        />

        {/* Resumen de Monto Pagado */}
        <View style={styles.amountHighlightBox} wrap={false}>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Monto Desembolsado:</Text>
            <Text style={styles.amountValue}>
              {symbol} {amountPaidNum.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currCode}
            </Text>
          </View>
          <View style={styles.equivCol}>
            <Text style={styles.equivLabel}>Contravalor Financiero:</Text>
            <Text style={styles.equivValue}>
              $ {equivalentUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </Text>
          </View>
        </View>

        {/* Tarjetas Informativas: Beneficiario vs Cuenta Origen */}
        <PdfCardGrid>
          <PdfInfoCard
            title="Datos del Beneficiario"
            badge="Receptor"
            fields={[
              { label: "Razón Social / Beneficiario", value: payment.beneficiary },
              { label: "Concepto del Egreso", value: payment.concept },
              {
                label: "Cuenta / Destino",
                value: payment.destinationAccount || "Pago por Taquilla / Efectivo",
              },
            ]}
          />

          <PdfInfoCard
            title="Cuenta Bancaria de Origen"
            badge="Tesoreria IDI"
            fields={[
              {
                label: "Entidad Financiera",
                value: payment.sourceAccount?.bankName || "Caja Institucional",
              },
              {
                label: "Número de Cuenta",
                value: payment.sourceAccount?.accountNumber
                  ? `•••• ${payment.sourceAccount.accountNumber.slice(-4)}`
                  : "N/A",
              },
              {
                label: "Titular",
                value:
                  payment.sourceAccount?.holderName ||
                  "INMUNOLOGIA ASOCIACION CIVIL",
              },
              {
                label: "Referencia / Comprobante",
                value: payment.referenceNumber || "Registrado en voucher",
              },
            ]}
          />
        </PdfCardGrid>

        {/* Detalle del Pago */}
        <View style={styles.detailCard} wrap={false}>
          <Text style={styles.detailTitle}>Liquidación y Asiento Contable</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Concepto Detallado:</Text>
            <Text style={[styles.detailVal, { width: "65%", textAlign: "right" }]}>
              {payment.concept}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Instrumento Financiero:</Text>
            <Text style={styles.detailVal}>
              {(payment.method || "TRANSFERENCIA").replace(/_/g, " ")} ({currCode})
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tasa de Liquidación:</Text>
            <Text style={styles.detailVal}>
              {rateNum > 1 ? `${rateNum.toFixed(2)} Bs./$` : "Paridad Oficial"}
            </Text>
          </View>
        </View>

        {/* Observaciones */}
        {payment.notes && (
          <PdfNotice
            title="Observaciones del Pago:"
            text={payment.notes}
          />
        )}

        {/* Firmas de Control de Egresos */}
        <PdfSignatures
          signatures={[
            {
              role: "Elaborado por (Tesoreria)",
              name: payment.registeredBy?.fullName || "Unidad de Pagos",
              department: "Tesorería y Control Bancario",
              stampText: "Firma / Sello Tesorería",
            },
            {
              role: "Revisado por (Administración)",
              name: payment.reviewedBy || undefined,
              department: "Administración y Finanzas",
              stampText: "Firma / Sello Administración",
            },
            {
              role: "Aprobado por (Dirección)",
              name: payment.approvedBy || undefined,
              department: "Dirección General IDI",
              stampText: "Firma / Sello Dirección",
            },
          ]}
        />
      </PdfPage>
    </BasePdfDocument>
  );
}

export default DirectPaymentPdfDocument;
