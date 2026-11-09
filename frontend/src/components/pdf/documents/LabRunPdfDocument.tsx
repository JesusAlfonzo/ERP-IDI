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
import type { LabWeeklyRun } from "@/types/lab-workflow";

const styles = StyleSheet.create({
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  kpiCard: {
    width: "24%",
    borderWidth: 0.8,
    borderColor: PDF_COLORS.borderLight,
    borderStyle: "solid",
    borderRadius: 3,
    backgroundColor: PDF_COLORS.bgSubtle,
    padding: 5,
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 5.8,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.textMuted,
    textTransform: "uppercase",
    textAlign: "center",
  },
  kpiValue: {
    fontSize: 11,
    fontFamily: PDF_FONTS.bold,
    color: PDF_COLORS.navyDark,
    marginTop: 1.5,
  },
  kpiSub: {
    fontSize: 5.5,
    color: PDF_COLORS.textSecondary,
    marginTop: 0.5,
  },
});

export interface LabRunPdfDocumentProps {
  run: LabWeeklyRun;
}

export function LabRunPdfDocument({ run }: LabRunPdfDocumentProps) {
  const formattedStart = run.weekStartDate
    ? new Date(run.weekStartDate).toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "---";

  const formattedEnd = run.weekEndDate
    ? new Date(run.weekEndDate).toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "En Curso";

  // Cálculos de corrida
  const totalPatients = Number(run.totalValidPatientExams || 0);

  const consumptions = run.consumptions || [];

  const totalRepeats = consumptions.reduce(
    (acc, c) => acc + (c.repeatUses || 0),
    0
  );

  const totalCalibrations = consumptions.reduce(
    (acc, c) => acc + (c.calibratorUses || 0),
    0
  );

  const totalControls = consumptions.reduce(
    (acc, c) => acc + (c.controlUses || 0),
    0
  );

  const totalWaste = consumptions.reduce(
    (acc, c) => acc + (c.wasteUses || 0),
    0
  );

  const totalRunCostNum = Number(run.totalRunCost || 0);
  const effectiveCostPerExamNum = Number(run.effectiveCostPerExam || 0);

  return (
    <BasePdfDocument
      title={`Corrida_Analitica_${run.code}`}
      subject="Reporte de Corrida Semanal y Costo Efectivo por Paciente - ERP-IDI"
    >
      <PdfPage>
        {/* Cabecera */}
        <PdfHeader
          title="REPORTE DE CORRIDA SEMANAL"
          subtitle="LABORATORIO CLÍNICO Y RENDIMIENTO ANALÍTICO"
          documentNumber={run.code}
          date={formattedEnd}
          status={run.status}
          badge="CORRIDA 5D"
        />

        {/* Metadatos */}
        <PdfInfoBar
          items={[
            { label: "Área de Laboratorio", value: run.labArea?.name || "Bioanálisis" },
            {
              label: "Bioanalista Responsable",
              value: run.bioanalyst?.fullName || "Bioanalista",
            },
            { label: "Semana Del", value: formattedStart },
            { label: "Al", value: formattedEnd },
          ]}
        />

        {/* Indicadores Clave de Desempeño (4 KPIs) */}
        <View style={styles.kpiRow} wrap={false}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Pacientes Atendidos</Text>
            <Text style={styles.kpiValue}>{totalPatients}</Text>
            <Text style={styles.kpiSub}>Resultados válidos</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Calibraciones y QC</Text>
            <Text style={styles.kpiValue}>
              {totalCalibrations + totalControls}
            </Text>
            <Text style={styles.kpiSub}>
              {totalCalibrations} Cal · {totalControls} QC
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Repeticiones / Merma</Text>
            <Text style={[styles.kpiValue, { color: PDF_COLORS.amber }]}>
              {totalRepeats + totalWaste}
            </Text>
            <Text style={styles.kpiSub}>
              {totalRepeats} Rep · {totalWaste} Merma
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Costo Efectivo / Paciente</Text>
            <Text style={[styles.kpiValue, { color: PDF_COLORS.emerald }]}>
              $ {effectiveCostPerExamNum.toFixed(2)}
            </Text>
            <Text style={styles.kpiSub}>USD por determinación</Text>
          </View>
        </View>

        {/* Detalles de Exámenes Procesados */}
        <PdfCardGrid>
          <PdfInfoCard
            title="Parámetros del Ensayo"
            badge="Catálogo"
            fields={[
              { label: "Examen / Prueba", value: run.labExam?.name || "Examen Analítico" },
              { label: "Código de Examen", value: run.labExam?.code || "N/A" },
              { label: "Área Analítica", value: run.labArea?.name || "Laboratorio" },
              { label: "Estado de Corrida", value: run.status },
            ]}
          />

          <PdfInfoCard
            title="Liquidación y Costo Analítico"
            badge="Auditoría 5D"
            fields={[
              {
                label: "Frascos Consumidos",
                value: consumptions.length,
              },
              {
                label: "Costo Total Corrida",
                value: `$ ${totalRunCostNum.toFixed(2)} USD`,
              },
              {
                label: "Costo Efectivo Unitario",
                value: `$ ${effectiveCostPerExamNum.toFixed(2)} USD / paciente`,
              },
              {
                label: "Trazabilidad 5D",
                value: "Pacientes · Calibrador · Controles · Repetición · Merma",
              },
            ]}
          />
        </PdfCardGrid>

        {/* Tabla de Consumo por Frasco / Reactivo */}
        <PdfTable>
          <PdfTableHeader>
            <PdfTableHeaderCell width="28%">Reactivo Utilizado</PdfTableHeaderCell>
            <PdfTableHeaderCell width="16%">Código / Lote</PdfTableHeaderCell>
            <PdfTableHeaderCell width="12%" align="right">Pacientes</PdfTableHeaderCell>
            <PdfTableHeaderCell width="12%" align="right">Cal / QC</PdfTableHeaderCell>
            <PdfTableHeaderCell width="12%" align="right">Rep / Merma</PdfTableHeaderCell>
            <PdfTableHeaderCell width="20%" align="right">Costo Total ($)</PdfTableHeaderCell>
          </PdfTableHeader>

          {consumptions.map((c, idx) => {
            const prodName =
              c.labReagentUnit?.product?.name || "Reactivo Analítico";
            const unitCode = c.labReagentUnit?.unitCode || "S/C";
            const lot = c.labReagentUnit?.batch?.lotNumber || "S/L";
            const pacUses = c.patientUses || 0;
            const calQcUses = (c.calibratorUses || 0) + (c.controlUses || 0);
            const repWasteUses = (c.repeatUses || 0) + (c.wasteUses || 0);
            const lineCost = Number(c.totalConsumptionCost || 0);

            return (
              <PdfTableRow key={String(c.id || idx)} isAlt={idx % 2 === 1}>
                <PdfTableCell width="28%" bold>
                  {prodName}
                </PdfTableCell>
                <PdfTableCell width="16%" fontSize={6.5}>
                  {unitCode} · {lot}
                </PdfTableCell>
                <PdfTableCell width="12%" align="right">
                  {pacUses}
                </PdfTableCell>
                <PdfTableCell width="12%" align="right">
                  {calQcUses}
                </PdfTableCell>
                <PdfTableCell width="12%" align="right">
                  {repWasteUses}
                </PdfTableCell>
                <PdfTableCell width="20%" align="right" bold color={PDF_COLORS.emerald}>
                  $ {lineCost.toFixed(2)}
                </PdfTableCell>
              </PdfTableRow>
            );
          })}
        </PdfTable>

        {/* Observaciones */}
        {run.notes && (
          <PdfNotice
            title="Observaciones de la Corrida:"
            text={run.notes}
          />
        )}

        {/* Firmas de Bioanálisis */}
        <PdfSignatures
          signatures={[
            {
              role: "Bioanalista Ejecutor",
              name: run.bioanalyst?.fullName || undefined,
              department: run.labArea?.name || "Laboratorio Clínico",
              stampText: "Firma / Sello Bioanalista",
            },
            {
              role: "Coordinación de Calidad",
              department: "Control de Calidad Analítica",
              stampText: "Firma / Sello Calidad",
            },
            {
              role: "Dirección de Laboratorio",
              department: "Instituto de Inmunología Clínica",
              stampText: "Firma / Sello Dirección",
            },
          ]}
        />
      </PdfPage>
    </BasePdfDocument>
  );
}

export default LabRunPdfDocument;
