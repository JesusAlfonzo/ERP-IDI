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
import type { PurchaseRequisition } from "@/types/purchasing";

export interface RequisitionPdfDocumentProps {
  requisition: PurchaseRequisition;
}

export function RequisitionPdfDocument({
  requisition,
}: RequisitionPdfDocumentProps) {
  const formattedDate = new Date(requisition.createdAt).toLocaleDateString(
    "es-VE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );

  const totalQuantity = requisition.items.reduce(
    (acc, it) => acc + Number(it.quantityRequested || 0),
    0
  );

  return (
    <BasePdfDocument
      title={`Preorden_Compra_${requisition.requisitionNumber}`}
      subject="Requisición y Solicitud de Cotización - ERP-IDI"
    >
      <PdfPage>
        {/* Cabecera */}
        <PdfHeader
          title="PREORDEN DE COMPRA"
          subtitle="SOLICITUD DE COTIZACIÓN Y PROCURA"
          documentNumber={requisition.requisitionNumber}
          date={formattedDate}
          status={(requisition.status || "BORRADOR").replace(/_/g, " ")}
          badge="REQUISICIÓN INTERNA"
        />

        {/* Metadatos */}
        <PdfInfoBar
          items={[
            {
              label: "Área Solicitante",
              value: requisition.departmentSection || "Unidad IDI",
            },
            {
              label: "Responsable",
              value: requisition.createdBy?.fullName || "Personal Autorizado",
            },
            {
              label: "Renglones Solicitados",
              value: requisition.items.length,
            },
            {
              label: "Total Unidades",
              value: totalQuantity,
            },
          ]}
        />

        {/* Justificación y Datos */}
        <PdfCardGrid>
          <PdfInfoCard
            title="Detalles de la Requisición"
            badge="Justificación"
            fields={[
              {
                label: "Área Solicitante",
                value: requisition.departmentSection || "Unidad General",
              },
              {
                label: "Justificación de Compra",
                value: requisition.justification || "Adquisición de insumos operativos",
              },
              { label: "Fecha de Emisión", value: formattedDate },
            ]}
          />

          <PdfInfoCard
            title="Instrucciones al Proveedor"
            badge="Cotización"
            fields={[
              {
                label: "Condición de Oferta",
                value: "Indicar precios unitarios e impuestos (IVA 16% o exento)",
              },
              {
                label: "Tasa de Referencia",
                value: "Moneda de cotización ($ o €) con tasa oficial BCV",
              },
              {
                label: "Validez de la Oferta",
                value: "Mínimo 15 días hábiles a partir de la recepción",
              },
            ]}
          />
        </PdfCardGrid>

        {/* Tabla de Renglones Requeridos */}
        <PdfTable>
          <PdfTableHeader>
            <PdfTableHeaderCell width="18%">SKU</PdfTableHeaderCell>
            <PdfTableHeaderCell width="42%">
              Descripción del Insumo / Producto Solicitado
            </PdfTableHeaderCell>
            <PdfTableHeaderCell width="12%" align="center">
              Unidad Solicitada
            </PdfTableHeaderCell>
            <PdfTableHeaderCell width="14%" align="right">
              Cantidad
            </PdfTableHeaderCell>
            <PdfTableHeaderCell width="14%" align="right">
              P. Estimado ($)
            </PdfTableHeaderCell>
          </PdfTableHeader>

          {requisition.items.map((it, idx) => {
            const product = it.product;
            const unit =
              it.unit?.abbreviation ||
              product?.purchaseUnit?.abbreviation ||
              product?.baseUnit?.abbreviation ||
              "UND";
            const estPrice = Number(it.estimatedPrice || 0);

            return (
              <PdfTableRow key={String(it.id || idx)} isAlt={idx % 2 === 1}>
                <PdfTableCell width="18%" fontSize={6.5} bold>
                  {product?.sku || "---"}
                </PdfTableCell>
                <PdfTableCell width="42%">
                  {product?.name || "Insumo sin especificar"}
                </PdfTableCell>
                <PdfTableCell width="12%" align="center">
                  {unit}
                </PdfTableCell>
                <PdfTableCell width="14%" align="right" bold>
                  {Number(it.quantityRequested)}
                </PdfTableCell>
                <PdfTableCell width="14%" align="right">
                  {estPrice > 0 ? `$ ${estPrice.toFixed(2)}` : "A cotizar"}
                </PdfTableCell>
              </PdfTableRow>
            );
          })}
        </PdfTable>

        {/* Observaciones */}
        {requisition.notes && (
          <PdfNotice
            title="Observaciones de la Solicitud:"
            text={requisition.notes}
          />
        )}

        {/* Firmas de Autorización de Preorden */}
        <PdfSignatures
          signatures={[
            {
              role: "Solicitado por",
              name: requisition.createdBy?.fullName || undefined,
              department: requisition.departmentSection || "Unidad Solicitante",
              stampText: "Firma Solicitante",
            },
            {
              role: "Revisado por (Compras)",
              department: "Unidad de Procura y Gestión de Proveedores",
              stampText: "Firma / Sello Compras",
            },
            {
              role: "Aprobado para Cotización",
              department: "Dirección de Administración",
              stampText: "Firma / Sello Aprobación",
            },
          ]}
        />
      </PdfPage>
    </BasePdfDocument>
  );
}

export default RequisitionPdfDocument;
