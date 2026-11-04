import { prisma } from '../config/prisma.js';
import {
  LabUnitStatus,
  LabMovementType,
  FridgeStatus,
  BatchStatus,
  StockMovementType,
  StockOwnership,
  QuarantineInstanceType,
  QuarantineReason,
  QuarantineResolutionStatus,
  IncidentStatus,
  IncidentType,
  LabInternalRequestStatus,
  LabWeeklyRunStatus,
  RepeatReason,
  ConsumptionConcept,
  Prisma,
} from '@prisma/client';

export interface CreateLabUnitDTO {
  productId: bigint;
  batchId: bigint;
  fridgeId: number;
  unitCode: string;
  initialVolume: number;
  expirationDate?: Date | null;
  openedById?: number | null;
  ownershipType?: StockOwnership;
  researchProjectId?: number | null;
  initialTheoreticalUses?: number;
  unitCostPerUse?: number;
  referenceCostPerUse?: number | null;
  status?: LabUnitStatus;
}

export interface CreateFridgeDTO {
  locationId: number;
  code: string;
  name: string;
  targetTempCelsius?: number | null;
  status?: FridgeStatus;
  description?: string | null;
}

export interface ConsumeLabUnitDTO {
  unitId: bigint;
  amountUsed: number;
  reason?: string | null;
  executedById: number;
}

export interface ReagentConsumptionDTO {
  batchId: bigint;
  quantity: number;
  diagnosticProtocol: string;
  departmentSection: string;
  notes?: string | null;
  executedById: number;
}

export interface TransferLabUnitFridgeDTO {
  unitId: bigint;
  toFridgeId: number;
  reason?: string | null;
  executedById: number;
}

export interface DiscardLabUnitDTO {
  unitId: bigint;
  reason: string;
  executedById: number;
}

export interface AssignBatchToFridgeDTO {
  batchId: bigint;
  fridgeId: number;
  executedById: number;
  quantityBoxes?: number;
  ownershipType?: StockOwnership;
  researchProjectId?: number | null;
  status?: LabUnitStatus;
  isDonation?: boolean;
  notes?: string | null;
}

export interface PutUnitInQuarantineDTO {
  unitId: bigint;
  quarantineReason: QuarantineReason;
  description: string;
  evidenceUrl?: string | null;
  labAreaId?: number | null;
  reportedById: number;
}

export interface ResolveQuarantineDTO {
  incidentId: bigint;
  resolutionStatus: QuarantineResolutionStatus;
  resolutionNotes: string;
  resolvedById: number;
}

export interface CreateLabAreaDTO {
  code: string;
  name: string;
  description?: string | null;
}

export interface UpdateLabAreaDTO {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CreateLabExamDTO {
  code: string;
  name: string;
  description?: string | null;
  areaId?: number | null;
  compatibleProductIds?: (bigint | number)[];
}

export interface UpdateLabExamDTO {
  name?: string;
  description?: string | null;
  areaId?: number | null;
  isActive?: boolean;
  compatibleProductIds?: (bigint | number)[];
}

export interface CreateInternalRequestItemDTO {
  productId: bigint | number | string;
  requestedUsesOrUnits: number;
}

export interface CreateInternalRequestDTO {
  labAreaId: number;
  requestedById: number;
  justification: string;
  items: CreateInternalRequestItemDTO[];
}

export interface ItemAssignmentDTO {
  itemId: number;
  assignedLabUnitId: bigint | number | string;
}

export interface ApproveInternalRequestDTO {
  reviewedById: number;
  reviewNotes?: string | null;
  itemAssignments?: ItemAssignmentDTO[];
}

export interface CreateWeeklyRunDTO {
  labAreaId: number;
  labExamId: number;
  bioanalystId: number;
  weekStartDate: Date | string;
  weekEndDate: Date | string;
  notes?: string | null;
}

export interface CloseWeeklyRunItemDTO {
  labReagentUnitId: bigint | number | string;
  externalCalibratorUnitId?: bigint | number | string | null;
  patientUses: number;
  repeatUses?: number;
  repeatReason?: RepeatReason | null;
  repeatNotes?: string | null;
  calibratorUses?: number;
  calibratorNotes?: string | null;
  controlUses?: number;
  wasteUses?: number;
  isPrimaryKitDepleted?: boolean;
  primaryKitPhysicalRemainingUses?: number | null;
  isExternalCalibratorDepleted?: boolean;
  externalCalibratorPhysicalRemainingUses?: number | null;
}

export interface CloseWeeklyRunDTO {
  runId: number;
  bioanalystId: number;
  totalValidPatientExams: number;
  notes?: string | null;
  consumptions: CloseWeeklyRunItemDTO[];
}

export interface FilterConsumptionAuditLogDTO {
  labAreaId?: number;
  labExamId?: number;
  weeklyRunId?: number;
  concept?: ConsumptionConcept;
  labReagentUnitId?: bigint | number | string;
  startDate?: Date | string;
  endDate?: Date | string;
  userAreaIds?: number[] | null;
}

export class LabService {
  static async getUserAuthorizedAreaIds(
    userId: number,
    userRoles: string[] = []
  ): Promise<number[] | null> {
    const isGlobalManager =
      userRoles.includes('ADMINISTRADOR') ||
      userRoles.includes('COORDINADOR_LABORATORIO') ||
      userRoles.includes('COORDINADOR');
    if (isGlobalManager) {
      return null;
    }
    const userAreas = await prisma.userLabArea.findMany({
      where: { userId },
      select: { labAreaId: true },
    });
    return userAreas.map((ua) => ua.labAreaId);
  }

