import { prisma } from '../config/prisma.js';
import type { LocationType } from '@prisma/client';

export class InventoryMasterService {
  // ==================== CATEGORÍAS ====================
  static async listCategories() {
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  static async createCategory(data: {
    name: string;
    description?: string;
    code?: string;
  }) {
    return prisma.category.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        code: data.code?.trim() || null,
      },
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  static async updateCategory(
    id: number,
    data: { name?: string; description?: string; code?: string }
  ) {
    return prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description.trim() || null }
          : {}),
        ...(data.code !== undefined
          ? { code: data.code.trim() || null }
          : {}),
      },
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  static async deleteCategory(id: number) {
    const productsCount = await prisma.product.count({
      where: { categoryId: id },
    });
    if (productsCount > 0) {
      const error: any = new Error(
        `No se puede eliminar la categoría: tiene ${productsCount} producto(s) vinculado(s)`
      );
      error.statusCode = 400;
      throw error;
    }
    return prisma.category.delete({
      where: { id },
    });
  }

  // ==================== MARCAS ====================
  static async listBrands() {
    return prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  static async createBrand(data: { name: string; description?: string }) {
    return prisma.brand.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
      },
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  static async updateBrand(
    id: number,
    data: { name?: string; description?: string }
  ) {
    return prisma.brand.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description.trim() || null }
          : {}),
      },
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  static async deleteBrand(id: number) {
    const productsCount = await prisma.product.count({
      where: { brandId: id },
    });
    if (productsCount > 0) {
      const error: any = new Error(
        `No se puede eliminar la marca: tiene ${productsCount} producto(s) vinculado(s)`
      );
      error.statusCode = 400;
      throw error;
    }
    return prisma.brand.delete({
      where: { id },
    });
  }

  // ==================== UNIDADES ====================
  static async listUnits() {
    return prisma.unit.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { baseProducts: true, purchProducts: true } },
      },
    });
  }

  static async createUnit(data: { name: string; abbreviation: string }) {
    return prisma.unit.create({
      data: {
        name: data.name.trim(),
        abbreviation: data.abbreviation.trim(),
      },
      include: {
        _count: { select: { baseProducts: true, purchProducts: true } },
      },
    });
  }

  static async updateUnit(
    id: number,
    data: { name?: string; abbreviation?: string }
  ) {
    return prisma.unit.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.abbreviation !== undefined
          ? { abbreviation: data.abbreviation.trim() }
          : {}),
      },
      include: {
        _count: { select: { baseProducts: true, purchProducts: true } },
      },
    });
  }

  static async deleteUnit(id: number) {
    const productsCount = await prisma.product.count({
      where: {
        OR: [{ baseUnitId: id }, { purchaseUnitId: id }],
      },
    });
    if (productsCount > 0) {
      const error: any = new Error(
        `No se puede eliminar la unidad de medida: tiene ${productsCount} producto(s) vinculado(s)`
      );
      error.statusCode = 400;
      throw error;
    }
    const orderItemsCount = await prisma.orderItem.count({
      where: { unitId: id },
    });
    if (orderItemsCount > 0) {
      const error: any = new Error(
        `No se puede eliminar la unidad de medida: tiene ${orderItemsCount} ítem(s) de orden de compra vinculado(s)`
      );
      error.statusCode = 400;
      throw error;
    }
    return prisma.unit.delete({
      where: { id },
    });
  }

  // ==================== UBICACIONES ====================
  static async listLocations() {
    return prisma.location.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { stockBatches: true, fridges: true } },
      },
    });
  }

  static async createLocation(data: {
    name: string;
    type: LocationType;
    description?: string;
  }) {
    return prisma.location.create({
      data: {
        name: data.name.trim(),
        type: data.type,
        description: data.description?.trim() || null,
      },
      include: {
        _count: { select: { stockBatches: true, fridges: true } },
      },
    });
  }

  static async updateLocation(
    id: number,
    data: { name?: string; type?: LocationType; description?: string }
  ) {
    return prisma.location.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.description !== undefined
          ? { description: data.description.trim() || null }
          : {}),
      },
      include: {
        _count: { select: { stockBatches: true, fridges: true } },
      },
    });
  }

  static async deleteLocation(id: number) {
    const batchesCount = await prisma.stockBatch.count({
      where: { locationId: id },
    });
    if (batchesCount > 0) {
      const error: any = new Error(
        `No se puede eliminar la ubicación: tiene ${batchesCount} lote(s) de inventario asociado(s)`
      );
      error.statusCode = 400;
      throw error;
    }
    const fridgesCount = await prisma.fridge.count({
      where: { locationId: id },
    });
    if (fridgesCount > 0) {
      const error: any = new Error(
        `No se puede eliminar la ubicación: tiene ${fridgesCount} equipo(s) de frío vinculado(s)`
      );
      error.statusCode = 400;
      throw error;
    }
    const movementsCount = await prisma.stockMovement.count({
      where: {
        OR: [{ originLocationId: id }, { destinationLocationId: id }],
      },
    });
    if (movementsCount > 0) {
      const error: any = new Error(
        `No se puede eliminar la ubicación: tiene ${movementsCount} movimiento(s) histórico(s) registrado(s)`
      );
      error.statusCode = 400;
      throw error;
    }
    return prisma.location.delete({
      where: { id },
    });
  }

  // ==================== MÉTODOS DE PAGO ====================
  static async listPaymentMethods(activeOnly = false) {
    const count = await prisma.paymentMethodCatalog.count();
    if (count === 0) {
      // Sembrar valores iniciales basados en enum PaymentMethod
      const defaults = [
        { code: 'TRANSFERENCIA_NACIONAL', name: 'Transferencia Bancaria Nacional (Bs.)', description: 'Transferencia electrónica bancaria en moneda de curso legal (Bs.)' },
        { code: 'TRANSFERENCIA_USD', name: 'Transferencia Internacional / Divisas', description: 'Transferencia bancaria internacional o en cuentas en moneda extranjera' },
        { code: 'PAGO_MOVIL', name: 'Pago Móvil Interbancario (Bs.)', description: 'Liquidación inmediata P2P / C2P en bolívares' },
        { code: 'EFECTIVO_USD', name: 'Efectivo Dólares (USD)', description: 'Pago directo en efectivo físico en divisas (Caja / Custodia)' },
        { code: 'EFECTIVO_BS', name: 'Efectivo Bolívares (Bs.)', description: 'Pago de caja chica en efectivo nacional' },
        { code: 'ZELLE', name: 'Zelle Directo', description: 'Transferencia directa vía Zelle / ACH estadounidense' },
      ];
      await prisma.paymentMethodCatalog.createMany({
        data: defaults,
        skipDuplicates: true,
      });
    }

    return prisma.paymentMethodCatalog.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  static async createPaymentMethod(data: {
    code: string;
    name: string;
    description?: string;
    isActive?: boolean;
  }) {
    return prisma.paymentMethodCatalog.create({
      data: {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  static async updatePaymentMethod(
    id: number,
    data: { code?: string; name?: string; description?: string; isActive?: boolean }
  ) {
    return prisma.paymentMethodCatalog.update({
      where: { id },
      data: {
        ...(data.code !== undefined ? { code: data.code.trim().toUpperCase() } : {}),
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description.trim() || null }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  static async deletePaymentMethod(id: number) {
    return prisma.paymentMethodCatalog.delete({
      where: { id },
    });
  }

  // ==================== CONCEPTOS DE JUSTIFICACIÓN Y PROTOCOLOS ====================
  static async listJustificationConcepts(category?: string, activeOnly = false) {
    const count = await prisma.justificationConcept.count();
    if (count === 0) {
      // Sembrar conceptos estándar
      const defaults = [
        { code: 'REP_STOCK', title: 'Reposición de Stock Operativo', description: 'Reposición rutinaria de insumos y reactivos por alcanzar punto de reorden en almacén', category: 'COMPRA' },
        { code: 'URG_CLINICA', title: 'Urgencia Clínica / Diagnóstica', description: 'Requerimiento prioritario para pruebas diagnósticas y atención inmediata de pacientes', category: 'SOLICITUD' },
        { code: 'INV_PROTOCOLO', title: 'Proyecto de Investigación o Protocolo Clínico', description: 'Materiales requeridos para ejecución de protocolos y líneas de investigación aprobadas', category: 'GENERAL' },
        { code: 'MANT_CALIBRA', title: 'Mantenimiento y Calibración de Equipos', description: 'Consumibles, kits de calibración y limpieza de instrumentos de laboratorio', category: 'GENERAL' },
        { code: 'DOT_PERIODICA', title: 'Dotación Regular Departamental', description: 'Suministro regular programado de consumibles, papelería o descartables a secciones', category: 'SOLICITUD' },
      ];
      await prisma.justificationConcept.createMany({
        data: defaults,
        skipDuplicates: true,
      });
    }

    return prisma.justificationConcept.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { title: 'asc' },
    });
  }

  static async createJustificationConcept(data: {
    code: string;
    title: string;
    description?: string;
    category?: string;
    isActive?: boolean;
  }) {
    return prisma.justificationConcept.create({
      data: {
        code: data.code.trim().toUpperCase(),
        title: data.title.trim(),
        description: data.description?.trim() || null,
        category: data.category?.trim().toUpperCase() || 'COMPRA',
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  static async updateJustificationConcept(
    id: number,
    data: {
      code?: string;
      title?: string;
      description?: string;
      category?: string;
      isActive?: boolean;
    }
  ) {
    return prisma.justificationConcept.update({
      where: { id },
      data: {
        ...(data.code !== undefined ? { code: data.code.trim().toUpperCase() } : {}),
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description.trim() || null }
          : {}),
        ...(data.category !== undefined
          ? { category: data.category.trim().toUpperCase() }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  static async deleteJustificationConcept(id: number) {
    return prisma.justificationConcept.delete({
      where: { id },
    });
  }
}
