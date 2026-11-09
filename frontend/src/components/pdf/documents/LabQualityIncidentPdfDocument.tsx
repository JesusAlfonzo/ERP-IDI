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

export interface QualityAffectedItem {
  id: string | number;
  productName: string;
  sku?: string | null;
  lotNumber: string;
  serialNumber?: string | null;
  volumeOrUnits: string | number;
  reason?: string | null;
}

export interface LabQualityIncidentData {
  incidentId: string | number;
  incidentType?: string | null;
  date?: string | null;
  equipmentName?: string | null;
  reportedBy?: string | null;
  observedTemperature?: number | string | null;
  durationHours?: number | string | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  disposition?: string | null;
  status?: string | null;
  items?: QualityAffectedItem[];
}

export interface LabQualityIncidentPdfDocumentProps {
  incident: LabQualityIncidentData;
}

export function LabQualityIncidentPdfDocument({
  incident,
}: LabQualityIncidentPdfDocumentProps) {
  const formattedDate = incident.date
    ? new Date(incident.date).toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleDateString("es-VE");

  const docNumber = `INC-${incident.incidentId || "GEN"}`;
  const incidentTypeStr = (incident.incidentType || "INCIDENCIA TÉCNICA").replace(/_/g, " ");
  const itemsList = incident.items || [];

  return (
    <BasePdfDocument
      title={`Acta_Incidencia_${docNumber}`}
      subject="Acta de Incidencia de Calidad y Bloqueo en Cuarentena - ERP-IDI"
    >
      <PdfPage>
        {/* Cabecera */}
        <PdfHeader
          title="ACTA DE INCIDENCIA Y CUARENTENA"
          subtitle="CONTROL DE CALIDAD ANALÍTICA Y BIOSEGURIDAD"
          documentNumber={docNumber}
          date={formattedDate}
          status={incident.status || "REGISTRADA"}
          badge="AUDITORÍA CALIDAD"
        />

        {/* Metadatos */}
        <PdfInfoBar
          items={[
            { label: "Tipo de Incidencia", value: incidentTypeStr },
            {
              label: "Equipo / Ubicación",
              value: incident.equipmentName || "Laboratorio Clínico",
            },
            {
              label: "Reportado por",
              value: incident.reportedBy || "Personal de Laboratorio",
            },
            { label: "Viales Retenidos", value: itemsList.length },
          ]}
        />

        {/* Causa Raíz y Disposición Final */}
        <PdfCardGrid>
          <PdfInfoCard
            title="Detalle de la Desviación"
            badge="Hallazgo"
            fields={[
              {
                label: "Equipo Involucrado",
                value: incident.equipmentName || "Nevera / Analizador",
              },
              {
                label: "Temperatura Registrada",
                value:
                  incident.observedTemperature != null
                    ? `${incident.observedTemperature} °C`
                    : "No aplica",
              },
              {
                label: "Duración Estimada",
                value:
                  incident.durationHours != null
                    ? `${incident.durationHours} horas`
                    : "Puntual",
              },
              {
                label: "Causa Identificada",
                value: incident.rootCause || "Falla eléctrica / Desviación térmica",
              },
            ]}
          />

          <PdfInfoCard
            title="Resolución y Disposición"
            badge="Acción Correctiva"
            fields={[
              {
                label: "Acción Correctiva Inmediata",
                value:
                  incident.correctiveAction ||
                  "Aislamiento preventivo en cuarentena interna",
              },
              {
                label: "Dictamen Técnico",
                value: incident.disposition || "EN EVALUACIÓN POR COORDINACIÓN",
              },
              { label: "Estado del Acta", value: incident.status || "REGISTRADA" },
            ]}
          />
        </PdfCardGrid>

        {/* Alerta de Cuarentena */}
        <PdfNotice
          title="PROTOCOLO DE RETENCIÓN DE REACTIVOS:"
          text="Los lotes y unidades listados a continuación quedan formalmente inhabilitados para su uso en pacientes hasta tanto se emita el informe de estabilidad o la orden de descarte definitivo."
          variant="danger"
        />

        {/* Tabla de Viales Retenidos */}
        <PdfTable>
          <PdfTableHeader>
            <PdfTableHeaderCell width="34%">Reactivo / Insumo Afectado</PdfTableHeaderCell>
            <PdfTableHeaderCell width="18%">Serial / Lote</PdfTableHeaderCell>
            <PdfTableHeaderCell width="16%" align="right">Volumen Retenido</PdfTableHeaderCell>
            <PdfTableHeaderCell width="32%">Motivo Específico de Retención</PdfTableHeaderCell>
          </PdfTableHeader>

          {(incident.items || []).map((it, idx) => (
            <PdfTableRow key={String(it.id || idx)} isAlt={idx % 2 === 1}>
              <PdfTableCell width="34%" bold>
                {it.productName}
              </PdfTableCell>
              <PdfTableCell width="18%" fontSize={6.5}>
                {it.serialNumber || "S/N"} · {it.lotNumber}
              </PdfTableCell>
              <PdfTableCell width="16%" align="right">
                {it.volumeOrUnits}
              </PdfTableCell>
              <PdfTableCell width="32%" color={PDF_COLORS.rose}>
                {it.reason || "Sospecha de alteración térmica"}
              </PdfTableCell>
            </PdfTableRow>
          ))}
        </PdfTable>

        {/* Firmas de Comité de Calidad */}
        <PdfSignatures
          signatures={[
            {
              role: "Reportado por",
              name: incident.reportedBy || undefined,
              department: "Personal de Laboratorio",
              stampText: "Firma Reportante",
            },
            {
              role: "Coordinación de Calidad",
              department: "Garantía de Calidad IDI",
              stampText: "Firma / Sello Calidad",
            },
            {
              role: "Dirección Técnica",
              department: "Instituto de Inmunología Clínica",
              stampText: "Firma / Sello Dirección",
            },
          ]}
        />
      </PdfPage>
    </BasePdfDocument>
  );
}

export default LabQualityIncidentPdfDocument;
