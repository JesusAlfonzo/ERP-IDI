import { prisma } from '../config/prisma.js';
import type { LocationType } from '@prisma/client';

export class InventoryMasterService {
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
    });
  }

  static async updateBrand(
    id: number,
    data: { name?: string; description?: string }
  ) {
    return prisma.brand.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description.trim() || null }
          : {}),
      },
    });
  }

  // ==================== UNIDADES ====================
  static async listUnits() {
    return prisma.unit.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { baseProducts: true } },
      },
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
    return prisma.unit.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.abbreviation
          ? { abbreviation: data.abbreviation.trim() }
          : {}),
      },
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
    });
  }

  static async updateLocation(
    id: number,
    data: { name?: string; type?: LocationType; description?: string }
  ) {
    return prisma.location.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.description !== undefined
          ? { description: data.description.trim() || null }
          : {}),
      },
    });
  }
}
