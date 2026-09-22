export type FridgeStatus =
  | "OPERATIVO"
  | "MANTENIMIENTO"
  | "DEFECTUOSO"
  | "FUERA_DE_SERVICIO";

export type LabUnitStatus = "SELLADO" | "EN_USO" | "AGOTADO" | "DESCARTADO";

export interface LabFridge {
  id: number;
  locationId: number;
  code: string;
  name: string;
  targetTempCelsius: string | number | null;
  status: FridgeStatus;
  description: string | null;
  location?: { id: number; name: string; type: string };
  _count?: { labReagentUnits: number };
}

export interface ReagentInFridge {
  id: string | number;
  productId: string | number;
  unitCode: string;
  initialVolume: string | number;
  currentVolume: string | number;
  status: LabUnitStatus;
  expirationDate: string | null;
  product?: {
    name: string;
    sku: string;
    baseUnit?: { abbreviation: string };
  };
  batch?: {
    lotNumber: string;
    expirationDate: string | null;
  };
}

export interface FridgeContentsResponse {
  id: number;
  code: string;
  name: string;
  targetTempCelsius?: string | number | null;
  labReagentUnits: ReagentInFridge[];
  location?: { id: number; name: string; type: string };
}

export interface AssignBatchResponse {
  batchId: string | number;
  fridgeId: number;
  assignedUnits: number;
}

export interface CreateFridgePayload {
  locationId: number;
  code: string;
  name: string;
  targetTempCelsius?: number | null;
  status?: FridgeStatus;
  description?: string | null;
}

// --- Tipos de Consumo en Laboratorio ---
export interface LabReagentUnitItem {
  id: string | number;
  productId: string | number;
  batchId: string | number;
  fridgeId: number | null;
  unitCode: string;
  initialVolume: number | string;
  currentVolume: number | string;
  status: LabUnitStatus;
  expirationDate: string | null;
  product: {
    name: string;
    sku: string;
    baseUnit?: { abbreviation: string };
  };
  batch?: {
    lotNumber: string;
    expirationDate: string | null;
  };
  fridge?: {
    id: number;
    name: string;
    code: string;
    targetTempCelsius: number | string | null;
  } | null;
}

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
