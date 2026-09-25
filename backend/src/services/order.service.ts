import { prisma } from '../config/prisma.js';
import {
  OrderStatus,
  PaymentStatus,
  ReceptionStatus,
  BatchStatus,
  StockMovementType,
  Prisma,
} from '@prisma/client';

export interface ReceiveOrderItemDTO {
  orderItemId: bigint;
  quantityReceived: number;
  lotNumber: string;
  expirationDate: Date;
  locationId?: number;
}

export interface ReceiveOrderDTO {
  orderId: bigint;
  receivedById: number;
  notes?: string | null;
  items: ReceiveOrderItemDTO[];
}

export interface CreateOrderItemDTO {
  productId: bigint;
  unitId: number;
  quantityOrdered: number;
  unitPrice: number;
  isExempt?: boolean;
}

export interface CreateOrderDTO {
  supplierId?: number | null;
  currencyId: number;
  exchangeRate?: number;
  requisitionId?: bigint | null;
  notes?: string | null;
  createdById: number;
  items: CreateOrderItemDTO[];
}

export class OrderService {
  static async listOrders(filter?: { status?: string; search?: string }) {
    const whereClause: Prisma.OrderWhereInput = {
      ...(filter?.status &&
      Object.values(OrderStatus).includes(filter.status as OrderStatus)
        ? { status: filter.status as OrderStatus }
        : {}),
      ...(filter?.search
        ? {
            OR: [
              { orderNumber: { contains: filter.search, mode: 'insensitive' } },
              {
                supplier: {
                  name: { contains: filter.search, mode: 'insensitive' },
                },
              },
              {
                supplier: {
                  rifOrId: { contains: filter.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    return prisma.order.findMany({
      where: whereClause,
      include: {
        supplier: true,
        currency: true,
        requisition: {
          select: {
            id: true,
            requisitionNumber: true,
            departmentSection: true,
          },
        },
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
              include: { baseUnit: true, purchaseUnit: true },
            },
            unit: true,
          },
        },
        payments: true,
        invoices: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getOrderById(id: bigint) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        supplier: true,
        currency: true,
        requisition: {
          select: {
            id: true,
            requisitionNumber: true,
            departmentSection: true,
          },
        },
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
              include: { baseUnit: true, purchaseUnit: true },
            },
            unit: true,
          },
        },
        payments: true,
        invoices: true,
      },
    });

    if (!order) {
      throw new Error('Orden de compra no encontrada');
    }

    return order;
  }

  static async createOrder(data: CreateOrderDTO) {
    if (!data.items || data.items.length === 0) {
      throw new Error('La orden debe incluir al menos un ítem');
    }

    const currency = await prisma.currency.findUnique({
      where: { id: data.currencyId },
      include: {
        exchanges: {
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
      },
    });

    if (!currency) {
      throw new Error('Moneda no encontrada');
    }

    const exchangeRate =
      data.exchangeRate && Number(data.exchangeRate) > 0
        ? Number(data.exchangeRate)
        : currency.isDefault
          ? 1.0
          : currency.exchanges[0]?.rate
            ? Number(currency.exchanges[0].rate)
            : 1.0;

    const currentYear = new Date().getFullYear();
    const latestOrder = await prisma.order.findFirst({
      where: { orderNumber: { startsWith: `ORD-${currentYear}-` } },
      orderBy: { orderNumber: 'desc' },
    });

    let nextSeq = 1;
    if (latestOrder) {
      const parts = latestOrder.orderNumber.split('-');
      const seqStr = parts[2];
      const seq = seqStr ? parseInt(seqStr, 10) : NaN;
      if (!isNaN(seq)) nextSeq = seq + 1;
    }
    const orderNumber = `ORD-${currentYear}-${String(nextSeq).padStart(4, '0')}`;

    let taxableAmountUsd = 0;
    let exemptAmountUsd = 0;

    const processedItems: {
      productId: bigint;
      unitId: number;
      quantityOrdered: number;
      multiplier: number;
      baseQuantity: number;
      unitPrice: number;
      taxRate: number;
      isExempt: boolean;
      totalLine: number;
    }[] = [];

    for (const item of data.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error(`Producto con ID ${item.productId} no encontrado`);
      }

      let multiplier = 1.0;
      if (product.baseUnitId !== item.unitId) {
        multiplier =
          Number(product.conversionFactor) > 0
            ? Number(product.conversionFactor)
            : 1.0;
      }

      const baseQuantity = item.quantityOrdered * multiplier;
      const isExempt = item.isExempt ?? product.isTaxExempt;
      const taxRate = isExempt ? 0.0 : 16.0;
      const lineSubtotal =
        Math.round(item.quantityOrdered * item.unitPrice * 100) / 100;
      const lineTax = isExempt
        ? 0.0
        : Math.round(lineSubtotal * 0.16 * 100) / 100;
      const totalLine = Math.round((lineSubtotal + lineTax) * 100) / 100;

      if (isExempt) {
        exemptAmountUsd += lineSubtotal;
      } else {
        taxableAmountUsd += lineSubtotal;
      }

      processedItems.push({
        productId: item.productId,
        unitId: item.unitId,
        quantityOrdered: item.quantityOrdered,
        multiplier,
        baseQuantity,
        unitPrice: item.unitPrice,
        taxRate,
        isExempt,
        totalLine,
      });
    }

    taxableAmountUsd = Math.round(taxableAmountUsd * 100) / 100;
    exemptAmountUsd = Math.round(exemptAmountUsd * 100) / 100;
    const taxAmountUsd = Math.round(taxableAmountUsd * 0.16 * 100) / 100;
    const totalAmountUsd =
      Math.round((taxableAmountUsd + exemptAmountUsd + taxAmountUsd) * 100) /
      100;
    const totalAmountBs =
      Math.round(totalAmountUsd * exchangeRate * 100) / 100;

    const subtotal =
      Math.round((taxableAmountUsd + exemptAmountUsd) * 100) / 100;
    const taxTotal = taxAmountUsd;
    const total = totalAmountUsd;

    return prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          supplierId: data.supplierId ?? null,
          currencyId: data.currencyId,
          exchangeRate,
          status: OrderStatus.BORRADOR,
          paymentStatus: PaymentStatus.PENDIENTE,
          receptionStatus: ReceptionStatus.PENDIENTE,
          subtotal,
          taxTotal,
          total,
          taxableAmountUsd,
          exemptAmountUsd,
          taxAmountUsd,
          totalAmountUsd,
          totalAmountBs,
          requisitionId: data.requisitionId ?? null,
          notes: data.notes ?? null,
          createdById: data.createdById,
          items: {
            create: processedItems.map((pi) => ({
              productId: pi.productId,
              unitId: pi.unitId,
              quantityOrdered: pi.quantityOrdered,
              multiplier: pi.multiplier,
              baseQuantity: pi.baseQuantity,
              unitPrice: pi.unitPrice,
              taxRate: pi.taxRate,
              isExempt: pi.isExempt,
              totalLine: pi.totalLine,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                include: { baseUnit: true, purchaseUnit: true },
              },
              unit: true,
            },
          },
          supplier: true,
          currency: true,
          requisition: {
            select: {
              id: true,
              requisitionNumber: true,
              departmentSection: true,
            },
          },
        },
      });

