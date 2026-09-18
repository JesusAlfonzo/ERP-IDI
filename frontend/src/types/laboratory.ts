export interface ReagentBatchOption {
  id: number;
  lotNumber: string;
  currentQuantity: number;
  expirationDate: string | null;
  product: {
    id: number;
    sku: string;
    name: string;
    unitOfMeasure: string;
  };
  fridge?: {
    id: number;
    name: string;
    code: string;
    targetTempCelsius: number | string | null;
  } | null;
}

export interface ReagentConsumptionPayload {
  batchId: number;
  quantity: number;
  diagnosticProtocol: string;
  departmentSection: string;
  notes?: string;
}

export interface ReagentConsumptionRecord {
  id: number;
  createdAt: string;
  quantity: number;
  diagnosticProtocol: string;
  departmentSection: string;
  notes?: string | null;
  analyst: {
    fullName: string;
    username: string;
  };
  batch: {
    lotNumber: string;
    product: {
      sku: string;
      name: string;
      unitOfMeasure: string;
    };
  };
}
