import { prisma } from '../config/prisma.js';
import {
  ResearchProjectType,
  ResearchProjectStatus,
  ResearchMemberRole,
  ResearchInvestorType,
  ResearchTransferDirection,
  ResearchTrialStatus,
  ResearchFindingType,
  StockOwnership,
  BatchStatus,
  LabUnitStatus,
  LabMovementType,
  RepeatReason,
  ConsumptionConcept,
  Prisma,
} from '@prisma/client';

export interface CreateProjectDTO {
  code?: string;
  title: string;
  description?: string | null;
  researchLine?: string | null;
  type: ResearchProjectType;
  status?: ResearchProjectStatus;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  principalInvestigatorId?: number;
}

export interface UpdateProjectDTO {
  title?: string;
  description?: string | null;
  researchLine?: string | null;
  type?: ResearchProjectType;
  status?: ResearchProjectStatus;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}

export interface AddMemberDTO {
  userId: number;
  role: ResearchMemberRole;
  canRequestMaterials?: boolean;
  canRecordTrials?: boolean;
}

export interface UpdateMemberDTO {
  role?: ResearchMemberRole;
  canRequestMaterials?: boolean;
  canRecordTrials?: boolean;
  isActive?: boolean;
}

export interface CreateInvestorDTO {
  name: string;
  taxIdOrCode?: string | null;
  investorType: ResearchInvestorType;
  contactName?: string | null;
  contactEmail?: string | null;
}

export interface RecordInvestmentDTO {
  projectId: number;
  investorId: number;
  amount: number;
  currency?: string;
  investmentDate?: Date | string;
  purposeNotes?: string | null;
}

export interface DonationItemInputDTO {
  productId: bigint | number | string;
  quantity: number;
  lotNumber: string;
  expirationDate?: Date | string | null;
  estimatedUnitValue: number;
  unitCode?: string;
}

export interface RecordDonationDTO {
  projectId: number;
  investorId: number;
  receivedById: number;
  donationDate?: Date | string;
  locationId?: number;
  fridgeId?: number | null;
  notes?: string | null;
  items: DonationItemInputDTO[];
}

export interface TransferStockDTO {
  sourceUnitId: bigint | number | string;
  projectId: number;
  authorizedById: number;
  transferredUses: number;
  direction: ResearchTransferDirection;
  reason: string;
}

export interface CreateTrialDTO {
  projectId: number;
  executedById: number;
  trialDate?: Date | string;
  title: string;
  objective?: string | null;
  notes?: string | null;
}

export interface TrialConsumptionItemDTO {
  labReagentUnitId: bigint | number | string;
  externalCalibratorUnitId?: bigint | number | string | null;
  sampleUses: number;
  repeatUses?: number;
  repeatReason?: RepeatReason | null;
  calibratorUses?: number;
  calibratorNotes?: string | null;
  controlUses?: number;
  wasteUses?: number;
  isPrimaryKitDepleted?: boolean;
  primaryKitPhysicalRemainingUses?: number | null;
  isExternalCalibratorDepleted?: boolean;
  externalCalibratorPhysicalRemainingUses?: number | null;
}

export interface RecordTrialExecutionDTO {
  totalSamplesTested: number;
  notes?: string | null;
  consumptions: TrialConsumptionItemDTO[];
}

export interface CreateFindingDTO {
  projectId: number;
  trialId?: number | null;
  recordedById: number;
  title: string;
  findingType: ResearchFindingType;
  summary: string;
  conclusion?: string | null;
  attachmentUrl?: string | null;
  isPublished?: boolean;
}

export interface UpdateFindingDTO {
  title?: string;
  findingType?: ResearchFindingType;
  summary?: string;
  conclusion?: string | null;
  attachmentUrl?: string | null;
  isPublished?: boolean;
}

export class ResearchService {
  // ==========================================
  // 1. PROYECTOS DE INVESTIGACIÓN Y DOCENCIA
  // ==========================================

