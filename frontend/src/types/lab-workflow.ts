export type LabInternalRequestStatus =
  | "PENDING_REVIEW"
  | "PENDING"
  | "APPROVED"
  | "DELIVERED"
  | "REJECTED"
  | "CANCELLED";

export type LabWeeklyRunStatus =
  | "OPEN_ACCUMULATING"
  | "IN_PROGRESS"
  | "PENDING_RECONCILIATION"
  | "CLOSED_RECONCILED"
  | "CANCELLED";

export type RepeatReason =
  | "QUALITY_CONTROL_FAILED"
  | "TECHNICAL_ERROR"
  | "EQUIPMENT_ALARM"
  | "SAMPLE_HEMOLYSIS_LIPEMIA"
  | "DILUTION_REQUIRED"
  | "PATHOLOGICAL_CONFIRMATION"
  | "OTHER";

export type LabItemType = "PRIMARY_KIT" | "CALIBRATOR" | "CONTROL" | "GENERAL_CONSUMABLE";

export type QuarantineReason =
  | "DEFECTIVE_KIT"
  | "CONTAMINATION"
  | "TEMPERATURE_BREACH"
  | "RECALL"
  | "EXPIRATION"
  | "SUSPECTED_DEGRADATION"
  | "PHYSICAL_DAMAGE"
  | "OTHER";

export type QuarantineResolutionStatus =
  | "PENDING"
  | "RETURNED_TO_INVENTORY"
  | "RETURNED_TO_SUPPLIER"
  | "DISCARDED"
  | "DOWNGRADED_TO_RESEARCH"
  | "REINTEGRATED_TO_STOCK"
  | "WRITTEN_OFF_AS_LOSS";

export interface LabArea {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  exams?: LabExam[];
  _count?: {
    users?: number;
    labReagentUnits?: number;
    weeklyRuns?: number;
  };
}

export interface LabExam {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  areaId?: number | null;
  defaultCalibratorUses?: number;
  defaultControlUses?: number;
  isActive: boolean;
  area?: LabArea | null;
  compatibleProducts?: Array<{
    id: number;
    productId: string | number;
    labItemType: LabItemType;
    isDefaultCalibrator: boolean;
    product?: {
      id: string | number;
      name: string;
      sku: string;
    };
  }>;
}

export interface InternalRequestItem {
  id: number;
  labRequestId: number;
  productId: string | number;
  requestedUsesOrUnits: number;
  assignedLabUnitId?: string | number | null;
  product?: {
    id: string | number;
    name: string;
    sku: string;
    catalogNumber?: string;
  };
  assignedLabUnit?: {
    id: string | number;
    unitCode: string;
    status: string;
    currentVolume: number;
    batch?: {
      lotNumber: string;
      expirationDate: string | null;
    };
  } | null;
}

export interface LabInternalRequest {
  id: number;
  code: string;
  labAreaId: number;
  requestedById: number;
  reviewedById?: number | null;
  status: LabInternalRequestStatus;
  justification: string;
  reviewNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  labArea: LabArea;
  requestedBy: {
    id: number;
    fullName: string;
    username: string;
  };
  reviewedBy?: {
    id: number;
    fullName: string;
    username: string;
  } | null;
  items: InternalRequestItem[];
}

export interface FefoSuggestionItem {
  requestItemId: number;
  productId: string | number;
  productName: string;
  sku: string;
  requestedUsesOrUnits: number;
  suggestedUnits: Array<{
    id: string | number;
    unitCode: string;
    fridgeName: string;
    lotNumber: string;
    expirationDate: string | null;
    currentVolume: number;
    initialVolume: number;
    remainingUses?: number;
    ownershipType?: "CLINICAL_ROUTINE" | "RESEARCH_PROJECT" | string;
    status: string;
  }>;
}

export interface WeeklyRunConsumption {
  id: number;
  weeklyRunId: number;
  labReagentUnitId: string | number;
  externalCalibratorUnitId?: string | number | null;
  patientUses: number;
  repeatUses: number;
  repeatReason?: RepeatReason | null;
  repeatNotes?: string | null;
  calibratorUses: number;
  calibratorNotes?: string | null;
  controlUses: number;
  wasteUses: number;
  totalUses: number;
  totalDeductedUses?: number;
  unitCostSnapshot: number | string;
  totalConsumptionCost: number | string;
  isPrimaryKitDepleted: boolean;
  labReagentUnit: {
    id: string | number;
    unitCode: string;
    currentVolume: number;
    product: {
      id: string | number;
      name: string;
      sku: string;
    };
    batch?: {
      lotNumber: string;
      expirationDate: string | null;
    };
  };
  externalCalibratorUnit?: {
    id: string | number;
    unitCode: string;
    currentVolume: number;
    product: {
      id: string | number;
      name: string;
      sku: string;
    };
    batch?: {
      lotNumber: string;
    };
  } | null;
}