  static async listAvailableReagents(
    search?: string,
    userAreaIds?: number[] | null
  ) {
    if (userAreaIds !== undefined && userAreaIds !== null && userAreaIds.length === 0) {
      return [];
    }

    return prisma.stockBatch.findMany({
      where: {
        status: BatchStatus.DISPONIBLE,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        currentQuantity: { gt: 0 },
        ...(search
          ? {
              OR: [
                { lotNumber: { contains: search, mode: 'insensitive' } },
                {
                  product: {
                    name: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  product: {
                    sku: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  product: {
                    barcode: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  product: {
                    description: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
        product: {
          OR: [{ isReagent: true }, { isLabReagent: true }],
          ...(userAreaIds && userAreaIds.length > 0
            ? {
                allowedLabAreas: {
                  some: { labAreaId: { in: userAreaIds } },
                },
              }
            : {}),
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            description: true,
            categoryId: true,
            category: { select: { id: true, name: true } },
            isReagent: true,
            isLabReagent: true,
            labItemType: true,
            theoreticalYield: true,
            minStockAlert: true,
            baseUnit: { select: { abbreviation: true } },
          },
        },
        labReagentUnits: {
          where: {
            status: {
              notIn: [
                LabUnitStatus.AGOTADO,
                LabUnitStatus.DISCARDED,
                LabUnitStatus.DESCARTADO,
              ],
            },
          },
          select: {
            fridge: {
              select: {
                id: true,
                name: true,
                code: true,
                targetTempCelsius: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: [{ expirationDate: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  static async listRecentConsumptions(limit = 10) {
    return prisma.stockMovement.findMany({
      where: { type: StockMovementType.DESPACHO_SOLICITUD },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      include: {
        createdBy: { select: { fullName: true, username: true } },
        items: {
          include: {
            batch: {
              include: {
                product: { include: { baseUnit: true } },
              },
            },
          },
        },
      },
    });
  }

  static async registerReagentConsumption(data: ReagentConsumptionDTO) {
    if (data.quantity <= 0) {
      throw new Error('La cantidad consumida debe ser mayor a 0');
    }

    return prisma.$transaction(async (tx) => {
      const batch = await tx.stockBatch.findUnique({
        where: { id: data.batchId },
        include: { product: { include: { baseUnit: true } } },
      });

      if (!batch || (!batch.product.isReagent && !batch.product.isLabReagent)) {
        throw new Error('El lote no existe o no corresponde a un reactivo');
      }
      if (batch.status !== BatchStatus.DISPONIBLE) {
        throw new Error('Solo se pueden consumir lotes disponibles');
      }
      if (data.quantity > Number(batch.currentQuantity)) {
        throw new Error(
          `Cantidad insuficiente. Disponible: ${batch.currentQuantity}`
        );
      }

      const movementCount = await tx.stockMovement.count();
      const movement = await tx.stockMovement.create({
        data: {
          referenceNumber: `MOV-LAB-${new Date().getFullYear()}-${String(
            movementCount + 1
          ).padStart(4, '0')}`,
          type: StockMovementType.DESPACHO_SOLICITUD,
          notes: `${data.diagnosticProtocol} | ${data.departmentSection}${
            data.notes ? ` | ${data.notes}` : ''
          }`,
          createdById: data.executedById,
        },
      });

      const remaining = Number(batch.currentQuantity) - data.quantity;
      const updatedBatch = await tx.stockBatch.update({
        where: { id: batch.id },
        data: {
          currentQuantity: remaining,
          status: remaining === 0 ? BatchStatus.AGOTADO : batch.status,
        },
      });

      await tx.stockMovementItem.create({
        data: {
          stockMovementId: movement.id,
          batchId: batch.id,
          quantity: -data.quantity,
          unitCost: batch.costPrice,
        },
      });

      return {
        id: movement.id,
        createdAt: movement.createdAt,
        quantity: data.quantity,
        diagnosticProtocol: data.diagnosticProtocol,
        departmentSection: data.departmentSection,
        notes: data.notes ?? null,
        analyst: { fullName: '', username: '' },
        batch: {
          lotNumber: batch.lotNumber,
          product: {
            sku: batch.product.sku,
            name: batch.product.name,
            unitOfMeasure: batch.product.baseUnit.abbreviation,
          },
        },
        currentQuantity: updatedBatch.currentQuantity,
      };
    });
  }

  // --- GESTIÓN DE NEVERAS ---

  static async listFridges(locationId?: number) {
    return prisma.fridge.findMany({
      where: {
        ...(locationId ? { locationId } : {}),
      },
      include: {
        location: true,
        _count: {
          select: {
            labReagentUnits: {
              where: {
                status: {
                  in: [
                    LabUnitStatus.SELLADO,
                    LabUnitStatus.EN_USO,
                    LabUnitStatus.INTERNAL_QUARANTINE,
                    LabUnitStatus.IN_TRANSIT_TO_LAB,
                  ],
                },
              },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  static async getFridgeContents(fridgeId: number) {
    const fridge = await prisma.fridge.findUnique({
      where: { id: fridgeId },
      include: {
        location: true,
        labReagentUnits: {
          where: {
            status: {
              in: [
                LabUnitStatus.SELLADO,
                LabUnitStatus.EN_USO,
                LabUnitStatus.INTERNAL_QUARANTINE,
                LabUnitStatus.IN_TRANSIT_TO_LAB,
              ],
            },
          },
          include: {
            product: {
              include: {
                baseUnit: true,
                allowedLabAreas: { include: { labArea: true } },
                compatibleExams: { include: { labExam: true } },
              },
            },
            batch: true,
            incidents: {
              where: { resolutionStatus: QuarantineResolutionStatus.PENDING },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { expirationDate: 'asc' },
        },
      },
    });
    if (!fridge) throw new Error('Nevera no encontrada');
    return fridge;
  }

  static async assignUnitToFridge(
    unitId: bigint,
    fridgeId: number,
    executedById: number,
    reason?: string | null
  ) {
    return this.transferFridge({
      unitId,
      toFridgeId: fridgeId,
      reason: reason ?? 'Asignación inicial a nevera',
      executedById,
    });
  }

  /**
   * Ingreso de Lote a Nevera: Conversión de compra (cajas/kits) a determinaciones/usos
   * y cálculo exacto de unitCostPerUse / referenceCostPerUse.
   */
  static async assignBatchToFridge(
    batchIdOrData: bigint | AssignBatchToFridgeDTO,
    paramFridgeId?: number,
    paramExecutedById?: number
  ) {
    const data: AssignBatchToFridgeDTO =
      typeof batchIdOrData === 'object'
        ? batchIdOrData
        : {
            batchId: batchIdOrData,
            fridgeId: paramFridgeId!,
            executedById: paramExecutedById!,
          };

    return prisma.$transaction(async (tx) => {
      const fridge = await tx.fridge.findUnique({
        where: { id: data.fridgeId },
      });
      if (!fridge) throw new Error('Nevera no encontrada');

      const batch = await tx.stockBatch.findUnique({
        where: { id: data.batchId },
        include: { product: true },
      });
      if (!batch) throw new Error('Lote no encontrado');

      // Cantidad de cajas/unidades ingresadas a la nevera
      const boxesToIngress =
        data.quantityBoxes !== undefined && data.quantityBoxes > 0
          ? data.quantityBoxes
          : Math.max(Number(batch.currentQuantity), 1);

      // Ajuste 3: Coexistencia limpia con conversionFactor como fallback
      const productYield =
        batch.product.theoreticalYield ??
        (batch.product.conversionFactor
          ? Number(batch.product.conversionFactor)
          : 1);
      const theoreticalYield = productYield > 0 ? productYield : 1;

      // Usos teóricos iniciales: cajas_ingresadas * rendimiento_por_caja
      const initialTheoreticalUses = Math.round(
        boxesToIngress * theoreticalYield
      );

      // Ajuste 4: Numerador = costo_total_cajas_ingresadas, denominador = initialTheoreticalUses
      const costUnitBox = Number(batch.costPrice);
      const totalCostIngressed = costUnitBox * boxesToIngress;
      const calculatedCostPerUse =
        initialTheoreticalUses > 0
          ? totalCostIngressed / initialTheoreticalUses
          : 0;

      const isDonation =
        data.isDonation === true ||
        batch.origin === 'DONACION' ||
        costUnitBox === 0;

      const unitCostPerUse = isDonation ? 0 : calculatedCostPerUse;
      const referenceCostPerUse = isDonation ? calculatedCostPerUse : null;

      // Ajuste 2: Int? para researchProjectId y StockOwnership
      const ownershipType =
        data.ownershipType ??
        batch.ownershipType ??
        StockOwnership.CLINICAL_ROUTINE;
      const researchProjectId =
        data.researchProjectId !== undefined
          ? data.researchProjectId
          : batch.researchProjectId;

      // Ajuste 1: Estado por defecto SELLADO (o IN_TRANSIT_TO_LAB)
      const initialStatus = data.status ?? LabUnitStatus.SELLADO;

      const countExisting = await tx.labReagentUnit.count({
        where: { batchId: batch.id },
      });

      const unitCode = `${batch.lotNumber}-F${String(countExisting + 1).padStart(2, '0')}`;

      const newUnit = await tx.labReagentUnit.create({
        data: {
          productId: batch.productId,
          batchId: batch.id,
          fridgeId: fridge.id,
          unitCode,
          initialVolume: initialTheoreticalUses,
          currentVolume: initialTheoreticalUses,
          initialTheoreticalUses,
          consumedUses: 0,
          remainingUses: initialTheoreticalUses,
          yieldVariance: 0,
          unitCostPerUse,
          referenceCostPerUse,
          ownershipType,
          researchProjectId,
          status: initialStatus,
          expirationDate: batch.expirationDate,
        },
        include: {
          product: { include: { baseUnit: true } },
          fridge: true,
          batch: true,
        },
      });

      await tx.labStockMovement.create({
        data: {
          labReagentUnitId: newUnit.id,
          movementType: LabMovementType.TRASLADO_NEVERA,
          amountUsed: 0,
          toFridgeId: fridge.id,
          reason: data.notes ?? 'Ingreso inicial a nevera y conversión a usos',
          executedById: data.executedById,
        },
      });

      return {
        batchId: batch.id,
        fridgeId: fridge.id,
        assignedUnits: 1,
        unit: newUnit,
      };
    });
  }

  static async createFridge(data: CreateFridgeDTO) {
    return prisma.fridge.create({
      data: {
        locationId: data.locationId,
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        targetTempCelsius: data.targetTempCelsius ?? null,
        status: data.status ?? FridgeStatus.OPERATIVO,
        description: data.description ?? null,
      },
      include: {
        location: true,
      },
    });
  }

  // --- TRAZABILIDAD DE FRASCOS / UNIDADES ---
  static async listLabUnits(filter?: {
    status?: LabUnitStatus;
    fridgeId?: number;
    productId?: bigint;
    labAreaId?: number;
    ownershipType?: StockOwnership;
    search?: string;
    userAreaIds?: number[] | null;
  }) {
    if (
      filter?.userAreaIds !== undefined &&
      filter?.userAreaIds !== null &&
      filter.userAreaIds.length === 0
    ) {
      return [];
    }

    const isRestrictedToAreas =
      filter?.userAreaIds !== undefined && filter?.userAreaIds !== null;

    if (
      isRestrictedToAreas &&
      filter?.labAreaId &&
      !filter.userAreaIds!.includes(filter.labAreaId)
    ) {
      return [];
    }

    const areaFilter = isRestrictedToAreas
      ? {
          OR: [
            {
              assignedLabAreaId: filter?.labAreaId
                ? filter.labAreaId
                : { in: filter!.userAreaIds! },
            },
            {
              assignedLabAreaId: null,
              product: {
                allowedLabAreas: {
                  some: {
                    labAreaId: filter?.labAreaId
                      ? filter.labAreaId
                      : { in: filter!.userAreaIds! },
                  },
                },
              },
            },
          ],
        }
      : filter?.labAreaId
      ? {
          OR: [
            { assignedLabAreaId: filter.labAreaId },
            {
              assignedLabAreaId: null,
              product: {
                allowedLabAreas: {
                  some: { labAreaId: filter.labAreaId },
                },
              },
            },
          ],
        }
      : {};

    const defaultStatuses = isRestrictedToAreas
      ? {
          notIn: [
            LabUnitStatus.AGOTADO,
            LabUnitStatus.DISCARDED,
            LabUnitStatus.DESCARTADO,
            LabUnitStatus.INTERNAL_QUARANTINE,
            LabUnitStatus.IN_TRANSIT_TO_LAB,
          ],
        }
      : {
          in: [
            LabUnitStatus.SELLADO,
            LabUnitStatus.EN_USO,
            LabUnitStatus.INTERNAL_QUARANTINE,
            LabUnitStatus.IN_TRANSIT_TO_LAB,
          ],
        };

    const ownershipFilter = isRestrictedToAreas
      ? StockOwnership.CLINICAL_ROUTINE
      : (filter?.ownershipType ?? undefined);

    return prisma.labReagentUnit.findMany({
      where: {
        ...(filter?.status ? { status: filter.status } : { status: defaultStatuses }),
        ...(ownershipFilter ? { ownershipType: ownershipFilter } : {}),
        ...(filter?.fridgeId ? { fridgeId: filter.fridgeId } : {}),
        ...(filter?.productId ? { productId: filter.productId } : {}),
        ...areaFilter,
        ...(filter?.search
          ? {
              OR: [
                { unitCode: { contains: filter.search, mode: 'insensitive' } },
                {
                  product: {
                    name: { contains: filter.search, mode: 'insensitive' },
                  },
                },
                {
                  batch: {
                    lotNumber: { contains: filter.search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        product: {
          include: {
            baseUnit: true,
            allowedLabAreas: { include: { labArea: true } },
            compatibleExams: { include: { labExam: true } },
          },
        },
        batch: true,
        fridge: true,
        assignedLabArea: true,
        openedBy: {
          select: { id: true, fullName: true, username: true },
        },
        incidents: {
          where: { resolutionStatus: QuarantineResolutionStatus.PENDING },
          take: 1,
        },
      },
      orderBy: [{ expirationDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  static async getLabUnitById(id: bigint) {
    const unit = await prisma.labReagentUnit.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            baseUnit: true,
            allowedLabAreas: { include: { labArea: true } },
            compatibleExams: { include: { labExam: true } },
          },
        },
        batch: true,
        fridge: true,
        openedBy: {
          select: { id: true, fullName: true, username: true },
        },
        incidents: {
          include: {
            reportedBy: { select: { id: true, fullName: true, username: true } },
            resolvedBy: { select: { id: true, fullName: true, username: true } },
            labArea: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        movements: {
          include: {
            fromFridge: true,
            toFridge: true,
            executedBy: {
              select: { id: true, fullName: true, username: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!unit) {
      throw new Error('Frasco o unidad de laboratorio no encontrada');
    }

    return unit;
  }

  /**
   * Apertura de un frasco sellado
   */
  static async openLabUnit(unitId: bigint, openedById: number) {
    const unit = await prisma.labReagentUnit.findUnique({
      where: { id: unitId },
    });

    if (!unit) {
      throw new Error('Unidad no encontrada');
    }

    if (unit.status === LabUnitStatus.INTERNAL_QUARANTINE) {
      throw new Error(
        'No se puede abrir una unidad que se encuentra en CUARENTENA INTERNA'
      );
    }

    if (unit.status !== LabUnitStatus.SELLADO) {
      throw new Error(`No se puede abrir una unidad en estado ${unit.status}`);
    }

    return prisma.labReagentUnit.update({
      where: { id: unitId },
      data: {
        status: LabUnitStatus.EN_USO,
        openedAt: new Date(),
        openedById,
      },
      include: {
        product: true,
        openedBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });
  }

  /**
   * Consumo de determinaciones / usos clínicos.
   * Regla de negocio: si el lote está en INTERNAL_QUARANTINE, los usos quedan bloqueados.
   */
  static async consumeLabUnit(data: ConsumeLabUnitDTO) {
    if (data.amountUsed <= 0) {
      throw new Error('La cantidad consumida debe ser mayor a 0');
    }

    return prisma.$transaction(async (tx) => {
      const unit = await tx.labReagentUnit.findUnique({
        where: { id: data.unitId },
      });

      if (!unit) {
        throw new Error('Unidad no encontrada');
      }

      // Regla de blindaje de cuarentena interna
      if (unit.status === LabUnitStatus.INTERNAL_QUARANTINE) {
        throw new Error(
          'El lote/frasco se encuentra en CUARENTENA INTERNA y sus usos están bloqueados para consumo'
        );
      }

      if (unit.status === LabUnitStatus.IN_TRANSIT_TO_LAB) {
        throw new Error(
          'El lote se encuentra EN TRÁNSITO al laboratorio, pendiente de validación de cadena de frío'
        );
      }

      if (
        unit.status === LabUnitStatus.AGOTADO ||
        unit.status === LabUnitStatus.DISCARDED ||
        unit.status === LabUnitStatus.DESCARTADO
      ) {
        throw new Error(
          `No se puede consumir un reactivo en estado ${unit.status}`
        );
      }

      const availableUses =
        unit.remainingUses > 0 ? unit.remainingUses : Number(unit.currentVolume);

      if (data.amountUsed > availableUses) {
        throw new Error(
          `Usos/volumen insuficiente. Disponibles: ${availableUses}, solicitados: ${data.amountUsed}`
        );
      }

      const remainingUses = Math.max(availableUses - data.amountUsed, 0);
      const consumedUses = unit.consumedUses + data.amountUsed;
      const nextStatus =
        remainingUses === 0 ? LabUnitStatus.AGOTADO : LabUnitStatus.EN_USO;

      // Registrar movimiento de laboratorio
      await tx.labStockMovement.create({
        data: {
          labReagentUnitId: unit.id,
          movementType: LabMovementType.CONSUMO_PRUEBAS,
          amountUsed: data.amountUsed,
          fromFridgeId: unit.fridgeId,
          reason: data.reason ?? 'Consumo de rutina en laboratorio',
          executedById: data.executedById,
        },
      });

      // Actualizar la unidad reflejando el descuento de usos y volumen
      return tx.labReagentUnit.update({
        where: { id: unit.id },
        data: {
          currentVolume: remainingUses,
          remainingUses,
          consumedUses,
          status: nextStatus,
          openedAt: unit.openedAt ?? new Date(),
          openedById: unit.openedById ?? data.executedById,
        },
        include: {
          product: true,
          fridge: true,
        },
      });
    });
  }

  /**
   * Traslado de un frasco a otra nevera o cava
   */
  static async transferFridge(data: TransferLabUnitFridgeDTO) {
    return prisma.$transaction(async (tx) => {
      const unit = await tx.labReagentUnit.findUnique({
        where: { id: data.unitId },
      });

      if (!unit) {
        throw new Error('Unidad no encontrada');
      }

      if (
        unit.status === LabUnitStatus.AGOTADO ||
        unit.status === LabUnitStatus.DISCARDED ||
        unit.status === LabUnitStatus.DESCARTADO
      ) {
        throw new Error(
          `No se puede trasladar una unidad en estado ${unit.status}`
        );
      }

      if (unit.fridgeId === data.toFridgeId) {
        throw new Error('La unidad ya se encuentra en la nevera destino');
      }

      const targetFridge = await tx.fridge.findUnique({
        where: { id: data.toFridgeId },
      });
      if (!targetFridge) {
        throw new Error('Nevera destino no encontrada');
      }

      await tx.labStockMovement.create({
        data: {
          labReagentUnitId: unit.id,
          movementType: LabMovementType.TRASLADO_NEVERA,
          amountUsed: 0,
          fromFridgeId: unit.fridgeId,
          toFridgeId: data.toFridgeId,
          reason: data.reason ?? 'Reubicación de material refrigerado',
          executedById: data.executedById,
        },
      });

      return tx.labReagentUnit.update({
        where: { id: unit.id },
        data: {
          fridgeId: data.toFridgeId,
        },
        include: {
          fridge: true,
          product: true,
        },
      });
    });
  }

  /**
   * Descarte formal por vencimiento, contaminación o merma
   */
  static async discardLabUnit(data: DiscardLabUnitDTO) {
    return prisma.$transaction(async (tx) => {
      const unit = await tx.labReagentUnit.findUnique({
        where: { id: data.unitId },
      });

      if (!unit) {
        throw new Error('Unidad no encontrada');
      }

      if (
        unit.status === LabUnitStatus.DISCARDED ||
        unit.status === LabUnitStatus.DESCARTADO ||
        unit.status === LabUnitStatus.AGOTADO
      ) {
        throw new Error(`La unidad ya se encuentra en estado ${unit.status}`);
      }

      await tx.labStockMovement.create({
        data: {
          labReagentUnitId: unit.id,
          movementType: LabMovementType.DESCARTE,
          amountUsed: Number(unit.currentVolume),
          fromFridgeId: unit.fridgeId,
          reason: data.reason,
          executedById: data.executedById,
        },
      });

      return tx.labReagentUnit.update({
        where: { id: unit.id },
        data: {
          status: LabUnitStatus.DISCARDED,
          yieldVariance: -unit.remainingUses,
          remainingUses: 0,
          currentVolume: 0,
        },
        include: {
          product: true,
        },
      });
    });
  }

  // --- CUARENTENA DE DOBLE INSTANCIA (LABORATORIO) ---

  /**
   * Activación de Cuarentena Interna dentro del laboratorio:
   * El lote permanece físicamente en la nevera, pero sus remainingUses se bloquean para corridas.
   */
  static async putUnitInQuarantine(data: PutUnitInQuarantineDTO) {
    return prisma.$transaction(async (tx) => {
      const unit = await tx.labReagentUnit.findUnique({
        where: { id: data.unitId },
        include: { product: true, batch: true },
      });

      if (!unit) {
        throw new Error('Unidad de reactivo no encontrada');
      }

      if (
        unit.status === LabUnitStatus.AGOTADO ||
        unit.status === LabUnitStatus.DISCARDED ||
        unit.status === LabUnitStatus.DESCARTADO
      ) {
        throw new Error(
          `No se puede poner en cuarentena una unidad en estado ${unit.status}`
        );
      }

      if (unit.status === LabUnitStatus.INTERNAL_QUARANTINE) {
        throw new Error('La unidad ya se encuentra en cuarentena interna');
      }

      const updatedUnit = await tx.labReagentUnit.update({
        where: { id: unit.id },
        data: {
          status: LabUnitStatus.INTERNAL_QUARANTINE,
        },
        include: {
          product: true,
          fridge: true,
          batch: true,
        },
      });

      const incident = await tx.batchIncident.create({
        data: {
          batchId: unit.batchId,
          labReagentUnitId: unit.id,
          labAreaId: data.labAreaId ?? null,
          reportedById: data.reportedById,
          incidentType: IncidentType.FALLA_CONTROL_CALIDAD,
          instanceType: QuarantineInstanceType.INTERNAL_LAB,
          quarantineReason: data.quarantineReason,
          description: data.description,
          evidenceUrl: data.evidenceUrl ?? null,
          affectedQuantity: unit.currentVolume,
          affectedUses: unit.remainingUses,
          status: IncidentStatus.ABIERTA,
          resolutionStatus: QuarantineResolutionStatus.PENDING,
        },
        include: {
          reportedBy: {
            select: { id: true, fullName: true, username: true },
          },
          labArea: true,
          labReagentUnit: true,
        },
      });

      return { unit: updatedUnit, incident };
    });
  }

  /**
   * Resolución de Cuarentena por Coordinación de Laboratorio:
   * REINTEGRATED_TO_STOCK: Devuelve la unidad a SELLADO/EN_USO y desbloquea usos.
   * WRITTEN_OFF_AS_LOSS / RETURNED_TO_SUPPLIER: Pasa a DISCARDED y asienta merma.
   */
  static async resolveQuarantine(data: ResolveQuarantineDTO) {
    return prisma.$transaction(async (tx) => {
      const incident = await tx.batchIncident.findUnique({
        where: { id: data.incidentId },
        include: { labReagentUnit: true, batch: true },
      });

      if (!incident) {
        throw new Error('Incidencia de cuarentena no encontrada');
      }

      if (incident.resolutionStatus !== QuarantineResolutionStatus.PENDING) {
        throw new Error(
          `La cuarentena ya fue resuelta previamente (${incident.resolutionStatus})`
        );
      }

      let updatedUnit = null;

      if (incident.labReagentUnitId && incident.labReagentUnit) {
        const unit = incident.labReagentUnit;

        if (
          data.resolutionStatus ===
          QuarantineResolutionStatus.REINTEGRATED_TO_STOCK
        ) {
          const restoredStatus = unit.openedAt
            ? LabUnitStatus.EN_USO
            : LabUnitStatus.SELLADO;

          updatedUnit = await tx.labReagentUnit.update({
            where: { id: unit.id },
            data: {
              status: restoredStatus,
            },
            include: { product: true, fridge: true },
          });
        } else if (
          data.resolutionStatus ===
            QuarantineResolutionStatus.WRITTEN_OFF_AS_LOSS ||
          data.resolutionStatus ===
            QuarantineResolutionStatus.RETURNED_TO_SUPPLIER
        ) {
          updatedUnit = await tx.labReagentUnit.update({
            where: { id: unit.id },
            data: {
              status: LabUnitStatus.DISCARDED,
              yieldVariance: -unit.remainingUses,
              remainingUses: 0,
              currentVolume: 0,
            },
            include: { product: true, fridge: true },
          });

          await tx.labStockMovement.create({
            data: {
              labReagentUnitId: unit.id,
              movementType: LabMovementType.DESCARTE,
              amountUsed: Number(unit.currentVolume),
              fromFridgeId: unit.fridgeId,
              reason: `Resolución de cuarentena: ${data.resolutionStatus}. ${data.resolutionNotes}`,
              executedById: data.resolvedById,
            },
          });
        }
      }

      const updatedIncident = await tx.batchIncident.update({
        where: { id: incident.id },
        data: {
          status: IncidentStatus.CONFIRMADA,
          resolutionStatus: data.resolutionStatus,
          resolutionNotes: data.resolutionNotes,
          resolvedById: data.resolvedById,
          resolvedAt: new Date(),
        },
        include: {
          reportedBy: {
            select: { id: true, fullName: true, username: true },
          },
          resolvedBy: {
            select: { id: true, fullName: true, username: true },
          },
          labArea: true,
          labReagentUnit: true,
        },
      });

      return { incident: updatedIncident, unit: updatedUnit };
    });
  }

  static async listQuarantineIncidents(filter?: {
    instanceType?: QuarantineInstanceType;
    resolutionStatus?: QuarantineResolutionStatus;
    labAreaId?: number;
  }) {
    return prisma.batchIncident.findMany({
      where: {
        ...(filter?.instanceType ? { instanceType: filter.instanceType } : {}),
        ...(filter?.resolutionStatus
          ? { resolutionStatus: filter.resolutionStatus }
          : {}),
        ...(filter?.labAreaId ? { labAreaId: filter.labAreaId } : {}),
      },
      include: {
        reportedBy: { select: { id: true, fullName: true, username: true } },
        resolvedBy: { select: { id: true, fullName: true, username: true } },
        labArea: true,
        labReagentUnit: {
          include: {
            product: true,
            fridge: true,
          },
        },
        batch: {
          include: {
            product: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- CATÁLOGOS DE ÁREAS Y EXÁMENES ---

  static async listLabAreas(search?: string) {
    return prisma.labArea.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        users: {
          include: {
            user: { select: { id: true, fullName: true, username: true, email: true } },
          },
        },
        _count: {
          select: { exams: true, products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getLabAreaById(id: number) {
    const area = await prisma.labArea.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: { select: { id: true, fullName: true, username: true, email: true } },
          },
        },
        exams: true,
        products: {
          include: {
            product: { include: { baseUnit: true } },
          },
        },
      },
    });

    if (!area) {
      throw new Error('Área de laboratorio no encontrada');
    }

    return area;
  }

  static async createLabArea(data: CreateLabAreaDTO) {
    return prisma.labArea.create({
      data: {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        description: data.description ?? null,
      },
    });
  }

  static async updateLabArea(id: number, data: UpdateLabAreaDTO) {
    return prisma.labArea.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  static async assignUsersToLabArea(labAreaId: number, userIds: number[]) {
    return prisma.$transaction(async (tx) => {
      const area = await tx.labArea.findUnique({ where: { id: labAreaId } });
      if (!area) throw new Error('Área de laboratorio no encontrada');

      await tx.userLabArea.deleteMany({ where: { labAreaId } });

      if (userIds.length > 0) {
        await tx.userLabArea.createMany({
          data: userIds.map((userId) => ({
            labAreaId,
            userId,
          })),
        });
      }

      return tx.labArea.findUnique({
        where: { id: labAreaId },
        include: {
          users: {
            include: {
              user: { select: { id: true, fullName: true, username: true } },
            },
          },
        },
      });
    });
  }

  static async getUserLabAreas(userId: number) {
    return prisma.userLabArea.findMany({
      where: { userId },
      include: {
        labArea: true,
      },
    });
  }

  static async listLabExams(filter?: {
    areaId?: number;
    search?: string;
    userAreaIds?: number[] | null;
  }) {
    if (
      filter?.userAreaIds !== undefined &&
      filter?.userAreaIds !== null &&
      filter.userAreaIds.length === 0
    ) {
      return [];
    }

    if (
      filter?.userAreaIds !== undefined &&
      filter?.userAreaIds !== null &&
      filter?.areaId &&
      !filter.userAreaIds.includes(filter.areaId)
    ) {
      return [];
    }

    return prisma.labExam.findMany({
      where: {
        ...(filter?.userAreaIds !== undefined && filter?.userAreaIds !== null
          ? {
              areaId: filter?.areaId ? filter.areaId : { in: filter.userAreaIds },
            }
          : filter?.areaId
          ? { areaId: filter.areaId }
          : {}),
        ...(filter?.search
          ? {
              OR: [
                { name: { contains: filter.search, mode: 'insensitive' } },
                { code: { contains: filter.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        area: true,
        compatibleProducts: {
          include: {
            product: { include: { baseUnit: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getLabExamById(id: number) {
    const exam = await prisma.labExam.findUnique({
      where: { id },
      include: {
        area: true,
        compatibleProducts: {
          include: {
            product: { include: { baseUnit: true } },
          },
        },
      },
    });

    if (!exam) {
      throw new Error('Examen de laboratorio no encontrado');
    }

    return exam;
  }

  static async createLabExam(data: CreateLabExamDTO) {
    return prisma.$transaction(async (tx) => {
      const exam = await tx.labExam.create({
        data: {
          code: data.code.trim().toUpperCase(),
          name: data.name.trim(),
          description: data.description ?? null,
          areaId: data.areaId ?? null,
        },
      });

      if (data.compatibleProductIds && data.compatibleProductIds.length > 0) {
        await tx.labExamProduct.createMany({
          data: data.compatibleProductIds.map((productId) => ({
            labExamId: exam.id,
            productId: BigInt(productId),
          })),
        });
      }

      return tx.labExam.findUnique({
        where: { id: exam.id },
        include: {
          area: true,
          compatibleProducts: {
            include: { product: true },
          },
        },
      });
    });
  }

  static async updateLabExam(id: number, data: UpdateLabExamDTO) {
    return prisma.$transaction(async (tx) => {
      await tx.labExam.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.areaId !== undefined ? { areaId: data.areaId } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });

      if (data.compatibleProductIds !== undefined) {
        await tx.labExamProduct.deleteMany({ where: { labExamId: id } });
        if (data.compatibleProductIds.length > 0) {
          await tx.labExamProduct.createMany({
            data: data.compatibleProductIds.map((prodId) => ({
              labExamId: id,
              productId: BigInt(prodId),
            })),
          });
        }
      }

      return tx.labExam.findUnique({
        where: { id },
        include: {
          area: true,
          compatibleProducts: {
            include: { product: true },
          },
        },
      });
    });
  }

  static async createLabUnit(data: CreateLabUnitDTO) {
    return prisma.labReagentUnit.create({
      data: {
        productId: data.productId,
        batchId: data.batchId,
        fridgeId: data.fridgeId,
        unitCode: data.unitCode.trim(),
        initialVolume: data.initialVolume,
        currentVolume: data.initialVolume,
        status: data.status ?? LabUnitStatus.SELLADO,
        expirationDate: data.expirationDate ?? null,
        openedById: data.openedById ?? null,
        ownershipType: data.ownershipType ?? StockOwnership.CLINICAL_ROUTINE,
        researchProjectId: data.researchProjectId ?? null,
        initialTheoreticalUses: data.initialTheoreticalUses ?? data.initialVolume,
        remainingUses: data.initialTheoreticalUses ?? data.initialVolume,
        consumedUses: 0,
        yieldVariance: 0,
        unitCostPerUse: data.unitCostPerUse ?? 0,
        referenceCostPerUse: data.referenceCostPerUse ?? null,
      },
      include: {
        product: true,
        fridge: true,
        batch: true,
      },
    });
  }

  // ==========================================
  // 14. SOLICITUDES INTERNAS DE REACTIVOS (FASE 2)
  // ==========================================

  static async createInternalRequest(data: CreateInternalRequestDTO) {
    if (!data.items || data.items.length === 0) {
      throw new Error('La solicitud debe contener al menos un producto o reactivo');
    }

    return prisma.$transaction(async (tx) => {
      const area = await tx.labArea.findUnique({
        where: { id: data.labAreaId },
      });
      if (!area || !area.isActive) {
        throw new Error('El área de laboratorio no existe o está inactiva');
      }

      const count = await tx.labInternalRequest.count();
      const code = `REQ-LAB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}-${Date.now().toString().slice(-4)}`;

      return tx.labInternalRequest.create({
        data: {
          code,
          labAreaId: data.labAreaId,
          requestedById: data.requestedById,
          status: LabInternalRequestStatus.PENDING,
          justification: data.justification.trim(),
          items: {
            create: data.items.map((item) => ({
              productId: BigInt(item.productId),
              requestedUsesOrUnits: item.requestedUsesOrUnits,
            })),
          },
        },
        include: {
          labArea: true,
          requestedBy: {
            select: { id: true, fullName: true, username: true, department: true },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  theoreticalYield: true,
                  baseUnit: { select: { abbreviation: true } },
                },
              },
            },
          },
        },
      });
    });
  }

  static async listInternalRequests(filter?: {
    labAreaId?: number;
    status?: LabInternalRequestStatus;
    search?: string;
    userAreaIds?: number[] | null;
  }) {
    if (
      filter?.userAreaIds !== undefined &&
      filter?.userAreaIds !== null &&
      filter.userAreaIds.length === 0
    ) {
      return [];
    }

    if (
      filter?.userAreaIds !== undefined &&
      filter?.userAreaIds !== null &&
      filter?.labAreaId &&
      !filter.userAreaIds.includes(filter.labAreaId)
    ) {
      return [];
    }

    return prisma.labInternalRequest.findMany({
      where: {
        ...(filter?.userAreaIds !== undefined && filter?.userAreaIds !== null
          ? {
              labAreaId: filter?.labAreaId
                ? filter.labAreaId
                : { in: filter.userAreaIds },
            }
          : filter?.labAreaId
          ? { labAreaId: filter.labAreaId }
          : {}),
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.search
          ? {
              OR: [
                { code: { contains: filter.search, mode: 'insensitive' } },
                { justification: { contains: filter.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        labArea: true,
        requestedBy: {
          select: { id: true, fullName: true, username: true, department: true },
        },
        reviewedBy: {
          select: { id: true, fullName: true, username: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                theoreticalYield: true,
                baseUnit: { select: { abbreviation: true } },
              },
            },
            assignedLabUnit: {
              include: {
                fridge: true,
                batch: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getInternalRequestById(id: number, userAreaIds?: number[] | null) {
    const request = await prisma.labInternalRequest.findUnique({
      where: { id },
      include: {
        labArea: true,
        requestedBy: {
          select: { id: true, fullName: true, username: true, department: true },
        },
        reviewedBy: {
          select: { id: true, fullName: true, username: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                theoreticalYield: true,
                baseUnit: { select: { abbreviation: true } },
              },
            },
            assignedLabUnit: {
              include: {
                fridge: true,
                batch: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw new Error('Solicitud interna de laboratorio no encontrada');
    }

    if (
      userAreaIds !== undefined &&
      userAreaIds !== null &&
      !userAreaIds.includes(request.labAreaId)
    ) {
      throw new Error('Acceso denegado a esta solicitud de laboratorio');
    }

    return request;
  }

  static async suggestFefoForRequest(requestId: number) {
    const request = await prisma.labInternalRequest.findUnique({
      where: { id: requestId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!request) {
      throw new Error('Solicitud interna de laboratorio no encontrada');
    }

    const suggestions = [];

    for (const item of request.items) {
      // Candidatos disponibles en stock clínico
      const candidateUnits = await prisma.labReagentUnit.findMany({
        where: {
          productId: item.productId,
          ownershipType: StockOwnership.CLINICAL_ROUTINE,
          status: {
            in: [LabUnitStatus.EN_USO, LabUnitStatus.SELLADO],
          },
          remainingUses: { gt: 0 },
        },
        include: {
          fridge: true,
          batch: true,
        },
        orderBy: [{ expirationDate: 'asc' }, { createdAt: 'asc' }],
      });

      // Micro-ajuste 3: Prioridad en sugerencia FEFO
      // 1. Unidades ya EN_USO asignadas a esa misma labAreaId con saldo suficiente
      let suggestedUnit = candidateUnits.find(
        (u) =>
          u.status === LabUnitStatus.EN_USO &&
          u.assignedLabAreaId === request.labAreaId &&
          u.remainingUses >= item.requestedUsesOrUnits
      );

      // 2. Unidades en SELLADO ordenadas por vencimiento FEFO (expirationDate asc)
      if (!suggestedUnit) {
        suggestedUnit = candidateUnits.find(
          (u) => u.status === LabUnitStatus.SELLADO
        );
      }

      // 3. Cualquier otra unidad disponible (ej. EN_USO con saldo parcial o sin área fija)
      if (!suggestedUnit && candidateUnits.length > 0) {
        suggestedUnit = candidateUnits[0];
      }

      suggestions.push({
        itemId: item.id,
        productId: item.productId,
        productName: item.product.name,
        requestedUsesOrUnits: item.requestedUsesOrUnits,
        suggestedUnit: suggestedUnit ?? null,
      });
    }

    return {
      requestId: request.id,
      requestCode: request.code,
      labAreaId: request.labAreaId,
      suggestions,
    };
  }

  static async approveInternalRequest(
    requestId: number,
    data: ApproveInternalRequestDTO
  ) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.labInternalRequest.findUnique({
        where: { id: requestId },
        include: { items: true },
      });

      if (!request) {
        throw new Error('Solicitud interna no encontrada');
      }

      if (request.status !== LabInternalRequestStatus.PENDING) {
        throw new Error('Solo se pueden aprobar solicitudes en estado PENDING');
      }

      if (data.itemAssignments && data.itemAssignments.length > 0) {
        for (const assignment of data.itemAssignments) {
          const unitId = BigInt(assignment.assignedLabUnitId);
          const unit = await tx.labReagentUnit.findUnique({
            where: { id: unitId },
          });

          if (!unit) {
            throw new Error(`Unidad ${assignment.assignedLabUnitId} no encontrada`);
          }

          if (unit.ownershipType === StockOwnership.RESEARCH_PROJECT) {
            throw new Error(
              `La unidad ${unit.unitCode} pertenece a un proyecto de investigación y no puede asignarse a rutina clínica`
            );
          }

          const blockedStatuses: LabUnitStatus[] = [
            LabUnitStatus.AGOTADO,
            LabUnitStatus.DISCARDED,
            LabUnitStatus.DESCARTADO,
            LabUnitStatus.INTERNAL_QUARANTINE,
            LabUnitStatus.IN_TRANSIT_TO_LAB,
          ];
          if (blockedStatuses.includes(unit.status)) {
            throw new Error(
              `La unidad ${unit.unitCode} no está disponible (estado: ${unit.status})`
            );
          }

          await tx.labInternalRequestItem.update({
            where: { id: assignment.itemId },
            data: {
              assignedLabUnitId: unitId,
            },
          });

          await tx.labReagentUnit.update({
            where: { id: unitId },
            data: {
              assignedLabAreaId: request.labAreaId,
              ...(unit.status === LabUnitStatus.SELLADO
                ? {
                    status: LabUnitStatus.EN_USO,
                    openedById: data.reviewedById,
                    openedAt: new Date(),
                  }
                : {}),
            },
          });
        }
      }

      return tx.labInternalRequest.update({
        where: { id: requestId },
        data: {
          status: LabInternalRequestStatus.APPROVED,
          reviewedById: data.reviewedById,
          reviewNotes: data.reviewNotes?.trim() ?? null,
          resolvedAt: new Date(),
        },
        include: {
          labArea: true,
          requestedBy: {
            select: { id: true, fullName: true, username: true },
          },
          reviewedBy: {
            select: { id: true, fullName: true, username: true },
          },
          items: {
            include: {
              product: true,
              assignedLabUnit: {
                include: { fridge: true, batch: true },
              },
            },
          },
        },
      });
    });
  }

  static async deliverInternalRequest(requestId: number, deliveredById: number) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.labInternalRequest.findUnique({
        where: { id: requestId },
        include: { items: true },
      });

      if (!request) {
        throw new Error('Solicitud interna no encontrada');
      }

      if (
        request.status !== LabInternalRequestStatus.APPROVED &&
        request.status !== LabInternalRequestStatus.PENDING
      ) {
        throw new Error(
          'Solo se pueden entregar solicitudes en estado PENDING o APPROVED'
        );
      }

      for (const item of request.items) {
        if (item.assignedLabUnitId) {
          const unit = await tx.labReagentUnit.findUnique({
            where: { id: item.assignedLabUnitId },
          });
          if (unit) {
            await tx.labReagentUnit.update({
              where: { id: item.assignedLabUnitId },
              data: {
                assignedLabAreaId: request.labAreaId,
                ...(unit.status === LabUnitStatus.SELLADO
                  ? {
                      status: LabUnitStatus.EN_USO,
                      openedById: deliveredById,
                      openedAt: new Date(),
                    }
                  : {}),
              },
            });
          }
        }
      }

      return tx.labInternalRequest.update({
        where: { id: requestId },
        data: {
          status: LabInternalRequestStatus.DELIVERED,
          resolvedAt: new Date(),
        },
        include: {
          labArea: true,
          requestedBy: {
            select: { id: true, fullName: true, username: true },
          },
          reviewedBy: {
            select: { id: true, fullName: true, username: true },
          },
          items: {
            include: {
              product: true,
              assignedLabUnit: {
                include: { fridge: true, batch: true },
              },
            },
          },
        },
      });
    });
  }

  static async rejectInternalRequest(
    requestId: number,
    data: { reviewedById: number; reviewNotes: string }
  ) {
    const request = await prisma.labInternalRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Solicitud interna no encontrada');
    }

    if (request.status !== LabInternalRequestStatus.PENDING) {
      throw new Error('Solo se pueden rechazar solicitudes en estado PENDING');
    }

    return prisma.labInternalRequest.update({
      where: { id: requestId },
      data: {
        status: LabInternalRequestStatus.REJECTED,
        reviewedById: data.reviewedById,
        reviewNotes: data.reviewNotes.trim(),
        resolvedAt: new Date(),
      },
      include: {
        labArea: true,
        requestedBy: {
          select: { id: true, fullName: true, username: true },
        },
        reviewedBy: {
          select: { id: true, fullName: true, username: true },
        },
        items: {
          include: { product: true },
        },
      },
    });
  }

  // ==========================================
  // 15. MOTOR DE CORRIDAS SEMANALES Y AUDITORÍA 5D (FASE 2)
  // ==========================================

  static async createWeeklyRun(data: CreateWeeklyRunDTO) {
    const count = await prisma.labWeeklyRun.count();
    const code = `RUN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}-${Date.now().toString().slice(-4)}`;

    return prisma.labWeeklyRun.create({
      data: {
        code,
        labAreaId: data.labAreaId,
        labExamId: data.labExamId,
        bioanalystId: data.bioanalystId,
        weekStartDate: new Date(data.weekStartDate),
        weekEndDate: new Date(data.weekEndDate),
        status: LabWeeklyRunStatus.OPEN_ACCUMULATING,
        notes: data.notes?.trim() ?? null,
      },
      include: {
        labArea: true,
        labExam: true,
        bioanalyst: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });
  }

  static async listWeeklyRuns(filter?: {
    labAreaId?: number;
    labExamId?: number;
    status?: LabWeeklyRunStatus;
    search?: string;
    userAreaIds?: number[] | null;
  }) {
    if (
      filter?.userAreaIds !== undefined &&
      filter?.userAreaIds !== null &&
      filter.userAreaIds.length === 0
    ) {
      return [];
    }

    if (
      filter?.userAreaIds !== undefined &&
      filter?.userAreaIds !== null &&
      filter?.labAreaId &&
      !filter.userAreaIds.includes(filter.labAreaId)
    ) {
      return [];
    }

    return prisma.labWeeklyRun.findMany({
      where: {
        ...(filter?.userAreaIds !== undefined && filter?.userAreaIds !== null
          ? {
              labAreaId: filter?.labAreaId
                ? filter.labAreaId
                : { in: filter.userAreaIds },
            }
          : filter?.labAreaId
          ? { labAreaId: filter.labAreaId }
          : {}),
        ...(filter?.labExamId ? { labExamId: filter.labExamId } : {}),
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.search
          ? {
              OR: [
                { code: { contains: filter.search, mode: 'insensitive' } },
                { notes: { contains: filter.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        labArea: true,
        labExam: true,
        bioanalyst: {
          select: { id: true, fullName: true, username: true },
        },
        consumptions: {
          include: {
            labReagentUnit: {
              include: { product: true },
            },
            externalCalibratorUnit: {
              include: { product: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getWeeklyRunById(id: number, userAreaIds?: number[] | null) {
    const run = await prisma.labWeeklyRun.findUnique({
      where: { id },
      include: {
        labArea: true,
        labExam: true,
        bioanalyst: {
          select: { id: true, fullName: true, username: true },
        },
        consumptions: {
          include: {
            labReagentUnit: {
              include: { product: true, batch: true },
            },
            externalCalibratorUnit: {
              include: { product: true, batch: true },
            },
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!run) {
      throw new Error('Corrida semanal no encontrada');
    }

    if (
      userAreaIds !== undefined &&
      userAreaIds !== null &&
      !userAreaIds.includes(run.labAreaId)
    ) {
      throw new Error('Acceso denegado a esta corrida semanal');
    }

    return run;
  }

  static async closeWeeklyRun(data: CloseWeeklyRunDTO) {
    if (!data.consumptions || data.consumptions.length === 0) {
      throw new Error('La corrida debe tener al menos un reactivo o consumo registrado');
    }

    return prisma.$transaction(async (tx) => {
      const run = await tx.labWeeklyRun.findUnique({
        where: { id: data.runId },
        include: { labArea: true, labExam: true },
      });

      if (!run) {
        throw new Error('Corrida semanal no encontrada');
      }

      if (run.status !== LabWeeklyRunStatus.OPEN_ACCUMULATING) {
        throw new Error('Solo se pueden cerrar corridas en estado OPEN_ACCUMULATING');
      }

      let totalRunCost = new Prisma.Decimal(0);
      const auditLogsToCreate: Prisma.LabConsumptionAuditLogCreateManyInput[] = [];

      for (const item of data.consumptions) {
        const primaryUnitId = BigInt(item.labReagentUnitId);
        const primaryUnit = await tx.labReagentUnit.findUnique({
          where: { id: primaryUnitId },
          include: { product: true, batch: true },
        });

        if (!primaryUnit) {
          throw new Error(`Unidad de reactivo principal ${item.labReagentUnitId} no encontrada`);
        }

        if (primaryUnit.ownershipType === StockOwnership.RESEARCH_PROJECT) {
          throw new Error(
            `La unidad ${primaryUnit.unitCode} es de investigación y no puede consumirse en rutina clínica`
          );
        }

        const blockedStatuses: LabUnitStatus[] = [
          LabUnitStatus.AGOTADO,
          LabUnitStatus.DISCARDED,
          LabUnitStatus.DESCARTADO,
          LabUnitStatus.INTERNAL_QUARANTINE,
          LabUnitStatus.IN_TRANSIT_TO_LAB,
        ];
        if (blockedStatuses.includes(primaryUnit.status)) {
          throw new Error(
            `La unidad principal ${primaryUnit.unitCode} está bloqueada (estado: ${primaryUnit.status})`
          );
        }

        const patientUses = Math.max(0, item.patientUses || 0);
        const repeatUses = Math.max(0, item.repeatUses || 0);
        const calibratorUses = Math.max(0, item.calibratorUses || 0);
        const controlUses = Math.max(0, item.controlUses || 0);
        const wasteUses = Math.max(0, item.wasteUses || 0);

        const totalDeductedUses =
          patientUses + repeatUses + calibratorUses + controlUses + wasteUses;

        if (totalDeductedUses <= 0) {
          throw new Error('Cada reactivo consumido debe descontar al menos 1 uso');
        }

        let calibratorUnit = null;
        let calibratorUnitLineCost = new Prisma.Decimal(0);

        if (item.externalCalibratorUnitId) {
          const calUnitId = BigInt(item.externalCalibratorUnitId);
          calibratorUnit = await tx.labReagentUnit.findUnique({
            where: { id: calUnitId },
            include: { product: true, batch: true },
          });

          if (!calibratorUnit) {
            throw new Error(
              `Unidad de calibrador externo ${item.externalCalibratorUnitId} no encontrada`
            );
          }

          if (calibratorUnit.ownershipType === StockOwnership.RESEARCH_PROJECT) {
            throw new Error(
              `El calibrador ${calibratorUnit.unitCode} es de investigación y no puede usarse en rutina clínica`
            );
          }

          if (blockedStatuses.includes(calibratorUnit.status)) {
            throw new Error(
              `El calibrador ${calibratorUnit.unitCode} está bloqueado (estado: ${calibratorUnit.status})`
            );
          }

          calibratorUnitLineCost = new Prisma.Decimal(calibratorUses).mul(
            calibratorUnit.unitCostPerUse
          );
        }

        const primaryKitLineCost = new Prisma.Decimal(totalDeductedUses).mul(
          primaryUnit.unitCostPerUse
        );
        const lineCalculatedCost = primaryKitLineCost.add(calibratorUnitLineCost);
        totalRunCost = totalRunCost.add(lineCalculatedCost);

        // Conciliación física al vuelo para el Kit Principal
        const primaryCurrentRem = primaryUnit.remainingUses;
        const primaryExpectedRem = primaryCurrentRem - totalDeductedUses;
        let primaryNewRem = primaryExpectedRem;
        let primaryVarianceDelta = 0;
        let primaryNewStatus: LabUnitStatus =
          primaryUnit.status === LabUnitStatus.SELLADO
            ? LabUnitStatus.EN_USO
            : primaryUnit.status;

        if (primaryExpectedRem < 0) {
          // Rendimiento superior al teórico (Over-yield)
          const extraYield = Math.abs(primaryExpectedRem);
          primaryVarianceDelta += extraYield;
          primaryNewRem = 0;
          primaryNewStatus = LabUnitStatus.AGOTADO;

          auditLogsToCreate.push({
            userId: data.bioanalystId,
            labAreaId: run.labAreaId,
            researchTrialId: null,
            labExamId: run.labExamId,
            weeklyRunId: run.id,
            labReagentUnitId: primaryUnit.id,
            concept: ConsumptionConcept.YIELD_SURPLUS,
            usesCount: extraYield,
            costImpact: new Prisma.Decimal(0),
            notes: `Rendimiento superior al teórico (+${extraYield} usos extra en corrida ${run.code})`,
          });
        } else if (item.isPrimaryKitDepleted === true) {
          // Agotamiento físico prematuro (Sub-yield / déficit)
          const missingYield = -primaryExpectedRem;
          primaryVarianceDelta += missingYield;
          primaryNewRem = 0;
          primaryNewStatus = LabUnitStatus.AGOTADO;

          if (missingYield !== 0) {
            auditLogsToCreate.push({
              userId: data.bioanalystId,
              labAreaId: run.labAreaId,
              researchTrialId: null,
              labExamId: run.labExamId,
              weeklyRunId: run.id,
              labReagentUnitId: primaryUnit.id,
              concept: ConsumptionConcept.YIELD_DEFICIT,
              usesCount: missingYield,
              costImpact: new Prisma.Decimal(missingYield).mul(primaryUnit.unitCostPerUse),
              notes: `Agotamiento físico prematuro de kit (${missingYield} usos no rendidos)`,
            });
          }
        } else if (
          item.primaryKitPhysicalRemainingUses !== undefined &&
          item.primaryKitPhysicalRemainingUses !== null
        ) {
          const physicalRem = Number(item.primaryKitPhysicalRemainingUses);
          const diff = physicalRem - primaryExpectedRem;
          primaryVarianceDelta += diff;
          primaryNewRem = physicalRem;
          primaryNewStatus =
            physicalRem === 0 ? LabUnitStatus.AGOTADO : primaryNewStatus;

          if (diff !== 0) {
            auditLogsToCreate.push({
              userId: data.bioanalystId,
              labAreaId: run.labAreaId,
              researchTrialId: null,
              labExamId: run.labExamId,
              weeklyRunId: run.id,
              labReagentUnitId: primaryUnit.id,
              concept:
                diff > 0
                  ? ConsumptionConcept.YIELD_SURPLUS
                  : ConsumptionConcept.YIELD_DEFICIT,
              usesCount: diff,
              costImpact: new Prisma.Decimal(diff).mul(primaryUnit.unitCostPerUse),
              notes: `Conciliación física de saldo restante (${diff > 0 ? '+' : ''}${diff} usos)`,
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
            reason: `Corrida semanal ${run.code}: ${totalDeductedUses} usos deducidos`,
            executedById: data.bioanalystId,
          },
        });

        // Conciliación física para el Calibrador Externo (Micro-ajuste 2)
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
              userId: data.bioanalystId,
              labAreaId: run.labAreaId,
              researchTrialId: null,
              labExamId: run.labExamId,
              weeklyRunId: run.id,
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
                userId: data.bioanalystId,
                labAreaId: run.labAreaId,
                researchTrialId: null,
                labExamId: run.labExamId,
                weeklyRunId: run.id,
                labReagentUnitId: calibratorUnit.id,
                concept: ConsumptionConcept.YIELD_DEFICIT,
                usesCount: missing,
                costImpact: new Prisma.Decimal(missing).mul(calibratorUnit.unitCostPerUse),
                notes: `Agotamiento físico prematuro de calibrador (${missing} usos)`,
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
            calNewStatus =
              calPhys === 0 ? LabUnitStatus.AGOTADO : calNewStatus;

            if (diff !== 0) {
              auditLogsToCreate.push({
                userId: data.bioanalystId,
                labAreaId: run.labAreaId,
                researchTrialId: null,
                labExamId: run.labExamId,
                weeklyRunId: run.id,
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
              reason: `Corrida semanal ${run.code}: ${calibratorUses} usos deducidos de vial calibrador`,
              executedById: data.bioanalystId,
            },
          });

          auditLogsToCreate.push({
            userId: data.bioanalystId,
            labAreaId: run.labAreaId,
            researchTrialId: null,
            labExamId: run.labExamId,
            weeklyRunId: run.id,
            labReagentUnitId: calibratorUnit.id,
            concept: ConsumptionConcept.CALIBRATION,
            usesCount: calibratorUses,
            costImpact: calibratorUnitLineCost,
            notes: item.calibratorNotes
              ? `Vial calibrador externo: ${item.calibratorNotes}`
              : 'Consumo de vial calibrador externo',
          });
        }

        await tx.labRunConsumption.create({
          data: {
            runId: run.id,
            labReagentUnitId: primaryUnit.id,
            externalCalibratorUnitId: calibratorUnit?.id ?? null,
            patientUses,
            repeatUses,
            repeatReason: item.repeatReason ?? null,
            calibratorUses,
            calibratorNotes: item.calibratorNotes?.trim() ?? null,
            controlUses,
            wasteUses,
            totalDeductedUses,
            calculatedCost: lineCalculatedCost,
          },
        });

        // Auditoría 5D para el kit principal
        if (patientUses > 0) {
          auditLogsToCreate.push({
            userId: data.bioanalystId,
            labAreaId: run.labAreaId,
            researchTrialId: null,
            labExamId: run.labExamId,
            weeklyRunId: run.id,
            labReagentUnitId: primaryUnit.id,
            concept: ConsumptionConcept.PATIENT,
            usesCount: patientUses,
            costImpact: new Prisma.Decimal(patientUses).mul(primaryUnit.unitCostPerUse),
            notes: `Exámenes válidos de pacientes en corrida ${run.code}`,
          });
        }

        if (repeatUses > 0) {
          auditLogsToCreate.push({
            userId: data.bioanalystId,
            labAreaId: run.labAreaId,
            researchTrialId: null,
            labExamId: run.labExamId,
            weeklyRunId: run.id,
            labReagentUnitId: primaryUnit.id,
            concept: ConsumptionConcept.REPEAT,
            usesCount: repeatUses,
            costImpact: new Prisma.Decimal(repeatUses).mul(primaryUnit.unitCostPerUse),
            notes: item.repeatReason
              ? `[${item.repeatReason}] ${item.repeatNotes?.trim() || ''}`
              : item.repeatNotes?.trim() || 'Repetición técnica',
          });
        }

        if (calibratorUses > 0) {
          auditLogsToCreate.push({
            userId: data.bioanalystId,
            labAreaId: run.labAreaId,
            researchTrialId: null,
            labExamId: run.labExamId,
            weeklyRunId: run.id,
            labReagentUnitId: primaryUnit.id,
            concept: ConsumptionConcept.CALIBRATION,
            usesCount: calibratorUses,
            costImpact: new Prisma.Decimal(calibratorUses).mul(primaryUnit.unitCostPerUse),
            notes: item.calibratorNotes
              ? `Pozo/reacción en placa principal: ${item.calibratorNotes}`
              : 'Pozos/reacciones de calibrador en placa principal',
          });
        }

        if (controlUses > 0) {
          auditLogsToCreate.push({
            userId: data.bioanalystId,
            labAreaId: run.labAreaId,
            researchTrialId: null,
            labExamId: run.labExamId,
            weeklyRunId: run.id,
            labReagentUnitId: primaryUnit.id,
            concept: ConsumptionConcept.CONTROL,
            usesCount: controlUses,
            costImpact: new Prisma.Decimal(controlUses).mul(primaryUnit.unitCostPerUse),
            notes: 'Controles de calidad (positivo/negativo)',
          });
        }

        if (wasteUses > 0) {
          auditLogsToCreate.push({
            userId: data.bioanalystId,
            labAreaId: run.labAreaId,
            researchTrialId: null,
            labExamId: run.labExamId,
            weeklyRunId: run.id,
            labReagentUnitId: primaryUnit.id,
            concept: ConsumptionConcept.WASTE,
            usesCount: wasteUses,
            costImpact: new Prisma.Decimal(wasteUses).mul(primaryUnit.unitCostPerUse),
            notes: 'Desperdicio técnico / purga / cebado',
          });
        }
      }

      const totalValidPatients = Math.max(0, data.totalValidPatientExams);
      const effectiveCostPerExam =
        totalValidPatients > 0
          ? totalRunCost.div(totalValidPatients)
          : new Prisma.Decimal(0);

      const closedRun = await tx.labWeeklyRun.update({
        where: { id: data.runId },
        data: {
          status: LabWeeklyRunStatus.CLOSED_RECONCILED,
          totalValidPatientExams: totalValidPatients,
          totalRunCost,
          effectiveCostPerExam,
          notes: data.notes?.trim() ?? run.notes,
          closedAt: new Date(),
        },
        include: {
          labArea: true,
          labExam: true,
          bioanalyst: {
            select: { id: true, fullName: true, username: true },
          },
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

      return closedRun;
    });
  }

  // ==========================================
  // 16. AUDITORÍA INMUTABLE DE 5 DIMENSIONES (FASE 2)
  // ==========================================

  static async listConsumptionAuditLogs(filter?: FilterConsumptionAuditLogDTO) {
    if (
      filter?.userAreaIds !== undefined &&
      filter?.userAreaIds !== null &&
      filter.userAreaIds.length === 0
    ) {
      return [];
    }

    if (
      filter?.userAreaIds !== undefined &&
      filter?.userAreaIds !== null &&
      filter?.labAreaId &&
      !filter.userAreaIds.includes(filter.labAreaId)
    ) {
      return [];
    }

    const areaFilter =
      filter?.userAreaIds !== undefined && filter?.userAreaIds !== null
        ? {
            OR: [
              {
                labAreaId: filter?.labAreaId
                  ? filter.labAreaId
                  : { in: filter.userAreaIds },
              },
              { labAreaId: null },
            ],
          }
        : filter?.labAreaId
        ? { labAreaId: filter.labAreaId }
        : {};

    const dateFilter =
      filter?.startDate || filter?.endDate
        ? {
            createdAt: {
              ...(filter.startDate ? { gte: new Date(filter.startDate) } : {}),
              ...(filter.endDate ? { lte: new Date(filter.endDate) } : {}),
            },
          }
        : {};

    return prisma.labConsumptionAuditLog.findMany({
      where: {
        ...areaFilter,
        ...dateFilter,
        ...(filter?.labExamId ? { labExamId: filter.labExamId } : {}),
        ...(filter?.weeklyRunId ? { weeklyRunId: filter.weeklyRunId } : {}),
        ...(filter?.concept ? { concept: filter.concept } : {}),
        ...(filter?.labReagentUnitId
          ? { labReagentUnitId: BigInt(filter.labReagentUnitId) }
          : {}),
      },
      include: {
        user: {
          select: { id: true, fullName: true, username: true, department: true },
        },
        labArea: true,
        labExam: true,
        weeklyRun: {
          select: { id: true, code: true, status: true },
        },
        labReagentUnit: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            batch: { select: { id: true, lotNumber: true, expirationDate: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
