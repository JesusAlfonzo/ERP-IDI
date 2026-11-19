"use client";

import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import {
  BasePdfDocument,
  PdfPage,
  PdfHeader,
  PdfInfoBar,
  PdfSignatures,
  PdfNotice,
  type SignatureItem,
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
  summaryCardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 4,
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: "22%",
    borderWidth: 0.8,
    borderColor: PDF_COLORS.borderLight,
    borderStyle: "solid",
    borderRadius: 3,
    backgroundColor: PDF_COLORS.bgSubtle,
    padding: 5,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 5.8,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.textMuted,
    textTransform: "uppercase",
  },
  summaryVal: {
    fontSize: 9.5,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.navyDark,
    marginTop: 1,
  },
});

export interface CustomReportColumn {
  key: string;
  label: string;
  width: string;
  align?: "left" | "center" | "right";
  bold?: boolean;
}

export interface CustomReportSummaryItem {
  label: string;
  value: string | number;
}

export interface CustomReportPdfDocumentProps {
  title: string;
  subtitle?: string;
  documentNumber?: string;
  badge?: string;
  dateRange?: string;
  filterSummary?: string;
  footerNotes?: string;
  columns: CustomReportColumn[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Record<string, any>[];
  summaryItems?: CustomReportSummaryItem[];
  includeSummaryMetrics?: boolean;
  includeSignatures?: boolean;
  customSignatures?: SignatureItem[];
  orientation?: "portrait" | "landscape";
}

export function CustomReportPdfDocument({
  title,
  subtitle = "REPORTE OFICIAL · ERP-IDI",
  documentNumber = "REP-IDI",
  badge = "REPORTE OFICIAL",
  dateRange,
  filterSummary,
  footerNotes,
  columns,
  rows,
  summaryItems,
  includeSummaryMetrics = true,
  includeSignatures = true,
  customSignatures,
  orientation = "landscape",
}: CustomReportPdfDocumentProps) {
  const formattedDate = new Date().toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const activeSignatures: SignatureItem[] =
    customSignatures && customSignatures.length > 0
      ? customSignatures
      : [
          {
            role: "Elaborado por",
            department: "Control y Auditoría",
            stampText: "Firma / Sello",
          },
          {
            role: "Revisado por",
            department: "Coordinación / Administración",
            stampText: "Firma / Sello",
          },
          {
            role: "Aprobado por",
            department: "Dirección Ejecutiva",
            stampText: "Firma / Sello",
          },
        ];

  return (
    <BasePdfDocument
      title={title}
      subject="Reporte Oficial - ERP-IDI"
    >
      <PdfPage orientation={orientation}>
        {/* Cabecera */}
        <PdfHeader
          title={title}
          subtitle={subtitle}
          documentNumber={documentNumber}
          date={formattedDate}
          badge={badge}
        />

        {/* Metadatos */}
        <PdfInfoBar
          items={[
            { label: "Período", value: dateRange || "Histórico Completo" },
            { label: "Filtro", value: filterSummary || "Todos los registros" },
            { label: "Registros", value: rows.length },
            { label: "Emisión", value: formattedDate },
          ]}
        />

        {/* Tarjetas de Resumen Numérico */}
        {includeSummaryMetrics && summaryItems && summaryItems.length > 0 && (
          <View style={styles.summaryCardsRow} wrap={false}>
            {summaryItems.slice(0, 6).map((it, idx) => (
              <View key={idx} style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{it.label}</Text>
                <Text style={styles.summaryVal}>{it.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tabla Dinámica de Datos */}
        <PdfTable>
          <PdfTableHeader>
            {columns.map((col, idx) => (
              <PdfTableHeaderCell
                key={idx}
                width={col.width}
                align={col.align || "left"}
              >
                {col.label}
              </PdfTableHeaderCell>
            ))}
          </PdfTableHeader>

          {rows.length === 0 ? (
            <PdfTableRow isAlt={false}>
              <PdfTableCell
                width="100%"
                align="center"
                style={{ paddingVertical: 12 }}
              >
                Sin registros para los filtros seleccionados.
              </PdfTableCell>
            </PdfTableRow>
          ) : (
            rows.map((row, rIdx) => (
              <PdfTableRow key={rIdx} isAlt={rIdx % 2 === 1}>
                {columns.map((col, cIdx) => (
                  <PdfTableCell
                    key={cIdx}
                    width={col.width}
                    align={col.align || "left"}
                    bold={col.bold}
                  >
                    {row[col.key] != null ? String(row[col.key]) : "---"}
                  </PdfTableCell>
                ))}
              </PdfTableRow>
            ))
          )}
        </PdfTable>

        {/* Nota u Observación al Pie del Reporte */}
        {footerNotes && footerNotes.trim().length > 0 && (
          <PdfNotice title="Observaciones del Reporte" text={footerNotes} />
        )}

        {/* Firmas Institucionales */}
        {includeSignatures && <PdfSignatures signatures={activeSignatures} />}
      </PdfPage>
    </BasePdfDocument>
  );
}

export default CustomReportPdfDocument;