export interface LabWeeklyRun {
  id: number;
  code: string;
  labAreaId: number;
  labExamId: number;
  bioanalystId: number;
  weekStartDate: string;
  weekEndDate: string;
  status: LabWeeklyRunStatus;
  totalValidPatientExams: number;
  totalRunCost: number | string;
  effectiveCostPerExam: number | string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  labArea: LabArea;
  labExam: LabExam;
  bioanalyst: {
    id: number;
    fullName: string;
    username: string;
  };
  consumptions?: WeeklyRunConsumption[];
}

export interface QuarantineIncident {
  id: string | number;
  code?: string;
  incidentType?: string | null;
  instanceType?: "RECEPTION_WAREHOUSE" | "INTERNAL_LAB" | "RECEPTION_PURCHASING" | string;
  unitId?: string | number | null;
  batchId?: string | number | null;
  labAreaId?: number | null;
  reportedById: number;
  resolvedById?: number | null;
  quarantineReason?: QuarantineReason | string | null;
  description: string;
  evidenceUrl?: string | null;
  affectedUses?: number | null;
  affectedQuantity?: number | string | null;
  status?: string | null;
  resolutionStatus: QuarantineResolutionStatus;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  reportedBy: {
    id: number;
    fullName: string;
    username: string;
  };
  resolvedBy?: {
    id: number;
    fullName: string;
    username: string;
  } | null;
  labArea?: LabArea | null;
  unit?: {
    id: string | number;
    unitCode: string;
    status: string;
    fridge?: { name: string; code: string } | null;
    product?: { name: string; sku: string };
    batch?: { lotNumber: string };
  } | null;
  labReagentUnit?: {
    id: string | number;
    unitCode: string;
    status: string;
    fridge?: { name: string; code: string } | null;
    product?: { name: string; sku: string };
    batch?: { lotNumber: string };
  } | null;
  batch?: {
    id: string | number;
    lotNumber?: string;
    location?: { name: string } | null;
    product?: { name: string; sku?: string } | null;
  } | null;
}

export type FridgeAuditAdjustmentStatus =
  | "PENDING_ADJUSTMENT"
  | "ADJUSTED_AND_RECONCILED"
  | "FLAGGED_DISCREPANCY"
  | "RECONCILED_MATCH"
  | "SURPLUS_DETECTED"
  | "DEFICIT_DISCARDED"
  | "MANUAL_CORRECTION";

export interface FridgeAuditItem {
  id: number;
  auditId?: number;
  fridgePhysicalAuditId?: number;
  labReagentUnitId: string | number;
  systemRemainingUses?: number;
  systemUsesBefore?: number;
  physicalRemainingUses: number;
  variance?: number;
  adjustmentUses?: number;
  adjustmentStatus: FridgeAuditAdjustmentStatus;
  notes?: string | null;
  labReagentUnit?: {
    id: string | number;
    unitCode: string;
    currentVolume: number;
    status: string;
    ownershipType?: "CLINICAL_ROUTINE" | "RESEARCH_PROJECT";
    expirationDate?: string;
    fridge?: { name: string; code: string } | null;
    product: { id?: number; name: string; sku: string };
    batch?: { id?: number; lotNumber: string; expirationDate?: string };
    assignedLabArea?: { id: number; name: string } | null;
  };
}

export interface FridgePhysicalAudit {
  id: number;
  code: string;
  performedById: number;
  auditDate?: string;
  notes?: string | null;
  createdAt: string;
  performedBy: {
    id: number;
    fullName: string;
    username: string;
    department?: string;
  };
  items: FridgeAuditItem[];
}

export type ConsumptionConcept =
  | "PATIENT"
  | "REPEAT"
  | "CALIBRATION"
  | "CONTROL"
  | "WASTE"
  | "YIELD_SURPLUS"
  | "YIELD_DEFICIT"
  | "QUARANTINE_LOCK"
  | "PHYSICAL_AUDIT_ADJUSTMENT";

export interface LabConsumptionAuditLog {
  id: string | number;
  userId: number;
  labAreaId?: number | null;
  researchTrialId?: number | null;
  labExamId?: number | null;
  weeklyRunId?: number | null;
  labReagentUnitId: string | number;
  concept: ConsumptionConcept;
  usesCount: number;
  costImpact: number | string;
  notes?: string | null;
  createdAt: string;
  user?: {
    id: number;
    fullName: string;
    username: string;
    department?: string;
  };
  labArea?: LabArea | null;
  labExam?: LabExam | null;
  weeklyRun?: {
    id: number;
    code: string;
    status: string;
  } | null;
  labReagentUnit?: {
    id: string | number;
    unitCode: string;
    product?: { id: number; name: string; sku: string };
    batch?: { id: number; lotNumber: string; expirationDate?: string };
  };
}
