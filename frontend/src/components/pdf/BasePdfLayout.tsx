"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { PDF_COLORS, PDF_FONTS, PDF_INSTITUTION } from "./theme";
import "./utils";

const styles = StyleSheet.create({
  pagePortrait: {
    fontFamily: PDF_FONTS.regular,
    fontSize: 8,
    lineHeight: 1.3,
    color: PDF_COLORS.textPrimary,
    backgroundColor: PDF_COLORS.bgWhite,
    paddingTop: 24,
    paddingBottom: 34,
    paddingHorizontal: 28,
  },
  pageLandscape: {
    fontFamily: PDF_FONTS.regular,
    fontSize: 8,
    lineHeight: 1.3,
    color: PDF_COLORS.textPrimary,
    backgroundColor: PDF_COLORS.bgWhite,
    paddingTop: 22,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },

  // Encabezado
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1.5,
    borderBottomColor: PDF_COLORS.navyDark,
    borderBottomStyle: "solid",
    paddingBottom: 7,
    marginBottom: 8,
  },
  institutionCol: {
    flexDirection: "row",
    alignItems: "center",
    width: "58%",
  },
  logoBox: {
    width: 42,
    height: 42,
    backgroundColor: PDF_COLORS.navyDark,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  logoTextIAC: {
    color: PDF_COLORS.bgWhite,
    fontSize: 11,
    fontFamily: PDF_FONTS.bold,
    letterSpacing: 1,
  },
  logoTextIDI: {
    color: "#93c5fd",
    fontSize: 6.5,
    fontFamily: PDF_FONTS.bold,
    letterSpacing: 0.5,
  },
  institutionInfo: {
    flexDirection: "column",
  },
  institutionName: {
    fontSize: 9.5,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.navyDark,
    textTransform: "uppercase",
  },
  institutionSub: {
    fontSize: 7.2,
    fontFamily: PDF_FONTS.regular,
    color: PDF_COLORS.textSecondary,
    marginTop: 0.5,
  },
  institutionRif: {
    fontSize: 7,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.textMuted,
    marginTop: 0.5,
  },
  docMetaCol: {
    width: "40%",
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 10.5,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.navyDark,
    textTransform: "uppercase",
    textAlign: "right",
  },
  docSubtitlePill: {
    backgroundColor: PDF_COLORS.navyLight,
    borderWidth: 0.5,
    borderColor: PDF_COLORS.navyMedium,
    borderStyle: "solid",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    marginTop: 2,
    marginBottom: 2.5,
  },
  docSubtitleText: {
    fontSize: 6.2,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.navyMedium,
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
    fontSize: 7,
    color: PDF_COLORS.textMuted,
    marginRight: 4,
  },
  metaValue: {
    fontSize: 7,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.textPrimary,
  },

  // Barra de Metadatos Rápida
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: PDF_COLORS.bgHeader,
    borderWidth: 0.6,
    borderColor: PDF_COLORS.borderLight,
    borderStyle: "solid",
    borderRadius: 3,
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  infoBarItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoBarLabel: {
    fontSize: 6.8,
    color: PDF_COLORS.textMuted,
    marginRight: 3,
  },
  infoBarValue: {
    fontSize: 6.8,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.textPrimary,
  },

  // Tarjetas de Bloque Informativo (2 Columnas o Múltiples)
  gridContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  card: {
    borderWidth: 0.7,
    borderColor: PDF_COLORS.borderLight,
    borderStyle: "solid",
    borderRadius: 4,
    backgroundColor: PDF_COLORS.bgSubtle,
    padding: 6,
  },
  cardHeader: {
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.borderLight,
    borderBottomStyle: "solid",
    paddingBottom: 2,
    marginBottom: 3.5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 6.8,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.navyDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cardBadge: {
    fontSize: 6,
    color: PDF_COLORS.textMuted,
  },
  cardLine: {
    fontSize: 6.8,
    color: PDF_COLORS.textSecondary,
    marginBottom: 1,
  },
  cardLabel: {
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.textMuted,
  },

  // Firmas Institucionales
  signaturesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    marginTop: 4,
  },
  signatureCard: {
    borderWidth: 0.6,
    borderColor: PDF_COLORS.borderLight,
    borderStyle: "solid",
    borderRadius: 3,
    padding: 5,
    alignItems: "center",
    backgroundColor: PDF_COLORS.bgWhite,
  },
  stampBox: {
    width: "100%",
    height: 36,
    borderWidth: 0.5,
    borderColor: PDF_COLORS.borderFaint,
    borderStyle: "dashed",
    borderRadius: 2,
    marginBottom: 3.5,
    justifyContent: "center",
    alignItems: "center",
  },
  stampBoxText: {
    fontSize: 5.2,
    color: PDF_COLORS.textFaint,
    fontFamily: PDF_FONTS.regular,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sigLine: {
    width: "80%",
    borderBottomWidth: 0.6,
    borderBottomColor: PDF_COLORS.textSecondary,
    borderBottomStyle: "solid",
    marginBottom: 2.5,
  },
  sigRole: {
    fontSize: 6.5,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.navyDark,
    textAlign: "center",
    textTransform: "uppercase",
  },
  sigDepartment: {
    fontSize: 5.6,
    color: PDF_COLORS.textMuted,
    textAlign: "center",
    marginTop: 0.5,
  },
  sigName: {
    fontSize: 5.8,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.textSecondary,
    textAlign: "center",
    marginTop: 0.5,
  },

  // Caja de Notas / Cláusula Legal
  noticeBox: {
    borderWidth: 0.5,
    borderColor: PDF_COLORS.borderLight,
    borderStyle: "solid",
    borderRadius: 3,
    backgroundColor: PDF_COLORS.bgSubtle,
    padding: 5,
    marginBottom: 6,
  },
  noticeTitle: {
    fontSize: 6.2,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.navyDark,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  noticeText: {
    fontSize: 6.2,
    color: PDF_COLORS.textSecondary,
    lineHeight: 1.25,
  },

  // Pie de Página Fijo
  footerContainer: {
    position: "absolute",
    bottom: 12,
    left: 28,
    right: 28,
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.borderLight,
    borderTopStyle: "solid",
    paddingTop: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLegal: {
    fontSize: 5.6,
    color: PDF_COLORS.textMuted,
  },
  footerPagination: {
    fontSize: 6,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.navyDark,
  },
});

/* =====================================================================
 * Componentes Exportables
 * ===================================================================== */

export interface BasePdfDocumentProps {
  title: string;
  author?: string;
  subject?: string;
  keywords?: string;
  children: React.ReactNode;
}

export function BasePdfDocument({
  title,
  author = PDF_INSTITUTION.fullName,
  subject = "Documento Oficial ERP-IDI",
  keywords = "ERP-IDI, Laboratorio, Almacén, Control Institucional",
  children,
}: BasePdfDocumentProps) {
  return (
    <Document
      title={title}
      author={author}
      subject={subject}
      keywords={keywords}
    >
      {children}
    </Document>
  );
}

export interface PdfPageProps {
  orientation?: "portrait" | "landscape";
  legalNotice?: string;
  children: React.ReactNode;
}

export function PdfPage({
  orientation = "portrait",
  legalNotice,
  children,
}: PdfPageProps) {
  return (
    <Page
      size="LETTER"
      orientation={orientation}
      style={orientation === "landscape" ? styles.pageLandscape : styles.pagePortrait}
    >
      {children}

      {/* Pie de página con paginación dinámica fija */}
      <View style={styles.footerContainer} fixed>
        <Text style={styles.footerLegal}>
          {legalNotice ||
            `${PDF_INSTITUTION.systemSignature} · RIF: ${PDF_INSTITUTION.rif}`}
        </Text>
        <Text
          style={styles.footerPagination}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
        />
      </View>
    </Page>
  );
}

export interface PdfHeaderProps {
  title: string;
  subtitle?: string;
  documentNumber: string;
  date?: string;
  status?: string;
  badge?: string;
}

export function PdfHeader({
  title,
  subtitle = "PROFORMA / DOCUMENTO OFICIAL",
  documentNumber,
  date,
  status,
  badge,
}: PdfHeaderProps) {
  const formattedDate =
    date ||
    new Date().toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <View style={styles.headerContainer}>
      <View style={styles.institutionCol}>
        <View style={styles.logoBox}>
          <Text style={styles.logoTextIAC}>IAC</Text>
          <Text style={styles.logoTextIDI}>IDI</Text>
        </View>
        <View style={styles.institutionInfo}>
          <Text style={styles.institutionName}>{PDF_INSTITUTION.name}</Text>
          <Text style={styles.institutionSub}>{PDF_INSTITUTION.fullName}</Text>
          <Text style={styles.institutionRif}>
            RIF: {PDF_INSTITUTION.rif} · {PDF_INSTITUTION.subName}
          </Text>
        </View>
      </View>

      <View style={styles.docMetaCol}>
        <Text style={styles.docTitle}>{title}</Text>
        <View style={styles.docSubtitlePill}>
          <Text style={styles.docSubtitleText}>{badge || subtitle}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>N° Documento:</Text>
          <Text style={styles.metaValue}>{documentNumber}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Fecha de Emisión:</Text>
          <Text style={styles.metaValue}>{formattedDate}</Text>
        </View>
        {status && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Estado:</Text>
            <Text style={styles.metaValue}>{status}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export interface InfoBarItem {
  label: string;
  value: string | number;
}

export function PdfInfoBar({ items }: { items: InfoBarItem[] }) {
  return (
    <View style={styles.infoBar}>
      {items.map((item, idx) => (
        <View key={idx} style={styles.infoBarItem}>
          <Text style={styles.infoBarLabel}>{item.label}:</Text>
          <Text style={styles.infoBarValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export interface PdfCardField {
  label: string;
  value: string | number;
}

export interface PdfInfoCardProps {
  title: string;
  badge?: string;
  fields: PdfCardField[];
  width?: string;
}

export function PdfInfoCard({
  title,
  badge,
  fields,
  width = "49%",
}: PdfInfoCardProps) {
  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {badge && <Text style={styles.cardBadge}>{badge}</Text>}
      </View>
      {fields.map((f, i) => (
        <Text key={i} style={styles.cardLine}>
          <Text style={styles.cardLabel}>{f.label}: </Text>
          {f.value || "---"}
        </Text>
      ))}
    </View>
  );
}

export function PdfCardGrid({
  children,
  style,
}: {
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style?: any;
}) {
  return (
    <View style={[styles.gridContainer, style]} wrap={false}>
      {children}
    </View>
  );
}

export interface SignatureItem {
  role: string;
  name?: string;
  department: string;
  stampText?: string;
}

export function PdfSignatures({
  signatures,
}: {
  signatures: SignatureItem[];
}) {
  const cardWidth =
    signatures.length === 2
      ? "48%"
      : signatures.length === 3
        ? "32%"
        : `${Math.floor(98 / signatures.length)}%`;

  return (
    <View style={styles.signaturesContainer} wrap={false}>
      {signatures.map((sig, idx) => (
        <View key={idx} style={[styles.signatureCard, { width: cardWidth }]}>
          <View style={styles.stampBox}>
            <Text style={styles.stampBoxText}>
              {sig.stampText || "Sello Húmedo"}
            </Text>
          </View>
          <View style={styles.sigLine} />
          <Text style={styles.sigRole}>{sig.role}</Text>
          {sig.name && <Text style={styles.sigName}>{sig.name}</Text>}
          <Text style={styles.sigDepartment}>{sig.department}</Text>
        </View>
      ))}
    </View>
  );
}

export function PdfNotice({
  title,
  text,
  variant = "default",
}: {
  title?: string;
  text: string;
  variant?: "default" | "warning" | "success" | "danger";
}) {
  let borderColor = PDF_COLORS.borderLight;
  let bgColor = PDF_COLORS.bgSubtle;
  let titleColor = PDF_COLORS.navyDark;

  if (variant === "warning") {
    borderColor = PDF_COLORS.amber;
    bgColor = PDF_COLORS.amberBg;
    titleColor = PDF_COLORS.amber;
  } else if (variant === "danger") {
    borderColor = PDF_COLORS.rose;
    bgColor = PDF_COLORS.roseBg;
    titleColor = PDF_COLORS.rose;
  } else if (variant === "success") {
    borderColor = PDF_COLORS.emerald;
    bgColor = PDF_COLORS.emeraldBg;
    titleColor = PDF_COLORS.emerald;
  }

  return (
    <View
      style={[
        styles.noticeBox,
        { borderColor, backgroundColor: bgColor },
      ]}
      wrap={false}
    >
      {title && (
        <Text style={[styles.noticeTitle, { color: titleColor }]}>
          {title}
        </Text>
      )}
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}
