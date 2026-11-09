"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { PurchaseOrder } from "@/types/purchasing";
import { getCurrencySymbol, normalizeCurrencyCode } from "@/utils/currency";
import { formatPdfCode } from "@/components/pdf/utils";

// Paleta Institucional ERP-IDI
const COLORS = {
  navyDark: "#1e3a8a",
  navyMedium: "#1e40af",
  navyLight: "#eff6ff",
  textPrimary: "#0f172a",
  textSecondary: "#334155",
  textMuted: "#64748b",
  borderDark: "#94a3b8",
  borderLight: "#cbd5e1",
  borderFaint: "#e2e8f0",
  bgSubtle: "#f8fafc",
  bgHeader: "#f1f5f9",
  emerald: "#15803d",
  emeraldBg: "#f0fdf4",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    lineHeight: 1.3,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    paddingTop: 24,
    paddingBottom: 34,
    paddingHorizontal: 28,
  },

  // Encabezado
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.navyDark,
    borderBottomStyle: "solid",
    paddingBottom: 8,
    marginBottom: 8,
  },
  institutionCol: {
    flexDirection: "row",
    alignItems: "center",
    width: "58%",
  },
  logoBox: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.navyDark,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  logoTextIAC: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  logoTextIDI: {
    color: "#93c5fd",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  institutionInfo: {
    flexDirection: "column",
  },
  institutionName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navyDark,
    textTransform: "uppercase",
  },
  institutionSub: {
    fontSize: 7.5,
    fontFamily: "Helvetica",
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  institutionRif: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textMuted,
    marginTop: 1,
  },
  docMetaCol: {
    width: "40%",
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navyDark,
    textTransform: "uppercase",
  },
  docSubtitlePill: {
    backgroundColor: COLORS.navyLight,
    borderWidth: 0.5,
    borderColor: COLORS.navyMedium,
    borderStyle: "solid",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    marginTop: 2,
    marginBottom: 3,
  },
  docSubtitleText: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navyMedium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 1,
  },
  metaLabel: {
    fontSize: 7.5,
    color: COLORS.textMuted,
    marginRight: 4,
  },
  metaValue: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textPrimary,
  },

  // Bloque de Emisor vs Proveedor (2 Columnas)
  partiesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  partyCard: {
    width: "49%",
    borderWidth: 0.8,
    borderColor: COLORS.borderLight,
    borderStyle: "solid",
    borderRadius: 4,
    backgroundColor: COLORS.bgSubtle,
    padding: 6,
  },
  partyCardHeader: {
    borderBottomWidth: 0.6,
    borderBottomColor: COLORS.borderLight,
    borderBottomStyle: "solid",
    paddingBottom: 2,
    marginBottom: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  partyCardTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navyDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  partyName: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textPrimary,
    marginBottom: 1.5,
  },
  partyLine: {
    fontSize: 7,
    color: COLORS.textSecondary,
    marginBottom: 1,
  },
  partyLabel: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.textMuted,
  },

  // Barra de Metadatos Rápida
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COLORS.bgHeader,
    borderWidth: 0.6,
    borderColor: COLORS.borderLight,
    borderStyle: "solid",
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  infoBarItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoBarLabel: {
    fontSize: 7,
    color: COLORS.textMuted,
    marginRight: 3,
  },
  infoBarValue: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textPrimary,
  },

  // Tabla de Renglones
  tableContainer: {
    marginBottom: 8,
    borderWidth: 0.8,
    borderColor: COLORS.borderLight,
    borderStyle: "solid",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.navyDark,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: "flex-start",
  },
  tableHeaderCell: {
    color: COLORS.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 6.8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: COLORS.borderFaint,
    borderTopStyle: "solid",
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    alignItems: "flex-start",
  },
  tableRowAlt: {
    backgroundColor: COLORS.bgSubtle,
  },
  tableCell: {
    fontSize: 7.2,
    color: COLORS.textSecondary,
    lineHeight: 1.25,
  },
  colSku: {
    width: "18%",
    paddingRight: 4,
    overflow: "hidden",
    flexShrink: 0,
    flexGrow: 0,
  },
  skuText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    color: COLORS.textPrimary,
  },
  colDesc: {
    width: "32%",
    paddingRight: 4,
    overflow: "hidden",
    flexShrink: 0,
    flexGrow: 0,
  },
  colUnit: {
    width: "8%",
    textAlign: "center",
    paddingRight: 2,
    overflow: "hidden",
    flexShrink: 0,
    flexGrow: 0,
  },
  colQty: {
    width: "9%",
    textAlign: "right",
    paddingRight: 2,
    overflow: "hidden",
    flexShrink: 0,
    flexGrow: 0,
  },
  colPrice: {
    width: "14%",
    textAlign: "right",
    paddingRight: 2,
    overflow: "hidden",
    flexShrink: 0,
    flexGrow: 0,
  },
  colTax: {
    width: "7%",
    textAlign: "center",
    paddingRight: 2,
    overflow: "hidden",
    flexShrink: 0,
    flexGrow: 0,
  },
  colTotal: {
    width: "12%",
    textAlign: "right",
    overflow: "hidden",
    flexShrink: 0,
    flexGrow: 0,
  },
  itemFactorSubtext: {
    fontSize: 5.8,
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginTop: 0.5,
  },

  // Totales y Liquidación Fiscal
  totalsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  totalsBoxLeft: {
    width: "49%",
    borderWidth: 0.8,
    borderColor: COLORS.borderLight,
    borderStyle: "solid",
    borderRadius: 4,
    backgroundColor: COLORS.white,
    padding: 6,
  },
  totalsBoxRight: {
    width: "49%",
    borderWidth: 0.8,
    borderColor: COLORS.borderLight,
    borderStyle: "solid",
    borderRadius: 4,
    backgroundColor: COLORS.bgSubtle,
    padding: 6,
  },
  totalsHeader: {
    borderBottomWidth: 0.6,
    borderBottomColor: COLORS.borderLight,
    borderBottomStyle: "solid",
    paddingBottom: 2.5,
    marginBottom: 3.5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalsHeaderText: {
    fontSize: 6.8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navyDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  totalsRateBadge: {
    fontSize: 6.2,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navyMedium,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  totalLabel: {
    fontSize: 7,
    color: COLORS.textSecondary,
  },
  totalVal: {
    fontSize: 7.2,
    fontFamily: "Helvetica",
    color: COLORS.textPrimary,
  },
  totalFinalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.8,
    borderTopColor: COLORS.navyDark,
    borderTopStyle: "solid",
    paddingTop: 3,
    marginTop: 2,
  },
  totalFinalLabel: {
    fontSize: 7.8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navyDark,
    textTransform: "uppercase",
  },
  totalFinalValDivisa: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navyMedium,
  },
  totalFinalValBs: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.emerald,
  },

  // Firmas Institucionales (3 Columnas)
  signaturesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 2,
  },
  signatureCard: {
    width: "32%",
    borderWidth: 0.6,
    borderColor: COLORS.borderLight,
    borderStyle: "solid",
    borderRadius: 3,
    padding: 5,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  stampBox: {
    width: "100%",
    height: 38,
    borderWidth: 0.5,
    borderColor: COLORS.borderFaint,
    borderStyle: "dashed",
    borderRadius: 2,
    marginBottom: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  stampBoxText: {
    fontSize: 5.5,
    color: "#94a3b8",
    fontFamily: "Helvetica",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sigLine: {
    width: "80%",
    borderBottomWidth: 0.6,
    borderBottomColor: COLORS.textSecondary,
    borderBottomStyle: "solid",
    marginBottom: 3,
  },
  sigRole: {
    fontSize: 6.8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navyDark,
    textAlign: "center",
    textTransform: "uppercase",
  },
  sigDepartment: {
    fontSize: 5.8,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 1,
  },

  // Observaciones y Notas
  notesContainer: {
    borderWidth: 0.5,
    borderColor: COLORS.borderLight,
    borderStyle: "solid",
    borderRadius: 3,
    backgroundColor: COLORS.bgSubtle,
    padding: 5,
    marginBottom: 8,
  },
  notesTitle: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navyDark,
    textTransform: "uppercase",
    marginBottom: 1.5,
  },
  notesText: {
    fontSize: 6.5,
    color: COLORS.textSecondary,
    lineHeight: 1.25,
  },

  // Pie de Página Fijo
  footerContainer: {
    position: "absolute",
    bottom: 12,
    left: 28,
    right: 28,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.borderLight,
    borderTopStyle: "solid",
    paddingTop: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLegal: {
    fontSize: 5.8,
    color: COLORS.textMuted,
  },
  footerPagination: {
    fontSize: 6.2,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navyDark,
  },
});

export interface PurchaseOrderPdfDocumentProps {
  order: PurchaseOrder;
  effectiveBcvRate?: number;
  symbol?: string;
  currCode?: string;
}

export const PurchaseOrderPdfDocument: React.FC<PurchaseOrderPdfDocumentProps> = ({
  order,
  effectiveBcvRate: propBcvRate,
  symbol: propSymbol,
  currCode: propCurrCode,
}) => {
  const currCode = propCurrCode || normalizeCurrencyCode(order.currency);
  const symbol = propSymbol || getCurrencySymbol(order.currency);
  const rate = Number(order.exchangeRate || 0);

  const effectiveBcvRate =
    propBcvRate !== undefined
      ? propBcvRate
      : rate > 0
        ? rate
        : 75.0;

  // Subtotales y desglose fiscal
  const fallbackTaxable =
    order.items?.reduce((acc, it) => {
      return !it.isExempt
        ? acc + Number(it.quantityOrdered) * Number(it.unitPrice)
        : acc;
    }, 0) ?? 0;

  const fallbackExempt =
    order.items?.reduce((acc, it) => {
      return it.isExempt
        ? acc + Number(it.quantityOrdered) * Number(it.unitPrice)
        : acc;
    }, 0) ?? 0;

  const taxableAmount =
    order.taxableAmount != null
      ? Number(order.taxableAmount)
      : order.taxableAmountUsd != null
        ? Number(order.taxableAmountUsd)
        : fallbackTaxable;

  const exemptAmount =
    order.exemptAmount != null
      ? Number(order.exemptAmount)
      : order.exemptAmountUsd != null
        ? Number(order.exemptAmountUsd)
        : fallbackExempt;

  const taxAmount =
    order.taxAmount != null
      ? Number(order.taxAmount)
      : order.taxAmountUsd != null
        ? Number(order.taxAmountUsd)
        : Math.round(taxableAmount * 0.16 * 100) / 100;

  const totalAmount =
    order.totalAmount != null
      ? Number(order.totalAmount)
      : order.totalAmountUsd != null
        ? Number(order.totalAmountUsd)
        : Number(order.total || 0);

  const conversionFactorToBs = currCode === "VED" ? 1.0 : effectiveBcvRate;

  const totalOrderBs =
    order.totalAmountBs != null
      ? Number(order.totalAmountBs)
      : currCode === "VED"
        ? totalAmount
        : Math.round(totalAmount * conversionFactorToBs * 100) / 100;

  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : new Date().toLocaleDateString("es-VE");

  const supplier = order.supplier;
  const requisitionNumber = order.requisition?.requisitionNumber;
  const departmentSection = order.requisition?.departmentSection;

  return (
    <Document
      title={`Orden_Compra_${order.orderNumber || order.id}`}
      author="Instituto de Inmunología Clínica - ERP-IDI"
      subject="Orden de Compra Institucional SENIAT"
      keywords="ERP-IDI, Orden de Compra, SENIAT, Inmunología"
    >
      <Page size="LETTER" orientation="portrait" style={styles.page}>
        {/* ENCABEZADO INSTITUCIONAL */}
        <View style={styles.headerContainer}>
          <View style={styles.institutionCol}>
            <View style={styles.logoBox}>
              <Text style={styles.logoTextIAC}>IAC</Text>
              <Text style={styles.logoTextIDI}>IDI</Text>
            </View>
            <View style={styles.institutionInfo}>
              <Text style={styles.institutionName}>
                INMUNOLOGIA ASOCIACION CIVIL
              </Text>
              <Text style={styles.institutionSub}>
                Instituto de Inmunología &quot;Dr. Nicolás E. Bianco Colmenares&quot;
              </Text>
              <Text style={styles.institutionRif}>
                RIF: J-30710739-1 · Universidad Central de Venezuela
              </Text>
            </View>
          </View>

          <View style={styles.docMetaCol}>
            <Text style={styles.docTitle}>ORDEN DE COMPRA</Text>
            <View style={styles.docSubtitlePill}>
              <Text style={styles.docSubtitleText}>
                PROFORMA FISCAL SENIAT
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>N° Orden:</Text>
              <Text style={styles.metaValue}>
                {order.orderNumber || `#${order.id}`}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Fecha de Emisión:</Text>
              <Text style={styles.metaValue}>{formattedDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Estado:</Text>
              <Text style={styles.metaValue}>{order.status}</Text>
            </View>
          </View>
        </View>

        {/* METADATOS RÁPIDOS */}
        <View style={styles.infoBar}>
          <View style={styles.infoBarItem}>
            <Text style={styles.infoBarLabel}>Preorden / Ref:</Text>
            <Text style={styles.infoBarValue}>
              {requisitionNumber || "N/A"}
            </Text>
          </View>
          <View style={styles.infoBarItem}>
            <Text style={styles.infoBarLabel}>Área Solicitante:</Text>
            <Text style={styles.infoBarValue}>
              {departmentSection || "Unidad de Procura Central"}
            </Text>
          </View>
          <View style={styles.infoBarItem}>
            <Text style={styles.infoBarLabel}>Moneda de Pago:</Text>
            <Text style={styles.infoBarValue}>
              {currCode} ({symbol})
            </Text>
          </View>
          <View style={styles.infoBarItem}>
            <Text style={styles.infoBarLabel}>Condición:</Text>
            <Text style={styles.infoBarValue}>
              {order.paymentStatus || "PENDIENTE"}
            </Text>
          </View>
        </View>

        {/* PARTES: EMISOR VS PROVEEDOR (2 COLUMNAS) */}
        <View style={styles.partiesContainer}>
          {/* Emisor */}
          <View style={styles.partyCard}>
            <View style={styles.partyCardHeader}>
              <Text style={styles.partyCardTitle}>Comprador Institucional</Text>
              <Text style={[styles.partyLine, { fontSize: 6.5, marginBottom: 0 }]}>
                RIF: J-30710739-1
              </Text>
            </View>
            <Text style={styles.partyName}>INMUNOLOGIA ASOCIACION CIVIL</Text>
            <Text style={styles.partyLine}>
              <Text style={styles.partyLabel}>Sede: </Text>
              Instituto de Inmunología Clínica, Edif. IDI, UCV, Caracas 1050
            </Text>
            <Text style={styles.partyLine}>
              <Text style={styles.partyLabel}>Contacto: </Text>
              compras@idi.org.ve · administracion@idi.org.ve
            </Text>
            <Text style={styles.partyLine}>
              <Text style={styles.partyLabel}>Teléfono: </Text>
              +58 (212) 605-3500 / 605-3501
            </Text>
          </View>

          {/* Proveedor Adjudicado */}
          <View style={styles.partyCard}>
            <View style={styles.partyCardHeader}>
              <Text style={styles.partyCardTitle}>Proveedor Adjudicado</Text>
              <Text style={[styles.partyLine, { fontSize: 6.5, marginBottom: 0 }]}>
                RIF: {supplier?.rifOrId || supplier?.rif || "N/A"}
              </Text>
            </View>
            <Text style={styles.partyName}>
              {supplier?.name || "Proveedor no asignado"}
            </Text>
            <Text style={styles.partyLine}>
              <Text style={styles.partyLabel}>Contacto / Resp.: </Text>
              {supplier?.contactName || supplier?.email || "No registrado"}
            </Text>
            <Text style={styles.partyLine}>
              <Text style={styles.partyLabel}>Teléfono: </Text>
              {supplier?.phone || "No registrado"}
            </Text>
            <Text style={styles.partyLine}>
              <Text style={styles.partyLabel}>Dirección Fiscal: </Text>
              {supplier?.address || "No especificada"}
            </Text>
          </View>
        </View>

        {/* TABLA DE RENGLONES DE LA ORDEN */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <View style={styles.colSku}>
              <Text style={styles.tableHeaderCell}>SKU</Text>
            </View>
            <View style={styles.colDesc}>
              <Text style={styles.tableHeaderCell}>Descripción / Insumo</Text>
            </View>
            <View style={styles.colUnit}>
              <Text style={[styles.tableHeaderCell, { textAlign: "center" }]}>Unidad</Text>
            </View>
            <View style={styles.colQty}>
              <Text style={[styles.tableHeaderCell, { textAlign: "right" }]}>Cant.</Text>
            </View>
            <View style={styles.colPrice}>
              <Text style={[styles.tableHeaderCell, { textAlign: "right" }]}>
                P. Unit. ({symbol})
              </Text>
            </View>
            <View style={styles.colTax}>
              <Text style={[styles.tableHeaderCell, { textAlign: "center" }]}>IVA</Text>
            </View>
            <View style={styles.colTotal}>
              <Text style={[styles.tableHeaderCell, { textAlign: "right" }]}>
                Total ({symbol})
              </Text>
            </View>
          </View>

          {order.items?.map((item, idx) => {
            const lineTotal =
              Number(item.quantityOrdered) * Number(item.unitPrice);
            const unitText =
              item.unit?.abbreviation ||
              item.product?.baseUnit?.abbreviation ||
              item.product?.unitOfMeasure ||
              "UND";
            const factor = Number(item.multiplier || 1);
            const baseUnit =
              item.product?.baseUnit?.abbreviation ||
              item.product?.unitOfMeasure ||
              "UND";

            const isAlt = idx % 2 === 1;

            return (
              <View
                key={String(item.id || idx)}
                style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}
                wrap={false}
              >
                <View style={styles.colSku}>
                  <Text style={[styles.tableCell, styles.skuText]}>
                    {formatPdfCode(item.product?.sku)}
                  </Text>
                </View>
                <View style={styles.colDesc}>
                  <Text
                    style={[
                      styles.tableCell,
                      { fontFamily: "Helvetica-Bold", color: COLORS.textPrimary },
                    ]}
                  >
                    {item.product?.name || "Producto sin nombre"}
                  </Text>
                  {factor > 1 && (
                    <Text style={styles.itemFactorSubtext}>
                      Factor: 1 {unitText} = {factor} {baseUnit} (Total equiv.:{" "}
                      {Number(item.quantityOrdered) * factor} {baseUnit})
                    </Text>
                  )}
                </View>
                <View style={styles.colUnit}>
                  <Text style={[styles.tableCell, { textAlign: "center" }]}>
                    {unitText}
                  </Text>
                </View>
                <View style={styles.colQty}>
                  <Text style={[styles.tableCell, { textAlign: "right", fontFamily: "Helvetica-Bold" }]}>
                    {Number(item.quantityOrdered)}
                  </Text>
                </View>
                <View style={styles.colPrice}>
                  <Text style={[styles.tableCell, { textAlign: "right" }]}>
                    {Number(item.unitPrice).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.colTax}>
                  <Text style={[styles.tableCell, { textAlign: "center" }]}>
                    {item.isExempt ? "Exento" : "16%"}
                  </Text>
                </View>
                <View style={styles.colTotal}>
                  <Text style={[styles.tableCell, { textAlign: "right", fontFamily: "Helvetica-Bold", color: COLORS.textPrimary }]}>
                    {lineTotal.toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* TOTALES Y LIQUIDACIÓN FISCAL SENIAT */}
        <View style={styles.totalsSection} wrap={false}>
          {/* Totales en Divisa / Moneda Pactada */}
          <View style={styles.totalsBoxLeft}>
            <View style={styles.totalsHeader}>
              <Text style={styles.totalsHeaderText}>
                Totales en Moneda Pactada ({currCode})
              </Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Base Imponible Gravable (16%):</Text>
              <Text style={styles.totalVal}>
                {symbol} {taxableAmount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal Exento de IVA:</Text>
              <Text style={styles.totalVal}>
                {symbol} {exemptAmount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Impuesto al Valor Agregado (16%):</Text>
              <Text style={styles.totalVal}>
                {symbol} {taxAmount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.totalFinalRow}>
              <Text style={styles.totalFinalLabel}>
                Total Orden ({currCode}):
              </Text>
              <Text style={styles.totalFinalValDivisa}>
                {symbol} {totalAmount.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Liquidación Oficial en Bolívares */}
          <View style={styles.totalsBoxRight}>
            <View style={styles.totalsHeader}>
              <Text style={styles.totalsHeaderText}>
                Liquidación Oficial SENIAT (Bs.)
              </Text>
              <Text style={styles.totalsRateBadge}>
                {currCode === "VED"
                  ? "Tasa Oficial: 1.00"
                  : `Tasa BCV: ${effectiveBcvRate.toFixed(2)} Bs./${currCode === "EUR" ? "€" : "$"}`}
              </Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Base Gravable en Bs.:</Text>
              <Text style={styles.totalVal}>
                Bs.{" "}
                {(taxableAmount * conversionFactorToBs).toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal Exento en Bs.:</Text>
              <Text style={styles.totalVal}>
                Bs.{" "}
                {(exemptAmount * conversionFactorToBs).toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA 16% en Bs.:</Text>
              <Text style={styles.totalVal}>
                Bs.{" "}
                {(taxAmount * conversionFactorToBs).toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View style={styles.totalFinalRow}>
              <Text style={styles.totalFinalLabel}>
                Total Oficial (Bs.):
              </Text>
              <Text style={styles.totalFinalValBs}>
                Bs.{" "}
                {totalOrderBs.toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* NOTAS / CONDICIONES */}
        <View style={styles.notesContainer} wrap={false}>
          <Text style={styles.notesTitle}>Observaciones y Cláusula Fiscal:</Text>
          <Text style={styles.notesText}>
            {order.notes ||
              "Esta Orden de Compra constituye un compromiso formal de adquisición y entrega sujeta a inspección física, control de calidad y liquidación de factura legal SENIAT con el RIF institucional J-30710739-1."}
          </Text>
        </View>

        {/* 3 FIRMAS HORIZONTALES */}
        <View style={styles.signaturesContainer} wrap={false}>
          <View style={styles.signatureCard}>
            <View style={styles.stampBox}>
              <Text style={styles.stampBoxText}>Sello Húmedo Compras</Text>
            </View>
            <View style={styles.sigLine} />
            <Text style={styles.sigRole}>Elaborado por (Compras)</Text>
            <Text style={styles.sigDepartment}>
              Unidad de Procura y Suministros
            </Text>
          </View>

          <View style={styles.signatureCard}>
            <View style={styles.stampBox}>
              <Text style={styles.stampBoxText}>Sello Húmedo Administración</Text>
            </View>
            <View style={styles.sigLine} />
            <Text style={styles.sigRole}>Revisado por (Administración)</Text>
            <Text style={styles.sigDepartment}>
              Control Presupuestario y Finanzas
            </Text>
          </View>

          <View style={styles.signatureCard}>
            <View style={styles.stampBox}>
              <Text style={styles.stampBoxText}>Sello Húmedo Dirección</Text>
            </View>
            <View style={styles.sigLine} />
            <Text style={styles.sigRole}>Aprobado por (Dirección)</Text>
            <Text style={styles.sigDepartment}>
              Dirección General IDI
            </Text>
          </View>
        </View>

        {/* PIE DE PÁGINA FIJO CON PAGINACIÓN DINÁMICA */}
        <View style={styles.footerContainer} fixed>
          <Text style={styles.footerLegal}>
            ERP-IDI v2.0 · INMUNOLOGIA ASOCIACION CIVIL · RIF: J-30710739-1 · Proforma Fiscal Oficial SENIAT
          </Text>
          <Text
            style={styles.footerPagination}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

export default PurchaseOrderPdfDocument;
