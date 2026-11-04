import { prisma } from '../config/prisma.js';
import {
  FridgeAuditAdjustmentStatus,
  ConsumptionConcept,
  LabUnitStatus,
  Prisma,
} from '@prisma/client';

export interface CreateFridgeAuditItemDTO {
  labReagentUnitId: bigint | number | string;
  physicalRemainingUses: number;
  notes?: string;
}

export interface CreateFridgeAuditDTO {
  performedById: number;
  notes?: string;
  items: CreateFridgeAuditItemDTO[];
}

export class FridgeAuditService {
  static async createFridgeAudit(data: CreateFridgeAuditDTO) {
    if (!data.items || data.items.length === 0) {
      throw new Error('Debe proporcionar al menos un ítem para la auditoría de nevera');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Verificar usuario
      const user = await tx.user.findUnique({
        where: { id: data.performedById },
      });
      if (!user) {
        throw new Error('El usuario auditor especificado no existe');
      }

      // 2. Generar código único para la auditoría
      const count = await tx.fridgePhysicalAudit.count();
      const code = `AUD-FRIDGE-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}-${Date.now().toString().slice(-4)}`;

      // 3. Crear cabecera de la auditoría
      const audit = await tx.fridgePhysicalAudit.create({
        data: {
          code,
          performedById: data.performedById,
          notes: data.notes?.trim() || null,
        },
      });

      // 4. Procesar cada item
      for (const item of data.items) {
        const unitId = BigInt(item.labReagentUnitId);
        const unit = await tx.labReagentUnit.findUnique({
          where: { id: unitId },
        });

        if (!unit) {
          throw new Error(`La unidad de reactivo ID ${unitId} no existe`);
        }

        if (unit.status === LabUnitStatus.DISCARDED) {
          throw new Error(`La unidad ${unit.unitCode} se encuentra descartada y no puede ser auditada`);
        }

        const physicalRemainingUses = Number(item.physicalRemainingUses);
        if (physicalRemainingUses < 0) {
          throw new Error(`Los usos físicos no pueden ser negativos para la unidad ${unit.unitCode}`);
        }

        const systemRemainingUses = unit.remainingUses;
        const variance = physicalRemainingUses - systemRemainingUses;

        // Determinar estado de la unidad según el conteo
        let newStatus = unit.status;
        if (physicalRemainingUses === 0) {
          newStatus = LabUnitStatus.AGOTADO;
        } else if (unit.status === LabUnitStatus.AGOTADO && physicalRemainingUses > 0) {
          newStatus = LabUnitStatus.EN_USO;
        } else if (unit.status === LabUnitStatus.SELLADO && physicalRemainingUses < unit.initialTheoreticalUses) {
          newStatus = LabUnitStatus.EN_USO;
        }

        // Actualizar LabReagentUnit
        await tx.labReagentUnit.update({
          where: { id: unit.id },
          data: {
            remainingUses: physicalRemainingUses,
            yieldVariance: unit.yieldVariance + variance,
            status: newStatus,
          },
        });

        // Registrar FridgePhysicalAuditItem
        await tx.fridgePhysicalAuditItem.create({
          data: {
            auditId: audit.id,
            labReagentUnitId: unit.id,
            systemRemainingUses,
            physicalRemainingUses,
            variance,
            adjustmentStatus: FridgeAuditAdjustmentStatus.ADJUSTED_AND_RECONCILED,
            notes: item.notes?.trim() || null,
          },
        });

        // Registrar LabConsumptionAuditLog
        const costImpact = Math.abs(variance) * Number(unit.unitCostPerUse || 0);

        await tx.labConsumptionAuditLog.create({
          data: {
            userId: data.performedById,
            concept: ConsumptionConcept.PHYSICAL_AUDIT_ADJUSTMENT,
            labReagentUnitId: unit.id,
            labAreaId: unit.assignedLabAreaId ?? null,
            usesCount: Math.abs(variance),
            costImpact: new Prisma.Decimal(costImpact.toFixed(4)),
            notes:
              item.notes?.trim() ||
              (variance === 0
                ? 'Recuento físico conforme sin varianza'
                : variance > 0
                ? `Sobrante de +${variance} usos detectado en recuento físico de nevera`
                : `Merma de ${variance} usos detectada en recuento físico de nevera`),
          },
        });
      }

      return tx.fridgePhysicalAudit.findUnique({
        where: { id: audit.id },
        include: {
          performedBy: {
            select: { id: true, fullName: true, username: true, department: true },
          },
          items: {
            include: {
              labReagentUnit: {
                include: {
                  product: {
                    select: { id: true, name: true, sku: true, theoreticalYield: true },
                  },
                  batch: {
                    select: { id: true, lotNumber: true, expirationDate: true },
                  },
                  fridge: true,
                  assignedLabArea: true,
                },
              },
            },
          },
        },
      });
    });
  }

  static async listFridgeAudits(filter?: {
    performedById?: number;
    startDate?: Date | string;
    endDate?: Date | string;
    search?: string;
  }) {
    const where: any = {};

    if (filter?.performedById) {
      where.performedById = Number(filter.performedById);
    }

    if (filter?.startDate || filter?.endDate) {
      where.auditDate = {
        ...(filter?.startDate ? { gte: new Date(filter.startDate) } : {}),
        ...(filter?.endDate ? { lte: new Date(filter.endDate) } : {}),
      };
    }

    if (filter?.search) {
      where.OR = [
        { code: { contains: filter.search, mode: 'insensitive' } },
        { notes: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return prisma.fridgePhysicalAudit.findMany({
      where,
      include: {
        performedBy: {
          select: { id: true, fullName: true, username: true, department: true },
        },
        items: {
          include: {
            labReagentUnit: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true },
                },
                batch: {
                  select: { id: true, lotNumber: true },
                },
                fridge: true,
                assignedLabArea: true,
              },
            },
          },
        },
      },
      orderBy: { auditDate: 'desc' },
    });
  }

  static async getFridgeAuditById(id: number) {
    const audit = await prisma.fridgePhysicalAudit.findUnique({
      where: { id },
      include: {
        performedBy: {
          select: { id: true, fullName: true, username: true, department: true },
        },
        items: {
          include: {
            labReagentUnit: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true, theoreticalYield: true },
                },
                batch: {
                  select: { id: true, lotNumber: true, expirationDate: true },
                },
                fridge: true,
                assignedLabArea: true,
              },
            },
          },
        },
      },
    });

    if (!audit) {
      throw new Error(`Auditoría de nevera con ID ${id} no encontrada`);
    }

    return audit;
  }
}
