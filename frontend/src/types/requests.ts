export type RequestPriority = "BAJA" | "RUTINA" | "URGENTE";
export type RequestStatus =
  | "PENDIENTE"
  | "APROBADA"
  | "DESPACHADA"
  | "RECHAZADA";

export interface InternalRequestItem {
  id?: number;
  productId: number;
  requestedQuantity: number;
  dispatchedQuantity?: number;
  batchId?: number | null;
  product?: {
    id: number;
    name: string;
    sku: string;
    unitOfMeasure: string;
  };
  batch?: {
    lotNumber: string;
    currentQuantity: number;
  } | null;
}

export interface InternalRequest {
  id: number;
  requestNumber: string;
  status: RequestStatus;
  priority: RequestPriority;
  departmentSection: string;
  justification: string;
  createdAt: string;
  applicant: {
    id: number;
    fullName: string;
    username: string;
  };
  approvedBy?: {
    fullName: string;
    username: string;
  } | null;
  items: InternalRequestItem[];
}

export interface CreateInternalRequestPayload {
  priority: RequestPriority;
  departmentSection: string;
  justification: string;
  items: {
    productId: number;
    requestedQuantity: number;
  }[];
}

export interface DispatchRequestItemPayload {
  itemId: number;
  batchId: number;
  dispatchedQuantity: number;
}

export interface DispatchRequestPayload {
  requestId: number;
  items: DispatchRequestItemPayload[];
  dispatchNotes?: string;
}
