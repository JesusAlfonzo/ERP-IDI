export type ResearchProjectType =
  | "EXPERIMENTAL_DEVELOPMENT"
  | "CLINICAL_VALIDATION"
  | "ACADEMIC_THESIS"
  | "PILOT_STUDY"
  | "QUALITY_ASSURANCE";

export type ResearchProjectStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

export type ResearchInvestorType = "PUBLIC_GRANT" | "PRIVATE_DONOR" | "CORPORATE_SPONSOR" | "INSTITUTIONAL";

export type ResearchTrialStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type ResearchFindingType =
  | "PRELIMINARY_RESULT"
  | "PROTOCOL_OPTIMIZATION"
  | "ACCURACY_VALIDATION"
  | "ANOMALY_DETECTED"
  | "FINAL_CONCLUSION";

export interface ResearchInvestor {
  id: number;
  name: string;
  type: ResearchInvestorType;
  contactEmail?: string | null;
  contactPhone?: string | null;
  taxId?: string | null;
  country?: string | null;
}

export interface ResearchProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: "PRINCIPAL_INVESTIGATOR" | "CO_INVESTIGATOR" | "RESEARCH_ASSISTANT" | "STUDENT_INTERN";
  joinedAt: string;
  user: {
    id: number;
    fullName: string;
    username: string;
    email: string;
  };
}

export interface ResearchProject {
  id: number;
  code: string;
  title: string;
  description?: string | null;
  projectType: ResearchProjectType;
  status: ResearchProjectStatus;
  budgetEstimated: number | string;
  budgetExecuted: number | string;
  startDate: string;
  endDate?: string | null;
  leadInvestigatorId?: number | null;
  createdAt: string;
  updatedAt: string;
  leadInvestigator?: {
    id: number;
    fullName: string;
    username: string;
  } | null;
  members?: ResearchProjectMember[];
  _count?: {
    donations?: number;
    trials?: number;
    findings?: number;
    reagentUnits?: number;
  };
}

export interface ResearchDonationItem {
  id: number;
  donationId: number;
  productId: string | number;
  batchId?: string | number | null;
  quantity: number;
  estimatedUnitValue: number | string;
  totalEstimatedValue: number | string;
  product?: {
    id: string | number;
    name: string;
    sku: string;
  };
}

export interface ResearchDonation {
  id: number;
  code: string;
  projectId: number;
  investorId: number;
  receivedById: number;
  donationDate: string;
  totalMonetaryValue: number | string;
  notes?: string | null;
  createdAt: string;
  project: {
    id: number;
    code: string;
    title: string;
  };
  investor: {
    id: number;
    name: string;
    type: string;
  };
  receivedBy: {
    id: number;
    fullName: string;
    username: string;
  };
  items: ResearchDonationItem[];
}

export interface ResearchTrialConsumption {
  id: number;
  trialId: number;
  labReagentUnitId: string | number;
  sampleUses: number;
  repeatUses: number;
  calibratorUses: number;
  controlUses: number;
  totalUses: number;
  unitCostSnapshot: number | string;
  totalCost: number | string;
  labReagentUnit?: {
    unitCode: string;
    product: {
      name: string;
      sku: string;
    };
  };
}

export interface ResearchTrial {
  id: number;
  code: string;
  projectId: number;
  executedById: number;
  trialDate: string;
  title: string;
  objective?: string | null;
  notes?: string | null;
  totalSamplesTested: number;
  trialCost: number | string;
  status: ResearchTrialStatus;
  createdAt: string;
  project: {
    id: number;
    code: string;
    title: string;
  };
  executedBy: {
    id: number;
    fullName: string;
    username: string;
  };
  consumptions?: ResearchTrialConsumption[];
  findings?: ResearchFinding[];
}

export interface ResearchFinding {
  id: number;
  projectId: number;
  trialId?: number | null;
  recordedById: number;
  title: string;
  findingType: ResearchFindingType;
  summary: string;
  conclusion?: string | null;
  attachmentUrl?: string | null;
  isPublished: boolean;
  createdAt: string;
  project?: {
    id: number;
    code: string;
    title: string;
  };
  trial?: {
    id: number;
    code: string;
    title: string;
  } | null;
  recordedBy?: {
    id: number;
    fullName: string;
    username: string;
  };
}
