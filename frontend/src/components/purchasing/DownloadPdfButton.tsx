"use client";

import React from "react";
import type { PurchaseOrder } from "@/types/purchasing";
import { PurchaseOrderPdfDocument } from "./PurchaseOrderPdfDocument";
import { UniversalPdfDownloadButton } from "@/components/pdf/UniversalPdfDownloadButton";

export interface DownloadPdfButtonProps {
  order: PurchaseOrder;
  effectiveBcvRate?: number;
  symbol?: string;
  currCode?: string;
  className?: string;
}

export function DownloadPdfButton({
  order,
  effectiveBcvRate,
  symbol,
  currCode,
  className = "",
}: DownloadPdfButtonProps) {
  const rawOrderNumber = order.orderNumber || String(order.id);
  const sanitizedOrderNumber = rawOrderNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Orden_Compra_${sanitizedOrderNumber}.pdf`;

  const pdfDoc = (
    <PurchaseOrderPdfDocument
      order={order}
      effectiveBcvRate={effectiveBcvRate}
      symbol={symbol}
      currCode={currCode}
    />
  );

  return (
    <UniversalPdfDownloadButton
      document={pdfDoc}
      fileName={fileName}
      buttonLabel="Descargar PDF"
      previewLabel="Vista Previa"
      dialogTitle={`Orden de Compra: ${order.orderNumber || `#${order.id}`}`}
      dialogSubtitle="Documento Oficial SENIAT · INMUNOLOGIA ASOCIACION CIVIL (RIF: J-30710739-1)"
      className={className}
    />
  );
}

export default DownloadPdfButton;
