import { prisma } from '../config/prisma.js';
import { PurchaseRequisitionStatus, Prisma } from '@prisma/client';
import { OrderService } from './order.service.js';

export interface CreatePurchaseRequisitionItemDTO {
  productId: bigint;
  unitId: number;
  quantityRequested: number;
  estimatedPrice?: number | null;
}

export interface CreatePurchaseRequisitionDTO {
  departmentId?: number;
  departmentSection?: string;
  justification: string;
  notes?: string | null;
  createdById: number;
  items: CreatePurchaseRequisitionItemDTO[];
}

export interface ConvertRequisitionItemDTO {
  itemId?: bigint;
  productId: bigint;
  unitId: number;
  quantityOrdered: number;
  unitPrice: number;
  isExempt?: boolean;
}

export interface ConvertRequisitionToOrderDTO {
  supplierId: number;
  currencyId?: number;
  currency?: string;
  exchangeRate?: number;
  notes?: string | null;
  createdById: number;
  items: ConvertRequisitionItemDTO[];
}

export class PurchaseRequisitionService {
  static async listRequisitions(filter?: {
    status?: PurchaseRequisitionStatus;
    search?: string;
  }) {
    const whereClause: Prisma.PurchaseRequisitionWhereInput = {
      ...(filter?.status &&
      Object.values(PurchaseRequisitionStatus).includes(filter.status)
        ? { status: filter.status }
        : {}),
      ...(filter?.search
        ? {
            OR: [
              {
                requisitionNumber: {
                  contains: filter.search,
                  mode: 'insensitive',
                },
              },
              {
                departmentSection: {
                  contains: filter.search,
                  mode: 'insensitive',
                },
              },
              {
                justification: {
                  contains: filter.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    return prisma.purchaseRequisition.findMany({
      where: whereClause,
      include: {
        department: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                baseUnit: true,
                purchaseUnit: true,
              },
            },
            unit: true,
          },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmountUsd: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getRequisitionById(id: bigint) {
    const requisition = await prisma.purchaseRequisition.findUnique({
      where: { id },
      include: {
        department: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                baseUnit: true,
                purchaseUnit: true,
              },
            },
            unit: true,
          },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmountUsd: true,
            createdAt: true,
          },
        },
      },
    });

    if (!requisition) {
      throw new Error('Preorden de compra no encontrada');
    }

    return requisition;
  }

  static async createRequisition(data: CreatePurchaseRequisitionDTO) {
    if (!data.items || data.items.length === 0) {
      throw new Error('La preorden debe incluir al menos un ítem');
    }

    return prisma.$transaction(async (tx) => {
      const currentYear = new Date().getFullYear();
      const latest = await tx.purchaseRequisition.findFirst({
        where: { requisitionNumber: { startsWith: `PRE-${currentYear}-` } },
        orderBy: { requisitionNumber: 'desc' },
      });

      let nextSeq = 1;
      if (latest) {
        const parts = latest.requisitionNumber.split('-');
        const seqStr = parts[2];
        const seq = seqStr ? parseInt(seqStr, 10) : NaN;
        if (!isNaN(seq)) nextSeq = seq + 1;
      }

      const requisitionNumber = `PRE-${currentYear}-${String(nextSeq).padStart(4, '0')}`;

      let departmentId = data.departmentId;
      let departmentSection = data.departmentSection?.trim() || '';

      if (departmentId) {
        const dep = await tx.department.findUnique({
          where: { id: departmentId },
        });
        if (!dep) {
          throw new Error(`Departamento con ID ${departmentId} no existe`);
        }
        if (!departmentSection) {
          departmentSection = dep.name;
        }
      } else {
        if (departmentSection) {
          const found = await tx.department.findFirst({
            where: {
              OR: [
                { name: { equals: departmentSection, mode: 'insensitive' } },
                { code: { equals: departmentSection, mode: 'insensitive' } },
              ],
            },
          });
          if (found) {
            departmentId = found.id;
            departmentSection = found.name;
          } else {
            const defaultDep = await tx.department.findFirst({
              where: { isActive: true },
              orderBy: { id: 'asc' },
            });
            if (defaultDep) {
              departmentId = defaultDep.id;
            }
          }
        } else {
          const defaultDep = await tx.department.findFirst({
            where: { isActive: true },
            orderBy: { id: 'asc' },
          });
          if (defaultDep) {
            departmentId = defaultDep.id;
            departmentSection = defaultDep.name;
          }
        }
      }

      if (!departmentId) {
        throw new Error('Debe especificar un departamento válido');
      }

      return tx.purchaseRequisition.create({
        data: {
          requisitionNumber,
          departmentId,
          departmentSection,
          justification: data.justification.trim(),
          notes: data.notes ? data.notes.trim() : null,
          status: PurchaseRequisitionStatus.BORRADOR,
          createdById: data.createdById,
          items: {
            create: data.items.map((it) => ({
              productId: it.productId,
              unitId: it.unitId,
              quantityRequested: it.quantityRequested,
              estimatedPrice:
                it.estimatedPrice !== undefined && it.estimatedPrice !== null
                  ? it.estimatedPrice
                  : null,
            })),
          },
        },
        include: {
          department: true,
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                include: {
                  baseUnit: true,
                  purchaseUnit: true,
                },
              },
              unit: true,
            },
          },
        },
      });
    });
  }

  static async updateStatus(id: bigint, status: PurchaseRequisitionStatus) {
    const requisition = await prisma.purchaseRequisition.findUnique({
      where: { id },
    });

    if (!requisition) {
      throw new Error('Preorden no encontrada');
    }

    return prisma.purchaseRequisition.update({
      where: { id },
      data: { status },
      include: {
        items: true,
        orders: true,
      },
    });
  }

  static async convertToOrder(
    id: bigint,
    data: ConvertRequisitionToOrderDTO
  ) {
    const requisition = await prisma.purchaseRequisition.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!requisition) {
      throw new Error('Preorden no encontrada');
    }

    if (requisition.status === PurchaseRequisitionStatus.CANCELADA) {
      throw new Error('No se puede convertir una preorden cancelada en orden de compra');
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('Debe proporcionar los renglones adjudicados con sus precios');
    }

    // Generar la orden de compra a través de OrderService
    const order = await OrderService.createOrder({
      supplierId: data.supplierId,
      currencyId: data.currencyId,
      currency: data.currency,
      exchangeRate: data.exchangeRate,
      requisitionId: requisition.id,
      notes: data.notes ?? `Generada a partir de preorden ${requisition.requisitionNumber}`,
      createdById: data.createdById,
      items: data.items.map((it) => ({
        productId: it.productId,
        unitId: it.unitId,
        quantityOrdered: it.quantityOrdered,
        unitPrice: it.unitPrice,
        isExempt: it.isExempt ?? false,
      })),
    });

    // Actualizar estado de la preorden a ADJUDICADA
    await prisma.purchaseRequisition.update({
      where: { id },
      data: { status: PurchaseRequisitionStatus.ADJUDICADA },
    });

    return order;
  }
}
