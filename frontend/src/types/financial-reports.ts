export interface CostRealByExamReport {
  summary: {
    totalExamsAnalyzed: number;
    totalWeeklyRuns: number;
    grandTotalPatientExams: number;
    grandTotalCost: number | string;
    averageCostPerExam: number | string;
  };
  byExam: Array<{
    examId: number;
    examCode: string;
    examName: string;
    areaId: number;
    areaName: string;
    totalRuns: number;
    totalValidPatientExams: number;
    totalRunCost: number | string;
    effectiveCostPerExam: number | string;
    usesBreakdown: {
      patientUses: number;
      repeatUses: number;
      calibratorUses: number;
      controlUses: number;
      wasteUses: number;
    };
    runs: Array<{
      runId: number;
      code: string;
      weekStartDate: string;
      weekEndDate: string;
      validPatientExams: number;
      runCost: number | string;
      costPerExam: number | string;
    }>;
  }>;
}

export interface FinancialConsolidatedByAreaReport {
  overallClinicalExpenditure: number | string;
  overallResearchExpenditure: number | string;
  grandTotalCombinedCost: number | string;
  areas: Array<{
    areaId: number;
    areaCode: string;
    areaName: string;
    totalRuns: number;
    totalPatientExams: number;
    clinicalCost: number | string;
    researchCost: number | string;
    totalAreaCost: number | string;
    costPerExamAverage: number | string;
    examDistribution: Array<{
      examCode: string;
      examName: string;
      runsCount: number;
      cost: number | string;
    }>;
  }>;
}

export interface TraceabilityBatch {
  id: string | number;
  lotNumber: string;
  expirationDate: string | null;
  initialQuantity: number;
  currentQuantity: number;
  costPerUnit: number | string;
  status: string;
  product: {
    id: string | number;
    name: string;
    sku: string;
    category?: { name: string } | null;
    brand?: { name: string } | null;
    baseUnit?: { name: string; abbreviation: string } | null;
  };
  location?: { name: string; code: string } | null;
  origin?: {
    orderNumber?: string;
    supplierName?: string;
    receptionDate?: string;
    receivedBy?: string;
    invoiceNumbers?: string[];
  };
  labUnits: Array<{
    id: string | number;
    unitCode: string;
    initialVolume: number;
    currentVolume: number;
    status: string;
    fridgeName?: string;
    areaName?: string;
    projectName?: string;
    quarantineIncidents?: Array<{
      code: string;
      reason: string;
      status: string;
    }>;
    runConsumptions?: Array<{
      runCode: string;
      examName: string;
      uses: number;
      bioanalyst: string;
      date: string;
    }>;
  }>;
}

export interface ItemTraceabilityReport {
  batches: TraceabilityBatch[];
  totalBatchesFound: number;
}
