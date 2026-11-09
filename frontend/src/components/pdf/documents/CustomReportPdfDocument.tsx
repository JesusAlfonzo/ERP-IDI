"use client";

import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import {
  BasePdfDocument,
  PdfPage,
  PdfHeader,
  PdfInfoBar,
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

const styles = StyleSheet.create({
  summaryCardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryCard: {
    width: "24%",
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
    fontSize: 10,
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
  dateRange?: string;
  columns: CustomReportColumn[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Record<string, any>[];
  summaryItems?: CustomReportSummaryItem[];
  includeSignatures?: boolean;
  orientation?: "portrait" | "landscape";
}

export function CustomReportPdfDocument({
  title,
  subtitle = "REPORTE DE AUDITORÍA Y TRAZABILIDAD",
  documentNumber = "REP-AUDIT",
  dateRange,
  columns,
  rows,
  summaryItems,
  includeSignatures = true,
  orientation = "landscape",
}: CustomReportPdfDocumentProps) {
  const formattedDate = new Date().toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <BasePdfDocument
      title={title}
      subject="Reporte Oficial de Auditoría y Trazabilidad - ERP-IDI"
    >
      <PdfPage orientation={orientation}>
        {/* Cabecera */}
        <PdfHeader
          title={title}
          subtitle={subtitle}
          documentNumber={documentNumber}
          date={formattedDate}
          badge="AUDITORÍA OFICIAL"
        />

        {/* Metadatos */}
        <PdfInfoBar
          items={[
            { label: "Período / Rango", value: dateRange || "Todo el histórico" },
            { label: "Renglones Evaluados", value: rows.length },
            { label: "Fecha de Extracción", value: formattedDate },
            { label: "Sistema", value: "ERP-IDI v2.0" },
          ]}
        />

        {/* Tarjetas de Resumen Numérico si existen */}
        {summaryItems && summaryItems.length > 0 && (
          <View style={styles.summaryCardsRow} wrap={false}>
            {summaryItems.slice(0, 4).map((it, idx) => (
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
              <PdfTableCell width="100%" align="center" style={{ paddingVertical: 12 }}>
                No se encontraron registros para los filtros seleccionados.
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

        {/* Firmas Institucionales */}
        {includeSignatures && (
          <PdfSignatures
            signatures={[
              {
                role: "Generado por (Auditor)",
                department: "Unidad de Control y Trazabilidad",
                stampText: "Firma / Sello Auditor",
              },
              {
                role: "Revisado por (Administración)",
                department: "Administración y Control Presupuestario",
                stampText: "Firma / Sello Administración",
              },
              {
                role: "Visto Bueno (Dirección)",
                department: "Instituto de Inmunología Clínica",
                stampText: "Firma / Sello Dirección",
              },
            ]}
          />
        )}
      </PdfPage>
    </BasePdfDocument>
  );
}

export default CustomReportPdfDocument;
