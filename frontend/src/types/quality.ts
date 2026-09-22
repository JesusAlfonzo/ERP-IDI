export type IncidentType =
  | "ROTURA_EMPAQUE"
  | "TEMPERATURA_FUERA_RANGO"
  | "CONTAMINACION"
  | "FALLA_CONTROL_CALIDAD"
  | "OTRO";

export type QualityVerdict = "LIBERAR" | "RECHAZAR";

export interface QuarantineBatch {
  id: number;
  lotNumber: string;
  currentQuantity: number;
  costPrice?: number;
  expirationDate: string | null;
  status: "EN_CUARENTENA" | "DEFECTUOSO" | "DISPONIBLE" | "AGOTADO" | "VENCIDO";
  createdAt: string;
  location?: {
    id: number;
    name: string;
  } | null;
  product: {
    id: number;
    sku: string;
    name: string;
    unitOfMeasure: string;
    baseUnit?: {
      abbreviation: string;
    };
    category?: {
      name: string;
    } | null;
  };
}

export interface QualityInspectionPayload {
  batchId: number;
  verdict: QualityVerdict;
  technicalNotes: string;
  incidentType?: IncidentType;
}

export interface QualityInspectionResponse {
  batchId: number;
  newStatus: "DISPONIBLE" | "DEFECTUOSO";
  message: string;
}
