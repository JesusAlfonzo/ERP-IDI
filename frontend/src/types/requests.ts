export type RequestPriority = "BAJA" | "RUTINA" | "URGENTE";
export type RequestStatus =
  | "PENDIENTE"
  | "APROBADA"
  | "DESPACHADA_PARCIAL"
  | "COMPLETADA"
  | "RECHAZADA";

export interface InternalRequestItem {
  id?: number;
  productId: number;
  requestedQuantity: number;
  quantityRequested?: number;
  quantityApproved?: number;
  quantityDispatched?: number;
  dispatchedQuantity?: number;
  batchId?: number | null;
  product?: {
    id: number;
    name: string;
    sku: string;
    unitOfMeasure?: string;
    baseUnit?: {
      id?: number;
      name?: string;
      abbreviation: string;
    };
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
  weeklyTokenCycle?: string;
  createdAt: string;
  applicant: {
    id: number;
    fullName: string;
    username: string;
    department?: string;
  };
  approvedBy?: {
    id?: number;
    fullName: string;
    username: string;
  } | null;
  items: InternalRequestItem[];
}

export interface CreateInternalRequestPayload {
  priority?: RequestPriority;
  departmentSection: string;
  justification: string;
  notes?: string;
  items: {
    productId: number;
    requestedQuantity: number;
  }[];
}

export interface DispatchBatchAllocation {
  batchId: number;
  quantity: number;
}

export interface DispatchRequestItemPayload {
  itemId: number;
  batchId?: number;
  dispatchedQuantity?: number;
  allocations?: DispatchBatchAllocation[];
}

export interface DispatchRequestPayload {
  requestId: number;
  items: DispatchRequestItemPayload[];
  dispatchNotes?: string;
}

export interface RequestWindowStatus {
  isOpen: boolean;
  isSuspended: boolean;
  hasQuota: boolean;
  weeklyQuotaUsed: number;
  maxWeeklyRequests: number;
  currentCycle: string;
  message: string;
  canCreate: boolean;
  isAdminOrWarehouse: boolean;
  config?: {
    startDay: number;
    startHour: number;
    startMinute: number;
    endDay: number;
    endHour: number;
    endMinute: number;
    isSuspended: boolean;
  };
}

export interface RequestWindowConfigData {
  id?: number;
  startDay: number;
  startHour: number;
  startMinute: number;
  endDay: number;
  endHour: number;
  endMinute: number;
  isSuspended: boolean;
  maxWeeklyRequestsPerUser: number;
  timezone?: string;
  createdAt?: string;
  updatedAt?: string;
}

