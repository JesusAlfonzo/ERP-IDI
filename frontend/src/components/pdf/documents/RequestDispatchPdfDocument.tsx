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

export interface RequestDispatchItem {
  id?: string | number;
  quantityRequested?: string | number;
  requestedQuantity?: string | number;
  quantityDispatched?: string | number | null;
  dispatchedQuantity?: string | number | null;
  product?: {
    id?: string | number;
    name: string;
    sku?: string | null;
    unitOfMeasure?: string | null;
    baseUnit?: { abbreviation: string } | null;
  } | null;
  batch?: {
    lotNumber: string;
    expirationDate?: string | null;
  } | null;
}

export interface RequestDispatchData {
  id: string | number;
  requestNumber: string;
  departmentSection: string;
  justification: string;
  notes?: string | null;
  status: string;
  createdAt: string;
  dispatchedAt?: string | null;
  createdBy?: {
    fullName?: string | null;
    username?: string;
    email?: string;
  } | null;
  applicant?: {
    fullName?: string | null;
    username?: string;
  } | null;
  dispatchedBy?: {
    fullName?: string | null;
    username?: string;
  } | null;
  approvedBy?: {
    fullName?: string | null;
    username?: string;
  } | null;
  items?: RequestDispatchItem[];
}

export interface RequestDispatchPdfDocumentProps {
  request: RequestDispatchData;
}

export function RequestDispatchPdfDocument({
  request,
}: RequestDispatchPdfDocumentProps) {
  const items = request.items || [];
  const formattedDate = new Date(request.createdAt).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const dispatchDate = request.dispatchedAt
    ? new Date(request.dispatchedAt).toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : request.status === "COMPLETADA"
      ? formattedDate
      : "Pendiente por Despacho";

  const totalRequested = items.reduce(
    (acc, it) => acc + Number(it.quantityRequested ?? it.requestedQuantity ?? 0),
    0
  );
  const totalDispatched = items.reduce(
    (acc, it) => acc + Number(it.quantityDispatched ?? it.dispatchedQuantity ?? 0),
    0
  );

  const applicantName =
    request.applicant?.fullName ||
    request.createdBy?.fullName ||
    request.applicant?.username ||
    request.createdBy?.username ||
    "Personal Autorizado";

  const dispatcherName =
    request.dispatchedBy?.fullName ||
    request.approvedBy?.fullName ||
    (request.status === "COMPLETADA" || request.status === "DESPACHADA_PARCIAL"
      ? "Almacén Central"
      : "En Espera");

  return (
    <BasePdfDocument
      title={`Vale_Despacho_${request.requestNumber}`}
      subject="Vale de Solicitud y Despacho Interno de Materiales - ERP-IDI"
    >
      <PdfPage>
        {/* Cabecera */}
        <PdfHeader
          title="VALE DE REQUISICIÓN Y DESPACHO"
          subtitle="CONTROL INTERNO DE SUMINISTROS"
          documentNumber={request.requestNumber}
          date={formattedDate}
          status={(request.status || "DESPACHADA").replace(/_/g, " ")}
          badge="COMPROBANTE OFICIAL"
        />

        {/* Barra de Metadatos */}
        <PdfInfoBar
          items={[
            {
              label: "Área Solicitante",
              value: request.departmentSection,
            },
            {
              label: "Solicitante",
              value: applicantName,
            },
            {
              label: "Renglones",
              value: items.length,
            },
            {
              label: "Unidades (Sol / Desp)",
              value: `${totalRequested} / ${totalDispatched}`,
            },
          ]}
        />

        {/* Partes: Solicitud vs Despacho */}
        <PdfCardGrid>
          <PdfInfoCard
            title="Datos de la Requisición"
            badge="Emisión"
            fields={[
              {
                label: "Departamento / Servicio",
                value: request.departmentSection,
              },
              {
                label: "Responsable Solicitante",
                value: applicantName,
              },
              { label: "Fecha de Requisición", value: formattedDate },
              { label: "Justificación de Uso", value: request.justification },
            ]}
          />

          <PdfInfoCard
            title="Datos del Despacho Físico"
            badge="Almacén Central"
            fields={[
              {
                label: "Responsable de Despacho",
                value: dispatcherName,
              },
              { label: "Fecha de Entrega", value: dispatchDate },
              { label: "Estado Actual", value: (request.status || "DESPACHADA").replace(/_/g, " ") },
              {
                label: "Conformidad",
                value: "Sujeto a verificación de cantidades",
              },
            ]}
          />
        </PdfCardGrid>

        {/* Tabla de Renglones */}
        <PdfTable>
          <PdfTableHeader>
            <PdfTableHeaderCell width="18%">SKU</PdfTableHeaderCell>
            <PdfTableHeaderCell width="34%">
              Descripción del Insumo / Reactivo
            </PdfTableHeaderCell>
            <PdfTableHeaderCell width="16%">Lote Despachado</PdfTableHeaderCell>
            <PdfTableHeaderCell width="8%" align="center">
              Unidad
            </PdfTableHeaderCell>
            <PdfTableHeaderCell width="12%" align="right">
              Cant. Sol.
            </PdfTableHeaderCell>
            <PdfTableHeaderCell width="12%" align="right">
              Cant. Desp.
            </PdfTableHeaderCell>
          </PdfTableHeader>

          {items.map((it, idx) => {
            const product = it.product;
            const unit =
              product?.baseUnit?.abbreviation ||
              product?.unitOfMeasure ||
              "UND";
            const lot = it.batch?.lotNumber || "Asignación en almacén";
            const reqQty = Number(it.quantityRequested ?? it.requestedQuantity ?? 0);
            const dispQty = it.quantityDispatched ?? it.dispatchedQuantity;

            return (
              <PdfTableRow key={String(it.id || idx)} isAlt={idx % 2 === 1}>
                <PdfTableCell width="18%" fontSize={6.5} bold>
                  {product?.sku || "---"}
                </PdfTableCell>
                <PdfTableCell width="34%">
                  {product?.name || "Insumo sin especificar"}
                </PdfTableCell>
                <PdfTableCell width="16%" fontSize={6.5}>
                  {lot}
                </PdfTableCell>
                <PdfTableCell width="8%" align="center">
                  {unit}
                </PdfTableCell>
                <PdfTableCell width="12%" align="right">
                  {reqQty}
                </PdfTableCell>
                <PdfTableCell width="12%" align="right" bold>
                  {dispQty != null ? Number(dispQty) : "---"}
                </PdfTableCell>
              </PdfTableRow>
            );
          })}
        </PdfTable>

        {/* Observaciones */}
        {request.notes && (
          <PdfNotice
            title="Notas del Despacho:"
            text={request.notes}
          />
        )}

        {/* Firmas Institucionales */}
        <PdfSignatures
          signatures={[
            {
              role: "Solicitado por",
              name: applicantName,
              department: request.departmentSection,
              stampText: "Firma Solicitante",
            },
            {
              role: "Despachado por (Almacén)",
              name: dispatcherName !== "En Espera" ? dispatcherName : undefined,
              department: "Unidad de Almacén y Suministros",
              stampText: "Firma / Sello Almacén",
            },
            {
              role: "Recibido Conforme",
              department: request.departmentSection,
              stampText: "Firma y Cédula Receptor",
            },
          ]}
        />
      </PdfPage>
    </BasePdfDocument>
  );
}

export default RequestDispatchPdfDocument;
