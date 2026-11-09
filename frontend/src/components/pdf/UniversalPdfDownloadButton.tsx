"use client";

import React, { useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Download,
  Eye,
  Loader2,
  FileCheck,
  Printer,
} from "lucide-react";

// Importación dinámica segura para Next.js App Router (SSR: false)
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="gap-1.5 shadow-2xs cursor-not-allowed"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
        <span>Cargando PDF...</span>
      </Button>
    ),
  }
);

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-3 bg-muted/20 rounded-lg border border-border">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs text-muted-foreground font-medium">
          Renderizando vista previa vectorial del documento...
        </p>
      </div>
    ),
  }
);

export interface UniversalPdfDownloadButtonProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: React.ReactElement<any>;
  fileName: string;
  buttonLabel?: string;
  previewLabel?: string;
  showPreview?: boolean;
  dialogTitle?: string;
  dialogSubtitle?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
}

export function UniversalPdfDownloadButton({
  document,
  fileName,
  buttonLabel = "Descargar PDF",
  previewLabel = "Vista Previa",
  showPreview = true,
  dialogTitle,
  dialogSubtitle = "Documento Oficial SENIAT / ERP-IDI · Instituto de Inmunología Clínica (RIF: J-30710739-1)",
  size = "sm",
  variant = "outline",
  className = "",
}: UniversalPdfDownloadButtonProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const cleanFileName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;

  if (!mounted) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        {showPreview && (
          <Button
            type="button"
            variant="outline"
            size={size}
            disabled
            className="gap-1.5 shadow-2xs cursor-not-allowed"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>{previewLabel}</span>
          </Button>
        )}
        <Button
          type="button"
          variant={variant}
          size={size}
          disabled
          className="gap-1.5 shadow-2xs cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>{buttonLabel}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Botón de Vista Previa Modal */}
      {showPreview && (
        <Button
          type="button"
          variant="outline"
          size={size}
          onClick={() => setShowPreviewModal(true)}
          className="gap-1.5 shadow-2xs cursor-pointer border-slate-300 hover:bg-slate-50 dark:border-slate-700"
          title="Visualizar documento en pantalla antes de descargar"
        >
          <Eye className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
          <span>{previewLabel}</span>
        </Button>
      )}

      {/* Botón de Descarga Nativa Vectorial */}
      {document ? (
        <PDFDownloadLink document={document} fileName={cleanFileName}>
          {({ loading, error }) => {
            if (loading) {
              return (
                <Button
                  type="button"
                  variant={variant}
                  size={size}
                  disabled
                  className="gap-1.5 shadow-2xs cursor-not-allowed bg-blue-50/50 text-blue-700 border-blue-200"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Generando PDF...</span>
                </Button>
              );
            }

            if (error) {
              console.error("Error al generar PDF vectorial:", error);
              return (
                <Button
                  type="button"
                  variant="outline"
                  size={size}
                  className="gap-1.5 shadow-2xs text-rose-600 border-rose-300"
                  onClick={() => window.print()}
                  title="Error en PDF nativo, clic para imprimir con navegador"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </Button>
              );
            }

            return (
              <Button
                type="button"
                variant={variant}
                size={size}
                className="gap-1.5 shadow-2xs cursor-pointer bg-blue-50/70 hover:bg-blue-100/80 text-blue-900 border-blue-300 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-800"
                title={`Descargar ${cleanFileName}`}
              >
                <Download className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>{buttonLabel}</span>
              </Button>
            );
          }}
        </PDFDownloadLink>
      ) : (
        <Button
          type="button"
          variant={variant}
          size={size}
          disabled
          className="gap-1.5 shadow-2xs cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>{buttonLabel}</span>
        </Button>
      )}

      {/* Modal de Vista Previa con PDFViewer */}
      {showPreview && (
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="max-w-5xl! w-[95vw]! h-[92vh]! p-4 flex flex-col gap-3">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 pr-6">
              <div className="space-y-0.5">
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  {dialogTitle || `Vista Previa: ${cleanFileName}`}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {dialogSubtitle}
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                <PDFDownloadLink document={document} fileName={cleanFileName}>
                  {({ loading }) => (
                    <Button
                      type="button"
                      size="sm"
                      disabled={loading}
                      className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                    >
                      {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>{loading ? "Preparando..." : "Descargar Archivo"}</span>
                    </Button>
                  )}
                </PDFDownloadLink>
              </div>
            </DialogHeader>

            {/* Visor interactivo del documento vectorial */}
            <div className="flex-1 w-full h-full min-h-0 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-800">
              {showPreviewModal && (
                <PDFViewer
                  className="w-full h-full border-none"
                  showToolbar={true}
                >
                  {document}
                </PDFViewer>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default UniversalPdfDownloadButton;
