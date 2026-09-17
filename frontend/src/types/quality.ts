export interface QuarantineBatch {
  id: number;
  lotNumber: string;
  currentQuantity: number;
  costPrice: number;
  expirationDate: string | null;
  status: "EN_CUARENTENA";
  createdAt: string;
  product: {
    id: number;
    sku: string;
    name: string;
    unitOfMeasure: string;
    category?: {
      name: string;
    };
  };
}

export type QualityVerdict = "LIBERAR" | "RECHAZAR";

export interface QualityInspectionPayload {
  batchId: number;
  verdict: QualityVerdict;
  technicalNotes: string;
}

export interface QualityInspectionResponse {
  batchId: number;
  newStatus: "DISPONIBLE" | "DEFECTUOSO";
  message: string;
}