  static async createProject(data: CreateProjectDTO) {
    return prisma.$transaction(async (tx) => {
      const currentYear = new Date().getFullYear();
      const count = await tx.researchProject.count();
      const code =
        data.code?.trim() ||
        `PRJ-${currentYear}-${String(count + 1).padStart(4, '0')}-${Date.now().toString().slice(-4)}`;

      const project = await tx.researchProject.create({
        data: {
          code,
          title: data.title.trim(),
          description: data.description?.trim() ?? null,
          researchLine: data.researchLine?.trim() ?? null,
          type: data.type,
          status: data.status ?? ResearchProjectStatus.FORMULATION,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          totalInvestedFunds: 0,
          spentFunds: 0,
          remainingFunds: 0,
          consumedMaterialsValue: 0,
        },
      });

      if (data.principalInvestigatorId) {
        await tx.researchProjectMember.create({
          data: {
            projectId: project.id,
            userId: data.principalInvestigatorId,
            role: ResearchMemberRole.PRINCIPAL_INVESTIGATOR,
            canRequestMaterials: true,
            canRecordTrials: true,
            isActive: true,
          },
        });
      }

      return tx.researchProject.findUnique({
        where: { id: project.id },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, fullName: true, username: true, department: true },
              },
            },
          },
        },
      });
    });
  }

  static async listProjects(filter?: {
    status?: ResearchProjectStatus;
    type?: ResearchProjectType;
    search?: string;
    userId?: number;
  }) {
    return prisma.researchProject.findMany({
      where: {
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.type ? { type: filter.type } : {}),
        ...(filter?.userId
          ? {
              members: {
                some: { userId: filter.userId, isActive: true },
              },
            }
          : {}),
        ...(filter?.search
          ? {
              OR: [
                { code: { contains: filter.search, mode: 'insensitive' } },
                { title: { contains: filter.search, mode: 'insensitive' } },
                { researchLine: { contains: filter.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, fullName: true, username: true, department: true } },
          },
        },
        _count: {
          select: {
            investments: true,
            donations: true,
            trials: true,
            findings: true,
            labReagentUnits: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getProjectById(id: number) {
    const project = await prisma.researchProject.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, username: true, department: true, email: true },
            },
          },
        },
        investments: {
          include: { investor: true },
          orderBy: { investmentDate: 'desc' },
        },
        donations: {
          include: {
            investor: true,
            receivedBy: { select: { id: true, fullName: true, username: true } },
            items: { include: { product: true } },
          },
          orderBy: { donationDate: 'desc' },
        },
        stockTransfers: {
          include: {
            sourceUnit: { include: { product: true } },
            targetUnit: { include: { product: true } },
            authorizedBy: { select: { id: true, fullName: true, username: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        trials: {
          include: {
            executedBy: { select: { id: true, fullName: true, username: true } },
            consumptions: {
              include: {
                labReagentUnit: { include: { product: true } },
                externalCalibratorUnit: { include: { product: true } },
              },
            },
          },
          orderBy: { trialDate: 'desc' },
        },
        findings: {
          include: {
            recordedBy: { select: { id: true, fullName: true, username: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        labReagentUnits: {
          include: {
            product: true,
            fridge: true,
            batch: true,
          },
          orderBy: { expirationDate: 'asc' },
        },
      },
    });

    if (!project) {
      throw new Error('Proyecto de investigación no encontrado');
    }

    return project;
  }

  static async updateProject(id: number, data: UpdateProjectDTO) {
    return prisma.researchProject.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.researchLine !== undefined ? { researchLine: data.researchLine } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.startDate !== undefined
          ? { startDate: data.startDate ? new Date(data.startDate) : null }
          : {}),
        ...(data.endDate !== undefined
          ? { endDate: data.endDate ? new Date(data.endDate) : null }
          : {}),
      },
      include: {
        members: {
          include: { user: { select: { id: true, fullName: true, username: true } } },
        },
      },
    });
  }

  // ==========================================
  // 2. MIEMBROS Y RESPONSABLES
  // ==========================================

  static async addMember(projectId: number, data: AddMemberDTO) {
    return prisma.researchProjectMember.create({
      data: {
        projectId,
        userId: data.userId,
        role: data.role,
        canRequestMaterials: data.canRequestMaterials ?? true,
        canRecordTrials: data.canRecordTrials ?? true,
        isActive: true,
      },
      include: {
        user: { select: { id: true, fullName: true, username: true, department: true } },
      },
    });
  }

  static async updateMember(projectId: number, memberId: number, data: UpdateMemberDTO) {
    return prisma.researchProjectMember.update({
      where: { id: memberId },
      data: {
        ...(data.role ? { role: data.role } : {}),
        ...(data.canRequestMaterials !== undefined ? { canRequestMaterials: data.canRequestMaterials } : {}),
        ...(data.canRecordTrials !== undefined ? { canRecordTrials: data.canRecordTrials } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, username: true, department: true } },
      },
    });
  }

  static async removeMember(projectId: number, memberId: number) {
    return prisma.researchProjectMember.delete({
      where: { id: memberId },
    });
  }

  // ==========================================
  // 3. INVERSORES Y APORTES FINANCIEROS
  // ==========================================

  static async createInvestor(data: CreateInvestorDTO) {
    return prisma.researchInvestor.create({
      data: {
        name: data.name.trim(),
        taxIdOrCode: data.taxIdOrCode?.trim() ?? null,
        investorType: data.investorType,
        contactName: data.contactName?.trim() ?? null,
        contactEmail: data.contactEmail?.trim() ?? null,
        isActive: true,
      },
    });
  }

  static async listInvestors(filter?: {
    investorType?: ResearchInvestorType;
    search?: string;
  }) {
    return prisma.researchInvestor.findMany({
      where: {
        ...(filter?.investorType ? { investorType: filter.investorType } : {}),
        ...(filter?.search
          ? {
              OR: [
                { name: { contains: filter.search, mode: 'insensitive' } },
                { taxIdOrCode: { contains: filter.search, mode: 'insensitive' } },
                { contactName: { contains: filter.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { investments: true, donations: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getInvestorById(id: number) {
    const investor = await prisma.researchInvestor.findUnique({
      where: { id },
      include: {
        investments: { include: { project: true } },
        donations: { include: { project: true } },
      },
    });
    if (!investor) throw new Error('Inversor no encontrado');
    return investor;
  }

  static async recordInvestment(data: RecordInvestmentDTO) {
    if (data.amount <= 0) {
      throw new Error('El monto de inversión debe ser mayor a cero');
    }

    return prisma.$transaction(async (tx) => {
      const project = await tx.researchProject.findUnique({
        where: { id: data.projectId },
      });
      if (!project) throw new Error('Proyecto de investigación no encontrado');

      const investor = await tx.researchInvestor.findUnique({
        where: { id: data.investorId },
      });
      if (!investor) throw new Error('Inversor no encontrado');

      const count = await tx.researchInvestment.count();
      const code = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}-${Date.now().toString().slice(-4)}`;

      const investment = await tx.researchInvestment.create({
        data: {
          code,
          projectId: data.projectId,
          investorId: data.investorId,
          amount: new Prisma.Decimal(data.amount),
          currency: data.currency ?? 'USD',
          investmentDate: data.investmentDate ? new Date(data.investmentDate) : new Date(),
          purposeNotes: data.purposeNotes?.trim() ?? null,
        },
        include: {
          project: true,
          investor: true,
        },
      });

      // Actualizar automáticamente presupuestos del proyecto
      await tx.researchProject.update({
        where: { id: data.projectId },
        data: {
          totalInvestedFunds: { increment: new Prisma.Decimal(data.amount) },
          remainingFunds: { increment: new Prisma.Decimal(data.amount) },
        },
      });

      return investment;
    });
  }

  static async listInvestments(filter?: { projectId?: number; investorId?: number }) {
    return prisma.researchInvestment.findMany({
      where: {
        ...(filter?.projectId ? { projectId: filter.projectId } : {}),
        ...(filter?.investorId ? { investorId: filter.investorId } : {}),
      },
      include: {
        project: true,
        investor: true,
      },
      orderBy: { investmentDate: 'desc' },
    });
  }

  // ==========================================
  // 4. DONACIONES EN ESPECIE (REACTIVOS / KITS BLINDADOS)
  // ==========================================

  static async recordDonation(data: RecordDonationDTO) {
    if (!data.items || data.items.length === 0) {
      throw new Error('La donación debe contener al menos un ítem o reactivo');
    }

    return prisma.$transaction(async (tx) => {
      const project = await tx.researchProject.findUnique({
        where: { id: data.projectId },
      });
      if (!project) throw new Error('Proyecto de investigación no encontrado');

      const investor = await tx.researchInvestor.findUnique({
        where: { id: data.investorId },
      });
      if (!investor) throw new Error('Inversor o ente donante no encontrado');

      const count = await tx.researchDonation.count();
      const code = `DON-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}-${Date.now().toString().slice(-4)}`;

      const donation = await tx.researchDonation.create({
        data: {
          code,
          projectId: data.projectId,
          investorId: data.investorId,
          receivedById: data.receivedById,
          donationDate: data.donationDate ? new Date(data.donationDate) : new Date(),
          notes: data.notes?.trim() ?? null,
        },
      });

      for (const item of data.items) {
        const prodId = BigInt(item.productId);
        const product = await tx.product.findUnique({
          where: { id: prodId },
        });

        if (!product) {
          throw new Error(`Producto ${item.productId} no encontrado`);
        }

        const yieldPerUnit =
          product.theoreticalYield || Number(product.conversionFactor) || 1;
        const initialTheoreticalUses = item.quantity * yieldPerUnit;
        const referenceCostPerUse =
          yieldPerUnit > 0
            ? Number(item.estimatedUnitValue) / yieldPerUnit
            : Number(item.estimatedUnitValue);

        // 1. Crear lote en StockBatch con ownershipType = RESEARCH_PROJECT
        const batch = await tx.stockBatch.create({
          data: {
            productId: prodId,
            locationId: data.locationId ?? 1,
            lotNumber: item.lotNumber.trim(),
            currentQuantity: item.quantity,
            costPrice: 0, // Costo contable 0 por donación
            expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
            status: BatchStatus.DISPONIBLE,
            origin: 'DONACION_INVESTIGACION',
            ownershipType: StockOwnership.RESEARCH_PROJECT,
            researchProjectId: data.projectId,
          },
        });

        // 2. Crear frasco/unidad en nevera (LabReagentUnit) con ownershipType = RESEARCH_PROJECT
        const unitCode =
          item.unitCode?.trim() ||
          `UNIT-DON-${data.projectId}-${item.lotNumber}-${Date.now().toString().slice(-4)}`;

        const unit = await tx.labReagentUnit.create({
          data: {
            productId: prodId,
            batchId: batch.id,
            fridgeId: data.fridgeId ?? null,
            unitCode,
            initialVolume: initialTheoreticalUses,
            currentVolume: initialTheoreticalUses,
            status: LabUnitStatus.SELLADO,
            ownershipType: StockOwnership.RESEARCH_PROJECT,
            researchProjectId: data.projectId,
            initialTheoreticalUses,
            remainingUses: initialTheoreticalUses,
            consumedUses: 0,
            yieldVariance: 0,
            unitCostPerUse: 0, // 0 financiero
            referenceCostPerUse, // Costo de referencia para auditoría científica
            expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
          },
        });

        // 3. Crear ítem de donación vinculado a lote y unidad
        await tx.researchDonationItem.create({
          data: {
            donationId: donation.id,
            productId: prodId,
            quantity: item.quantity,
            lotNumber: item.lotNumber.trim(),
            expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
            estimatedUnitValue: new Prisma.Decimal(item.estimatedUnitValue),
            stockBatchId: batch.id,
            labReagentUnitId: unit.id,
          },
        });

        // 4. Registrar movimiento físico
        await tx.labStockMovement.create({
          data: {
            labReagentUnitId: unit.id,
            movementType: LabMovementType.TRASLADO_NEVERA,
            amountUsed: 0,
            toFridgeId: data.fridgeId ?? null,
            reason: `Ingreso de donación ${donation.code} asignada al proyecto ${project.code}`,
            executedById: data.receivedById,
          },
        });
      }

      return tx.researchDonation.findUnique({
        where: { id: donation.id },
        include: {
          project: true,
          investor: true,
          items: {
            include: {
              product: true,
              stockBatch: true,
              labReagentUnit: true,
            },
          },
        },
      });
    });
  }

  static async listDonations(filter?: { projectId?: number; investorId?: number }) {
    return prisma.researchDonation.findMany({
      where: {
        ...(filter?.projectId ? { projectId: filter.projectId } : {}),
        ...(filter?.investorId ? { investorId: filter.investorId } : {}),
      },
      include: {
        project: true,
        investor: true,
        receivedBy: { select: { id: true, fullName: true, username: true } },
        items: {
          include: {
            product: true,
            labReagentUnit: { include: { fridge: true } },
          },
        },
      },
      orderBy: { donationDate: 'desc' },
    });
  }

  // ==========================================
  // 5. CESIONES Y TRASPASOS DE STOCK
  // ==========================================

  static async transferStock(data: TransferStockDTO) {
    if (data.transferredUses <= 0) {
      throw new Error('La cantidad de usos a traspasar debe ser mayor a cero');
    }

    return prisma.$transaction(async (tx) => {
      const sourceUnitId = BigInt(data.sourceUnitId);
      const sourceUnit = await tx.labReagentUnit.findUnique({
        where: { id: sourceUnitId },
        include: { product: true, batch: true },
      });

      if (!sourceUnit) {
        throw new Error('Unidad de reactivo de origen no encontrada');
      }

      if (sourceUnit.remainingUses < data.transferredUses) {
        throw new Error(
          `Saldo insuficiente en la unidad. Disponible: ${sourceUnit.remainingUses}, solicitado: ${data.transferredUses}`
        );
      }

      const project = await tx.researchProject.findUnique({
        where: { id: data.projectId },
      });
      if (!project) throw new Error('Proyecto de investigación no encontrado');

      let targetUnitId: bigint | null = null;

      if (data.direction === ResearchTransferDirection.CLINICAL_TO_RESEARCH) {
        if (sourceUnit.ownershipType !== StockOwnership.CLINICAL_ROUTINE) {
          throw new Error('La unidad de origen debe ser de rutina clínica');
        }

        if (sourceUnit.remainingUses === data.transferredUses) {
          // Traspaso total: se cambia de propiedad la unidad directamente
          const updated = await tx.labReagentUnit.update({
            where: { id: sourceUnit.id },
            data: {
              ownershipType: StockOwnership.RESEARCH_PROJECT,
              researchProjectId: data.projectId,
              assignedLabAreaId: null,
            },
          });
          targetUnitId = updated.id;
        } else {
          // Traspaso parcial: se descuenta del origen y se crea una unidad hija para el proyecto
          await tx.labReagentUnit.update({
            where: { id: sourceUnit.id },
            data: {
              remainingUses: sourceUnit.remainingUses - data.transferredUses,
              currentVolume: sourceUnit.remainingUses - data.transferredUses,
            },
          });

          const newUnit = await tx.labReagentUnit.create({
            data: {
              productId: sourceUnit.productId,
              batchId: sourceUnit.batchId,
              fridgeId: sourceUnit.fridgeId,
              unitCode: `${sourceUnit.unitCode}-PRJ${data.projectId}`,
              initialVolume: data.transferredUses,
              currentVolume: data.transferredUses,
              status: LabUnitStatus.EN_USO,
              ownershipType: StockOwnership.RESEARCH_PROJECT,
              researchProjectId: data.projectId,
              initialTheoreticalUses: data.transferredUses,
              remainingUses: data.transferredUses,
              consumedUses: 0,
              yieldVariance: 0,
              unitCostPerUse: sourceUnit.unitCostPerUse,
              referenceCostPerUse: sourceUnit.referenceCostPerUse,
              expirationDate: sourceUnit.expirationDate,
            },
          });
          targetUnitId = newUnit.id;
        }
      } else {
        // RESEARCH_TO_CLINICAL
        if (
          sourceUnit.ownershipType !== StockOwnership.RESEARCH_PROJECT ||
          sourceUnit.researchProjectId !== data.projectId
        ) {
          throw new Error(
            'La unidad de origen no pertenece al proyecto de investigación indicado'
          );
        }

        if (sourceUnit.remainingUses === data.transferredUses) {
          const updated = await tx.labReagentUnit.update({
            where: { id: sourceUnit.id },
            data: {
              ownershipType: StockOwnership.CLINICAL_ROUTINE,
              researchProjectId: null,
            },
          });
          targetUnitId = updated.id;
        } else {
          await tx.labReagentUnit.update({
            where: { id: sourceUnit.id },
            data: {
              remainingUses: sourceUnit.remainingUses - data.transferredUses,
              currentVolume: sourceUnit.remainingUses - data.transferredUses,
            },
          });

          const newUnit = await tx.labReagentUnit.create({
            data: {
              productId: sourceUnit.productId,
              batchId: sourceUnit.batchId,
              fridgeId: sourceUnit.fridgeId,
              unitCode: `${sourceUnit.unitCode}-CLINIC`,
              initialVolume: data.transferredUses,
              currentVolume: data.transferredUses,
              status: LabUnitStatus.EN_USO,
              ownershipType: StockOwnership.CLINICAL_ROUTINE,
              researchProjectId: null,
              initialTheoreticalUses: data.transferredUses,
              remainingUses: data.transferredUses,
              consumedUses: 0,
              yieldVariance: 0,
              unitCostPerUse: sourceUnit.unitCostPerUse,
              referenceCostPerUse: sourceUnit.referenceCostPerUse,
              expirationDate: sourceUnit.expirationDate,
            },
          });
          targetUnitId = newUnit.id;
        }
      }

      return tx.researchStockTransfer.create({
        data: {
          sourceUnitId: sourceUnit.id,
          targetUnitId,
          projectId: data.projectId,
          authorizedById: data.authorizedById,
          transferredUses: data.transferredUses,
          direction: data.direction,
          reason: data.reason.trim(),
        },
        include: {
          sourceUnit: true,
          targetUnit: true,
          project: true,
          authorizedBy: { select: { id: true, fullName: true, username: true } },
        },
      });
    });
  }

  static async listStockTransfers(filter?: { projectId?: number }) {
    return prisma.researchStockTransfer.findMany({
      where: {
        ...(filter?.projectId ? { projectId: filter.projectId } : {}),
      },
      include: {
        sourceUnit: { include: { product: true } },
        targetUnit: { include: { product: true } },
        project: true,
        authorizedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================
  // 6. ENSAYOS EXPERIMENTALES (RESEARCH TRIALS)
  // ==========================================

  static async createTrial(data: CreateTrialDTO) {
    const project = await prisma.researchProject.findUnique({
      where: { id: data.projectId },
      include: {
        members: {
          where: { userId: data.executedById, isActive: true },
        },
      },
    });

    if (!project) throw new Error('Proyecto de investigación no encontrado');

    const member = project.members[0];
    if (member && !member.canRecordTrials) {
      throw new Error('El usuario no posee permisos para registrar ensayos en este proyecto');
    }

    const count = await prisma.researchTrial.count();
    const code = `TRL-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}-${Date.now().toString().slice(-4)}`;

    return prisma.researchTrial.create({
      data: {
        code,
        projectId: data.projectId,
        executedById: data.executedById,
        trialDate: data.trialDate ? new Date(data.trialDate) : new Date(),
        title: data.title.trim(),
        objective: data.objective?.trim() ?? null,
        notes: data.notes?.trim() ?? null,
        status: ResearchTrialStatus.OPEN,
      },
      include: {
        project: true,
        executedBy: { select: { id: true, fullName: true, username: true } },
      },
    });
  }

  static async listTrials(filter?: {
    projectId?: number;
    status?: ResearchTrialStatus;
    search?: string;
  }) {
    return prisma.researchTrial.findMany({
      where: {
        ...(filter?.projectId ? { projectId: filter.projectId } : {}),
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.search
          ? {
              OR: [
                { code: { contains: filter.search, mode: 'insensitive' } },
                { title: { contains: filter.search, mode: 'insensitive' } },
                { objective: { contains: filter.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        project: true,
        executedBy: { select: { id: true, fullName: true, username: true } },
        consumptions: {
          include: {
            labReagentUnit: { include: { product: true } },
            externalCalibratorUnit: { include: { product: true } },
          },
        },
        _count: { select: { findings: true } },
      },
      orderBy: { trialDate: 'desc' },
    });
  }

  static async getTrialById(id: number) {
    const trial = await prisma.researchTrial.findUnique({
      where: { id },
      include: {
        project: true,
        executedBy: { select: { id: true, fullName: true, username: true } },
        consumptions: {
          include: {
            labReagentUnit: { include: { product: true, batch: true } },
            externalCalibratorUnit: { include: { product: true, batch: true } },
          },
        },
        findings: true,
        auditLogs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!trial) throw new Error('Ensayo experimental no encontrado');
    return trial;
  }

  static async recordTrialExecution(
    trialId: number,
    data: RecordTrialExecutionDTO
  ) {
    if (!data.consumptions || data.consumptions.length === 0) {
      throw new Error('Debe registrar al menos un consumo de reactivo para el ensayo');
    }

    return prisma.$transaction(async (tx) => {
      const trial = await tx.researchTrial.findUnique({
        where: { id: trialId },
        include: { project: true },
      });

      if (!trial) throw new Error('Ensayo experimental no encontrado');

      if (trial.status !== ResearchTrialStatus.OPEN) {
        throw new Error('Solo se pueden registrar ejecuciones en ensayos con estado OPEN');
      }

      let totalTrialCost = new Prisma.Decimal(0);
      let totalReferenceValue = new Prisma.Decimal(0);
      const auditLogsToCreate: Prisma.LabConsumptionAuditLogCreateManyInput[] = [];

      for (const item of data.consumptions) {
        const unitId = BigInt(item.labReagentUnitId);
        const primaryUnit = await tx.labReagentUnit.findUnique({
          where: { id: unitId },
          include: { product: true, batch: true },
        });

        if (!primaryUnit) {
          throw new Error(`Unidad ${item.labReagentUnitId} no encontrada`);
        }

        // Regla de Blindaje Estricto de Stock
        if (
          primaryUnit.ownershipType !== StockOwnership.RESEARCH_PROJECT ||
          primaryUnit.researchProjectId !== trial.projectId
        ) {
          throw new Error(
            `La unidad ${primaryUnit.unitCode} no pertenece al proyecto de investigación ${trial.project.code}. Blindaje de stock violado.`
          );
        }

        const blockedStatuses: LabUnitStatus[] = [
          LabUnitStatus.AGOTADO,
          LabUnitStatus.DISCARDED,
          LabUnitStatus.DESCARTADO,
          LabUnitStatus.INTERNAL_QUARANTINE,
        ];
        if (blockedStatuses.includes(primaryUnit.status)) {
          throw new Error(
            `La unidad ${primaryUnit.unitCode} no se encuentra disponible (estado: ${primaryUnit.status})`
          );
        }

        const sampleUses = Math.max(0, item.sampleUses || 0);
        const repeatUses = Math.max(0, item.repeatUses || 0);
        const calibratorUses = Math.max(0, item.calibratorUses || 0);
        const controlUses = Math.max(0, item.controlUses || 0);
        const wasteUses = Math.max(0, item.wasteUses || 0);

        const totalDeductedUses =
          sampleUses + repeatUses + calibratorUses + controlUses + wasteUses;

        if (totalDeductedUses <= 0) {
          throw new Error('Cada reactivo consumido debe descontar al menos 1 uso');
        }

        let calibratorUnit = null;
        let calLineCost = new Prisma.Decimal(0);
        let calLineRef = new Prisma.Decimal(0);

        if (item.externalCalibratorUnitId) {
          const calId = BigInt(item.externalCalibratorUnitId);
          calibratorUnit = await tx.labReagentUnit.findUnique({
            where: { id: calId },
            include: { product: true, batch: true },
          });

          if (!calibratorUnit) {
            throw new Error(`Calibrador externo ${item.externalCalibratorUnitId} no encontrado`);
          }

          if (
            calibratorUnit.ownershipType !== StockOwnership.RESEARCH_PROJECT ||
            calibratorUnit.researchProjectId !== trial.projectId
          ) {
            throw new Error(
              `El calibrador ${calibratorUnit.unitCode} no pertenece al proyecto ${trial.project.code}`
            );
          }

          if (blockedStatuses.includes(calibratorUnit.status)) {
            throw new Error(
              `El calibrador ${calibratorUnit.unitCode} está bloqueado (estado: ${calibratorUnit.status})`
            );
          }

          calLineCost = new Prisma.Decimal(calibratorUses).mul(
            calibratorUnit.unitCostPerUse
          );
          calLineRef = new Prisma.Decimal(calibratorUses).mul(
            calibratorUnit.referenceCostPerUse ?? calibratorUnit.unitCostPerUse
          );
        }

        const primaryLineCost = new Prisma.Decimal(totalDeductedUses).mul(
          primaryUnit.unitCostPerUse
        );
        const primaryLineRef = new Prisma.Decimal(totalDeductedUses).mul(
          primaryUnit.referenceCostPerUse ?? primaryUnit.unitCostPerUse
        );

        const calculatedLineCost = primaryLineCost.add(calLineCost);
        const calculatedLineRef = primaryLineRef.add(calLineRef);

        totalTrialCost = totalTrialCost.add(calculatedLineCost);
        totalReferenceValue = totalReferenceValue.add(calculatedLineRef);

        // Conciliación física para el Kit Principal
        const primaryCurrentRem = primaryUnit.remainingUses;
        const primaryExpectedRem = primaryCurrentRem - totalDeductedUses;
        let primaryNewRem = primaryExpectedRem;
        let primaryVarianceDelta = 0;
        let primaryNewStatus: LabUnitStatus =
          primaryUnit.status === LabUnitStatus.SELLADO
            ? LabUnitStatus.EN_USO
            : primaryUnit.status;

        if (primaryExpectedRem < 0) {
          // Over-yield
          const extraYield = Math.abs(primaryExpectedRem);
          primaryVarianceDelta += extraYield;
          primaryNewRem = 0;
          primaryNewStatus = LabUnitStatus.AGOTADO;

          auditLogsToCreate.push({
            userId: trial.executedById,
            labAreaId: null,
            researchTrialId: trial.id,
            labExamId: null,
            weeklyRunId: null,
            labReagentUnitId: primaryUnit.id,
            concept: ConsumptionConcept.YIELD_SURPLUS,
            usesCount: extraYield,
            costImpact: new Prisma.Decimal(0),
            notes: `Rendimiento superior en ensayo ${trial.code} (+${extraYield} usos extra)`,
          });
        } else if (item.isPrimaryKitDepleted === true) {
          // Sub-yield prematuro
          const missingYield = -primaryExpectedRem;
          primaryVarianceDelta += missingYield;
          primaryNewRem = 0;
          primaryNewStatus = LabUnitStatus.AGOTADO;

          if (missingYield !== 0) {
            auditLogsToCreate.push({
              userId: trial.executedById,
              labAreaId: null,
              researchTrialId: trial.id,
              labExamId: null,
              weeklyRunId: null,
              labReagentUnitId: primaryUnit.id,
              concept: ConsumptionConcept.YIELD_DEFICIT,
              usesCount: missingYield,
              costImpact: new Prisma.Decimal(missingYield).mul(primaryUnit.unitCostPerUse),
              notes: `Agotamiento prematuro de kit en ensayo ${trial.code} (${missingYield} usos)`,
            });
          }
        } else if (
          item.primaryKitPhysicalRemainingUses !== undefined &&
          item.primaryKitPhysicalRemainingUses !== null
        ) {
          const physRem = Number(item.primaryKitPhysicalRemainingUses);
          const diff = physRem - primaryExpectedRem;
          primaryVarianceDelta += diff;
          primaryNewRem = physRem;
          primaryNewStatus = physRem === 0 ? LabUnitStatus.AGOTADO : primaryNewStatus;

          if (diff !== 0) {
            auditLogsToCreate.push({
              userId: trial.executedById,
              labAreaId: null,
              researchTrialId: trial.id,
              labExamId: null,
              weeklyRunId: null,
              labReagentUnitId: primaryUnit.id,
              concept:
                diff > 0
                  ? ConsumptionConcept.YIELD_SURPLUS
                  : ConsumptionConcept.YIELD_DEFICIT,
              usesCount: diff,
              costImpact: new Prisma.Decimal(diff).mul(primaryUnit.unitCostPerUse),
              notes: `Conciliación física en ensayo (${diff > 0 ? '+' : ''}${diff} usos)`,
            });
          }
        } else {
          if (primaryNewRem === 0) {
            primaryNewStatus = LabUnitStatus.AGOTADO;
          }
        }

        await tx.labReagentUnit.update({
          where: { id: primaryUnit.id },
          data: {
            remainingUses: primaryNewRem,
            consumedUses: { increment: totalDeductedUses },
            yieldVariance: { increment: primaryVarianceDelta },
            status: primaryNewStatus,
          },
        });

        await tx.labStockMovement.create({
          data: {
            labReagentUnitId: primaryUnit.id,
            movementType: LabMovementType.CONSUMO_PRUEBAS,
            amountUsed: totalDeductedUses,
            reason: `Ensayo experimental ${trial.code}: ${totalDeductedUses} usos consumidos`,
            executedById: trial.executedById,
          },
        });

        // Conciliación física para el Calibrador Externo
        if (calibratorUnit && calibratorUses > 0) {
          const calCurrentRem = calibratorUnit.remainingUses;
          const calExpectedRem = calCurrentRem - calibratorUses;
          let calNewRem = calExpectedRem;
          let calVarianceDelta = 0;
          let calNewStatus: LabUnitStatus =
            calibratorUnit.status === LabUnitStatus.SELLADO
              ? LabUnitStatus.EN_USO
              : calibratorUnit.status;

          if (calExpectedRem < 0) {
            const extra = Math.abs(calExpectedRem);
            calVarianceDelta += extra;
            calNewRem = 0;
            calNewStatus = LabUnitStatus.AGOTADO;

            auditLogsToCreate.push({
              userId: trial.executedById,
              labAreaId: null,
              researchTrialId: trial.id,
              labExamId: null,
              weeklyRunId: null,
              labReagentUnitId: calibratorUnit.id,
              concept: ConsumptionConcept.YIELD_SURPLUS,
              usesCount: extra,
              costImpact: new Prisma.Decimal(0),
              notes: `Rendimiento superior en calibrador (+${extra} usos extra)`,
            });
          } else if (item.isExternalCalibratorDepleted === true) {
            const missing = -calExpectedRem;
            calVarianceDelta += missing;
            calNewRem = 0;
            calNewStatus = LabUnitStatus.AGOTADO;

            if (missing !== 0) {
              auditLogsToCreate.push({
                userId: trial.executedById,
                labAreaId: null,
                researchTrialId: trial.id,
                labExamId: null,
                weeklyRunId: null,
                labReagentUnitId: calibratorUnit.id,
                concept: ConsumptionConcept.YIELD_DEFICIT,
                usesCount: missing,
                costImpact: new Prisma.Decimal(missing).mul(calibratorUnit.unitCostPerUse),
                notes: `Agotamiento prematuro de calibrador en ensayo (${missing} usos)`,
              });
            }
          } else if (
            item.externalCalibratorPhysicalRemainingUses !== undefined &&
            item.externalCalibratorPhysicalRemainingUses !== null
          ) {
            const calPhys = Number(item.externalCalibratorPhysicalRemainingUses);
            const diff = calPhys - calExpectedRem;
            calVarianceDelta += diff;
            calNewRem = calPhys;
            calNewStatus = calPhys === 0 ? LabUnitStatus.AGOTADO : calNewStatus;

            if (diff !== 0) {
              auditLogsToCreate.push({
                userId: trial.executedById,
                labAreaId: null,
                researchTrialId: trial.id,
                labExamId: null,
                weeklyRunId: null,
                labReagentUnitId: calibratorUnit.id,
                concept:
                  diff > 0
                    ? ConsumptionConcept.YIELD_SURPLUS
                    : ConsumptionConcept.YIELD_DEFICIT,
                usesCount: diff,
                costImpact: new Prisma.Decimal(diff).mul(calibratorUnit.unitCostPerUse),
                notes: `Conciliación física calibrador (${diff > 0 ? '+' : ''}${diff} usos)`,
              });
            }
          } else {
            if (calNewRem === 0) {
              calNewStatus = LabUnitStatus.AGOTADO;
            }
          }

          await tx.labReagentUnit.update({
            where: { id: calibratorUnit.id },
            data: {
              remainingUses: calNewRem,
              consumedUses: { increment: calibratorUses },
              yieldVariance: { increment: calVarianceDelta },
              status: calNewStatus,
            },
          });

          await tx.labStockMovement.create({
            data: {
              labReagentUnitId: calibratorUnit.id,
              movementType: LabMovementType.CONSUMO_PRUEBAS,
              amountUsed: calibratorUses,
              reason: `Ensayo experimental ${trial.code}: ${calibratorUses} usos deducidos de vial calibrador`,
              executedById: trial.executedById,
            },
          });

          auditLogsToCreate.push({
            userId: trial.executedById,
            labAreaId: null,
            researchTrialId: trial.id,
            labExamId: null,
            weeklyRunId: null,
            labReagentUnitId: calibratorUnit.id,
            concept: ConsumptionConcept.CALIBRATION,
            usesCount: calibratorUses,
            costImpact: calLineCost,
            notes: item.calibratorNotes
              ? `Vial calibrador externo en ensayo: ${item.calibratorNotes}`
              : 'Consumo de calibrador en ensayo experimental',
          });
        }

        // Crear registro de consumo de ensayo
        await tx.researchTrialConsumption.create({
          data: {
            trialId: trial.id,
            labReagentUnitId: primaryUnit.id,
            externalCalibratorUnitId: calibratorUnit?.id ?? null,
            sampleUses,
            repeatUses,
            repeatReason: item.repeatReason ?? null,
            calibratorUses,
            calibratorNotes: item.calibratorNotes?.trim() ?? null,
            controlUses,
            wasteUses,
            totalDeductedUses,
            calculatedCost: calculatedLineCost,
            calculatedReferenceValue: calculatedLineRef,
          },
        });

        // Auditoría inmutable para kit principal en el ensayo
        if (sampleUses > 0) {
          auditLogsToCreate.push({
            userId: trial.executedById,
            labAreaId: null,
            researchTrialId: trial.id,
            labExamId: null,
            weeklyRunId: null,
            labReagentUnitId: primaryUnit.id,
            concept: ConsumptionConcept.PATIENT, // Concepto de prueba/muestra
            usesCount: sampleUses,
            costImpact: new Prisma.Decimal(sampleUses).mul(primaryUnit.unitCostPerUse),
            notes: `Muestras procesadas en ensayo experimental ${trial.code}`,
          });
        }

        if (repeatUses > 0) {
          auditLogsToCreate.push({
            userId: trial.executedById,
            labAreaId: null,
            researchTrialId: trial.id,
            labExamId: null,
            weeklyRunId: null,
            labReagentUnitId: primaryUnit.id,
            concept: ConsumptionConcept.REPEAT,
            usesCount: repeatUses,
            costImpact: new Prisma.Decimal(repeatUses).mul(primaryUnit.unitCostPerUse),
            notes: item.repeatReason
              ? `[${item.repeatReason}] Repetición experimental`
              : 'Repetición técnica en ensayo',
          });
        }

        if (calibratorUses > 0) {
          auditLogsToCreate.push({
            userId: trial.executedById,
            labAreaId: null,
            researchTrialId: trial.id,
            labExamId: null,
            weeklyRunId: null,
            labReagentUnitId: primaryUnit.id,
            concept: ConsumptionConcept.CALIBRATION,
            usesCount: calibratorUses,
            costImpact: new Prisma.Decimal(calibratorUses).mul(primaryUnit.unitCostPerUse),
            notes: 'Pozo de calibración en kit experimental',
          });
        }

        if (controlUses > 0) {
          auditLogsToCreate.push({
            userId: trial.executedById,
            labAreaId: null,
            researchTrialId: trial.id,
            labExamId: null,
            weeklyRunId: null,
            labReagentUnitId: primaryUnit.id,
            concept: ConsumptionConcept.CONTROL,
            usesCount: controlUses,
            costImpact: new Prisma.Decimal(controlUses).mul(primaryUnit.unitCostPerUse),
            notes: 'Controles experimentales',
          });
        }

        if (wasteUses > 0) {
          auditLogsToCreate.push({
            userId: trial.executedById,
            labAreaId: null,
            researchTrialId: trial.id,
            labExamId: null,
            weeklyRunId: null,
            labReagentUnitId: primaryUnit.id,
            concept: ConsumptionConcept.WASTE,
            usesCount: wasteUses,
            costImpact: new Prisma.Decimal(wasteUses).mul(primaryUnit.unitCostPerUse),
            notes: 'Desperdicio técnico experimental',
          });
        }
      }

      // Actualizar valor de materiales consumidos en el proyecto de investigación
      const materialValueIncrement = totalReferenceValue.gt(0)
        ? totalReferenceValue
        : totalTrialCost;

      await tx.researchProject.update({
        where: { id: trial.projectId },
        data: {
          consumedMaterialsValue: { increment: materialValueIncrement },
        },
      });

      // Actualizar ensayo a COMPLETED
      const completedTrial = await tx.researchTrial.update({
        where: { id: trialId },
        data: {
          status: ResearchTrialStatus.COMPLETED,
          totalSamplesTested: Math.max(0, data.totalSamplesTested || 0),
          totalTrialCost,
          totalReferenceValue,
          notes: data.notes?.trim() ?? trial.notes,
          completedAt: new Date(),
        },
        include: {
          project: true,
          executedBy: { select: { id: true, fullName: true, username: true } },
          consumptions: {
            include: {
              labReagentUnit: { include: { product: true } },
              externalCalibratorUnit: { include: { product: true } },
            },
          },
        },
      });

      if (auditLogsToCreate.length > 0) {
        await tx.labConsumptionAuditLog.createMany({
          data: auditLogsToCreate,
        });
      }

      return completedTrial;
    });
  }

  // ==========================================
  // 7. RESULTADOS OBTENIDOS E HITOS (FINDINGS)
  // ==========================================

  static async createFinding(data: CreateFindingDTO) {
    return prisma.researchFinding.create({
      data: {
        projectId: data.projectId,
        trialId: data.trialId ?? null,
        recordedById: data.recordedById,
        title: data.title.trim(),
        findingType: data.findingType,
        summary: data.summary.trim(),
        conclusion: data.conclusion?.trim() ?? null,
        attachmentUrl: data.attachmentUrl?.trim() ?? null,
        isPublished: Boolean(data.isPublished),
      },
      include: {
        project: true,
        trial: true,
        recordedBy: { select: { id: true, fullName: true, username: true } },
      },
    });
  }

  static async listFindings(filter?: {
    projectId?: number;
    trialId?: number;
    findingType?: ResearchFindingType;
    isPublished?: boolean;
    search?: string;
  }) {
    return prisma.researchFinding.findMany({
      where: {
        ...(filter?.projectId ? { projectId: filter.projectId } : {}),
        ...(filter?.trialId ? { trialId: filter.trialId } : {}),
        ...(filter?.findingType ? { findingType: filter.findingType } : {}),
        ...(filter?.isPublished !== undefined ? { isPublished: filter.isPublished } : {}),
        ...(filter?.search
          ? {
              OR: [
                { title: { contains: filter.search, mode: 'insensitive' } },
                { summary: { contains: filter.search, mode: 'insensitive' } },
                { conclusion: { contains: filter.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        project: true,
        trial: true,
        recordedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getFindingById(id: number) {
    const finding = await prisma.researchFinding.findUnique({
      where: { id },
      include: {
        project: true,
        trial: true,
        recordedBy: { select: { id: true, fullName: true, username: true } },
      },
    });
    if (!finding) throw new Error('Resultado de investigación no encontrado');
    return finding;
  }

  static async updateFinding(id: number, data: UpdateFindingDTO) {
    return prisma.researchFinding.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.findingType ? { findingType: data.findingType } : {}),
        ...(data.summary ? { summary: data.summary.trim() } : {}),
        ...(data.conclusion !== undefined ? { conclusion: data.conclusion } : {}),
        ...(data.attachmentUrl !== undefined ? { attachmentUrl: data.attachmentUrl } : {}),
        ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
      },
      include: {
        project: true,
        trial: true,
        recordedBy: { select: { id: true, fullName: true, username: true } },
      },
    });
  }
}
