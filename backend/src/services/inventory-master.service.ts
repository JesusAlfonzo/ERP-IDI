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
}
