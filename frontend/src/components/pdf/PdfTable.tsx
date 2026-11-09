"use client";

import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS, PDF_FONTS } from "./theme";
import { processPdfCellContent } from "./utils";

const styles = StyleSheet.create({
  tableContainer: {
    marginBottom: 8,
    borderWidth: 0.8,
    borderColor: PDF_COLORS.borderLight,
    borderStyle: "solid",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: PDF_COLORS.navyDark,
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignItems: "flex-start",
  },
  tableHeaderCell: {
    color: PDF_COLORS.bgWhite,
    fontFamily: PDF_FONTS.bold,
    fontSize: 6.8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.borderFaint,
    borderTopStyle: "solid",
    paddingVertical: 3.5,
    paddingHorizontal: 2,
    alignItems: "flex-start", // Alineación superior uniforme para filas con varias líneas
  },
  tableRowAlt: {
    backgroundColor: PDF_COLORS.bgSubtle,
  },
  cellContainer: {
    paddingRight: 4, // Margen de seguridad estricto entre columnas contiguas
    paddingLeft: 2,
    overflow: "hidden", // Bloqueo de desbordamiento horizontal sobre la columna vecina
    flexShrink: 0,
    flexGrow: 0,
  },
  tableCell: {
    fontSize: 7,
    fontFamily: PDF_FONTS.regular,
    color: PDF_COLORS.textSecondary,
    lineHeight: 1.25,
  },
  tableCellBold: {
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.textPrimary,
  },
});

export interface PdfTableProps {
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style?: any;
}

export function PdfTable({ children, style }: PdfTableProps) {
  return <View style={[styles.tableContainer, style]}>{children}</View>;
}

export interface PdfTableHeaderProps {
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style?: any;
}

export function PdfTableHeader({ children, style }: PdfTableHeaderProps) {
  return <View style={[styles.tableHeader, style]}>{children}</View>;
}

export interface PdfTableHeaderCellProps {
  children: React.ReactNode;
  width: string;
  align?: "left" | "center" | "right";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style?: any;
}

export function PdfTableHeaderCell({
  children,
  width,
  align = "left",
  style,
}: PdfTableHeaderCellProps) {
  const content = processPdfCellContent(children);

  return (
    <View style={[styles.cellContainer, { width }, style]}>
      <Text
        style={[
          styles.tableHeaderCell,
          { textAlign: align },
        ]}
      >
        {content as React.ReactNode}
      </Text>
    </View>
  );
}

export interface PdfTableRowProps {
  children: React.ReactNode;
  isAlt?: boolean;
  wrap?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style?: any;
}

export function PdfTableRow({
  children,
  isAlt = false,
  wrap = false,
  style,
}: PdfTableRowProps) {
  return (
    <View
      style={[
        styles.tableRow,
        isAlt ? styles.tableRowAlt : {},
        style,
      ]}
      wrap={wrap}
    >
      {children}
    </View>
  );
}

export interface PdfTableCellProps {
  children: React.ReactNode;
  width: string;
  align?: "left" | "center" | "right";
  bold?: boolean;
  color?: string;
  fontSize?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style?: any;
}

export function PdfTableCell({
  children,
  width,
  align = "left",
  bold = false,
  color,
  fontSize,
  style,
}: PdfTableCellProps) {
  const content = processPdfCellContent(children);

  return (
    <View style={[styles.cellContainer, { width }, style]}>
      <Text
        style={[
          styles.tableCell,
          bold ? styles.tableCellBold : {},
          { textAlign: align },
          color ? { color } : {},
          fontSize ? { fontSize } : {},
        ]}
      >
        {content as React.ReactNode}
      </Text>
    </View>
  );
}
