import { prisma } from '../config/prisma.js';
import { LocationType } from '@prisma/client';

export class CatalogService {
  // ================= CATEGORÍAS =================
  static async listCategories() {
    return prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async createCategory(data: { name: string; description?: string }) {
    return prisma.category.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
      },
    });
  }

  static async updateCategory(
    id: number,
    data: { name?: string; description?: string }
  ) {
    const updateData: { name?: string; description?: string | null } = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description.trim() || null;
    }

    return prisma.category.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteCategory(id: number) {
    const productsCount = await prisma.product.count({
      where: { categoryId: id },
    });
    if (productsCount > 0) {
      throw new Error(
        `No se puede eliminar la categoría: tiene ${productsCount} producto(s) asignado(s)`
      );
    }
    return prisma.category.delete({ where: { id } });
  }

  // ================= MARCAS =================
  static async listBrands() {
    return prisma.brand.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async createBrand(name: string) {
    return prisma.brand.create({
      data: { name: name.trim() },
    });
  }

  static async updateBrand(id: number, name: string) {
    return prisma.brand.update({
      where: { id },
      data: { name: name.trim() },
    });
  }

  // ================= UNIDADES DE MEDIDA =================
  static async listUnits() {
    return prisma.unit.findMany({
      orderBy: { name: 'asc' },
    });
  }

  static async createUnit(data: { name: string; abbreviation: string }) {
    return prisma.unit.create({
      data: {
        name: data.name.trim(),
        abbreviation: data.abbreviation.trim(),
      },
    });
  }

  static async updateUnit(
    id: number,
    data: { name?: string; abbreviation?: string }
  ) {
    const updateData: { name?: string; abbreviation?: string } = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.abbreviation !== undefined) {
      updateData.abbreviation = data.abbreviation.trim();
    }

    return prisma.unit.update({
      where: { id },
      data: updateData,
    });
  }

  // ================= UBICACIONES FÍSICAS =================
  static async listLocations() {
    return prisma.location.findMany({
      include: {
        fridges: true,
        _count: { select: { stockBatches: true } },
      },
      orderBy: { name: 'asc' },
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
    });
  }

  static async updateLocation(
    id: number,
    data: { name?: string; type?: LocationType; description?: string }
  ) {
    const updateData: {
      name?: string;
      type?: LocationType;
      description?: string | null;
    } = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.type !== undefined) {
      updateData.type = data.type;
    }
    if (data.description !== undefined) {
      updateData.description = data.description.trim() || null;
    }

    return prisma.location.update({
      where: { id },
      data: updateData,
    });
  }

  // ================= DEPARTAMENTOS ACTIVOS =================
  static async listActiveDepartments() {
    const users = await prisma.user.findMany({
      select: { department: true },
      distinct: ['department'],
      where: { isActive: true },
      orderBy: { department: 'asc' },
    });
    return users.map((u) => u.department);
  }
}
