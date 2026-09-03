import { prisma } from '../config/prisma.js';
import { OrderStatus, PaymentStatus, ReceptionStatus } from '@prisma/client';

export interface CreateOrderItemDTO {
  productId: bigint;
  unitId: number;
  quantityOrdered: number;
  unitPrice: number;
}

export interface CreateOrderDTO {
  supplierId?: number | null;
  currencyId: number;
  notes?: string | null;
  createdById: number;
  items: CreateOrderItemDTO[];
}

export class OrderService {
  static async listOrders() {
    return prisma.order.findMany({
      include: {
        supplier: true,
        currency: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: true,
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
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: true,
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
    if (data.items.length === 0) {
      throw new Error('La orden debe incluir al menos un ítem');
    }

    // 1. Obtener la moneda y su tasa más reciente
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

    const exchangeRate = currency.isDefault
      ? 1.0
      : currency.exchanges[0]?.rate
        ? Number(currency.exchanges[0].rate)
        : 1.0;

    // 2. Generar correlativo anual ORD-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const count = await prisma.order.count();
    const orderNumber = `ORD-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    // 3. Procesar y validar cada ítem con el catálogo de productos
    let subtotal = 0;
    let taxTotal = 0;

    const processedItems: {
      productId: bigint;
      unitId: number;
      quantityOrdered: number;
      multiplier: number;
      baseQuantity: number;
      unitPrice: number;
      taxRate: number;
      totalLine: number;
    }[] = [];

    for (const item of data.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error(`Producto con ID ${item.productId} no encontrado`);
      }

      // Calcular multiplicador (factor de conversión)
      let multiplier = 1.0;
      if (product.purchaseUnitId && product.purchaseUnitId === item.unitId) {
        multiplier = Number(product.conversionFactor);
      }

      const baseQuantity = item.quantityOrdered * multiplier;
      const taxRate = product.isTaxExempt ? 0.0 : 16.0;
      const lineSubtotal = item.quantityOrdered * item.unitPrice;
      const lineTax = lineSubtotal * (taxRate / 100);
      const totalLine = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxTotal += lineTax;

      processedItems.push({
        productId: item.productId,
        unitId: item.unitId,
        quantityOrdered: item.quantityOrdered,
        multiplier,
        baseQuantity,
        unitPrice: item.unitPrice,
        taxRate,
        totalLine,
      });
    }

    const total = subtotal + taxTotal;

    // 4. Transacción atómica
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
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
              totalLine: pi.totalLine,
            })),
          },
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

      return order;
    });
  }
}