      if (data.requisitionId) {
        await tx.purchaseRequisition.update({
          where: { id: data.requisitionId },
          data: { status: 'ADJUDICADA' },
        });
      }

      return createdOrder;
    });
  }

  static async receiveOrder(data: ReceiveOrderDTO) {
    if (!data.items || data.items.length === 0) {
      throw new Error('Debe proporcionar al menos un ítem para recibir');
    }

    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: data.orderId },
        include: { items: { include: { product: true } } },
      });

      if (!order) {
        throw new Error('Orden no encontrada');
      }

      if (order.status === OrderStatus.CANCELADA) {
        throw new Error('No se puede recibir mercancía de una orden cancelada');
      }

      if (order.receptionStatus === ReceptionStatus.COMPLETO) {
        throw new Error('Esta orden ya fue recibida en su totalidad');
      }

      const moveCount = await tx.stockMovement.count();
      const currentYear = new Date().getFullYear();
      const moveReference = `MOV-REC-${currentYear}-${String(moveCount + 1).padStart(4, '0')}`;

      const destinationLocationId = data.items[0]?.locationId ?? 1;

      const movement = await tx.stockMovement.create({
        data: {
          referenceNumber: moveReference,
          type: StockMovementType.ENTRADA_COMPRA,
          orderId: order.id,
          destinationLocationId,
          notes: data.notes ?? `Recepción de la orden ${order.orderNumber}`,
          createdById: data.receivedById,
        },
      });

      for (const receivedItem of data.items) {
        const orderItem = order.items.find(
          (item) => item.id === receivedItem.orderItemId
        );

        if (!orderItem) {
          throw new Error(
            `Ítem con ID ${receivedItem.orderItemId} no existe en la orden`
          );
        }

        const remaining =
          Number(orderItem.quantityOrdered) -
          Number(orderItem.quantityReceived) +
          Number(orderItem.quantityRejected);
        if (receivedItem.quantityReceived > remaining) {
          throw new Error(
            `La cantidad (${receivedItem.quantityReceived}) excede el saldo pendiente (${remaining})`
          );
        }

        const multiplier = Number(orderItem.multiplier);
        const baseQuantityToAdd = receivedItem.quantityReceived * multiplier;
        const targetLocationId =
          receivedItem.locationId ?? destinationLocationId;
        const costPerBaseUnit = Number(orderItem.unitPrice) / multiplier;

        // Si es un reactivo clínico, entra a cuarentena para verificación analítica.
        // Si es material general, queda disponible directamente para uso.
        const initialStatus = orderItem.product.isReagent
          ? BatchStatus.EN_CUARENTENA
          : BatchStatus.DISPONIBLE;

        const stockBatch = await tx.stockBatch.create({
          data: {
            productId: orderItem.productId,
            locationId: targetLocationId,
            lotNumber: receivedItem.lotNumber.trim().toUpperCase(),
            currentQuantity: baseQuantityToAdd,
            costPrice: costPerBaseUnit,
            expirationDate: receivedItem.expirationDate,
            status: initialStatus,
          },
        });

        await tx.stockMovementItem.create({
          data: {
            stockMovementId: movement.id,
            batchId: stockBatch.id,
            orderItemId: orderItem.id,
            quantity: baseQuantityToAdd,
            unitCost: costPerBaseUnit,
          },
        });

        await tx.orderItem.update({
          where: { id: orderItem.id },
          data: {
            quantityReceived:
              Number(orderItem.quantityReceived) +
              receivedItem.quantityReceived,
          },
        });
      }

      const updatedOrder = await tx.order.findUnique({
        where: { id: data.orderId },
        include: { items: true },
      });

      const allCompleted = updatedOrder?.items.every(
        (item) =>
          Number(item.quantityReceived) - Number(item.quantityRejected) >=
          Number(item.quantityOrdered)
      );

      return tx.order.update({
        where: { id: data.orderId },
        data: {
          receptionStatus: allCompleted
            ? ReceptionStatus.COMPLETO
            : ReceptionStatus.PARCIAL,
          status: allCompleted ? OrderStatus.COMPLETADA : OrderStatus.PARCIAL,
        },
        include: {
          items: {
            include: {
              product: true,
              unit: true,
            },
          },
          supplier: true,
          currency: true,
        },
      });
    });
  }
}
