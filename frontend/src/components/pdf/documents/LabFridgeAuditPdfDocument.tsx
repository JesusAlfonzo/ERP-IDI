"use client";

import React from "react";
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
import { PDF_COLORS } from "../theme";

export interface LabFridgeVialItem {
  id: string | number;
  unitCode?: string | null;
  serialNumber?: string | null;
  lotNumber?: string | null;
  expirationDate?: string | null;
  status: string;
  currentVolume: number | string;
  initialVolume: number | string;
  product?: {
    name: string;
    sku?: string | null;
  } | null;
}

export interface LabFridgeAuditData {
  fridgeId: string | number;
  fridgeName: string;
  fridgeCode?: string | null;
  location?: string | null;
  targetTemperature?: number | string | null;
  currentTemperature?: number | string | null;
  isAlarmActive?: boolean;
  auditDate?: string;
  auditorName?: string;
  notes?: string | null;
  units: LabFridgeVialItem[];
}

export interface LabFridgeAuditPdfDocumentProps {
  auditData: LabFridgeAuditData;
}

export function LabFridgeAuditPdfDocument({
  auditData,
}: LabFridgeAuditPdfDocumentProps) {
  const formattedDate =
    auditData.auditDate ||
    new Date().toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const tempStatus = auditData.isAlarmActive
    ? "ALERTA TÉRMICA ACTIVA"
    : "RANGO TÉRMICO NORMAL";

  const totalVials = auditData.units.length;
  const inUseCount = auditData.units.filter((u) => u.status === "EN_USO").length;
  const sealedCount = auditData.units.filter((u) => u.status === "SELLADO").length;
  const expiredCount = auditData.units.filter(
    (u) =>
      u.status === "VENCIDO" || (u.expirationDate && new Date(u.expirationDate) < new Date())
  ).length;

  return (
    <BasePdfDocument
      title={`Acta_Arqueo_Nevera_${auditData.fridgeCode || auditData.fridgeId}`}
      subject="Acta de Arqueo Físico y Conciliación de Cadena de Frío - ERP-IDI"
    >
      <PdfPage>
        {/* Cabecera */}
        <PdfHeader
          title="ACTA DE ARQUEO FÍSICO Y CADENA DE FRÍO"
          subtitle="CONCILIACIÓN DE EQUIPOS DE REFRIGERACIÓN Y VIALES"
          documentNumber={`ARQ-${auditData.fridgeCode || auditData.fridgeId}`}
          date={formattedDate}
          status={tempStatus}
          badge="CADENA DE FRÍO"
        />

        {/* Metadatos */}
        <PdfInfoBar
          items={[
            { label: "Equipo de Frío", value: auditData.fridgeName },
            {
              label: "Temperatura Actual",
              value: auditData.currentTemperature != null ? `${auditData.currentTemperature} °C` : "---",
            },
            {
              label: "Auditor / Responsable",
              value: auditData.auditorName || "Coordinación de Laboratorio",
            },
            {
              label: "Total Viales Alojados",
              value: totalVials,
            },
          ]}
        />

        {/* Datos del Equipo y Resumen de Estado */}
        <PdfCardGrid>
          <PdfInfoCard
            title="Especificaciones del Equipo"
            badge="Refrigeración"
            fields={[
              { label: "Nombre / Etiqueta", value: auditData.fridgeName },
              { label: "Código Interno", value: auditData.fridgeCode || "N/A" },
              {
                label: "Ubicación en Sede",
                value: auditData.location || "Laboratorio Clínico Central",
              },
              {
                label: "Rango Óptimo",
                value: auditData.targetTemperature ? `${auditData.targetTemperature} °C (±2°C)` : "2°C a 8°C",
              },
            ]}
          />

          <PdfInfoCard
            title="Resumen Físico de Viales"
            badge="Inventario"
            fields={[
              { label: "Frascos Sellados (Stock)", value: sealedCount },
              { label: "Frascos En Uso (Mesón)", value: inUseCount },
              {
                label: "Vencidos / No Aptos",
                value: expiredCount > 0 ? `${expiredCount} (Bloqueados)` : "0 (Todos vigentes)",
              },
              { label: "Fecha de Conciliación", value: formattedDate },
            ]}
          />
        </PdfCardGrid>

        {/* Alerta de temperatura si aplica */}
        {auditData.isAlarmActive && (
          <PdfNotice
            title="ALERTA DE DESVIACIÓN TÉRMICA:"
            text="Este equipo ha registrado excursiones de temperatura fuera del rango seguro de 2°C a 8°C. Verifique la estabilidad de los reactivos y proceda a cuarentena preventiva si corresponde."
            variant="warning"
          />
        )}

        {/* Tabla de Viales Alojados en el Equipo */}
        <PdfTable>
          <PdfTableHeader>
            <PdfTableHeaderCell width="32%">Reactivo / Insumo</PdfTableHeaderCell>
            <PdfTableHeaderCell width="18%">Serial / Lote</PdfTableHeaderCell>
            <PdfTableHeaderCell width="16%">Fecha Venc.</PdfTableHeaderCell>
            <PdfTableHeaderCell width="16%" align="center">Estado</PdfTableHeaderCell>
            <PdfTableHeaderCell width="18%" align="right">Volumen Restante</PdfTableHeaderCell>
          </PdfTableHeader>

          {auditData.units.map((u, idx) => {
            const isExp = u.expirationDate ? new Date(u.expirationDate) < new Date() : false;
            const expFormatted = u.expirationDate
              ? new Date(u.expirationDate).toLocaleDateString("es-VE")
              : "---";

            return (
              <PdfTableRow key={String(u.id || idx)} isAlt={idx % 2 === 1}>
                <PdfTableCell width="32%" bold>
                  {u.product?.name || "Reactivo"}
                </PdfTableCell>
                <PdfTableCell width="18%" fontSize={6.5}>
                  {u.unitCode || u.serialNumber || "S/N"} · {u.lotNumber || "S/L"}
                </PdfTableCell>
                <PdfTableCell
                  width="16%"
                  color={isExp ? PDF_COLORS.rose : undefined}
                  bold={isExp}
                >
                  {expFormatted}
                </PdfTableCell>
                <PdfTableCell width="16%" align="center" fontSize={6.5}>
                  {u.status}
                </PdfTableCell>
                <PdfTableCell width="18%" align="right">
                  {u.currentVolume} / {u.initialVolume} det.
                </PdfTableCell>
              </PdfTableRow>
            );
          })}
        </PdfTable>

        {/* Observaciones */}
        {auditData.notes && (
          <PdfNotice
            title="Observaciones del Arqueo:"
            text={auditData.notes}
          />
        )}

        {/* Firmas de Control */}
        <PdfSignatures
          signatures={[
            {
              role: "Responsable del Arqueo",
              name: auditData.auditorName || undefined,
              department: "Coordinación de Laboratorio",
              stampText: "Firma / Sello Auditor",
            },
            {
              role: "Custodio de la Nevera",
              department: "Personal de Guardia",
              stampText: "Firma Custodio",
            },
            {
              role: "Control de Calidad y Frío",
              department: "Comité de Bioseguridad y Frío",
              stampText: "Firma / Sello Calidad",
            },
          ]}
        />
      </PdfPage>
    </BasePdfDocument>
  );
}

export default LabFridgeAuditPdfDocument;
