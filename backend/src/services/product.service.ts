import { prisma } from '../config/prisma.js';

export interface CreateProductDTO {
  name: string;
  categoryId: number;
  baseUnitId: number;
  purchaseUnitId?: number | null;
  conversionFactor?: number;
  brandId?: number | null;
  barcode?: string | null;
  description?: string | null;
  isTaxExempt?: boolean;
  minStockAlert?: number;
  isReagent?: boolean;
}

export interface ProductFilterDTO {
  search?: string;
  categoryId?: number;
  isReagent?: boolean;
}

export class ProductService {
  // --- Catálogos Auxiliares ---
  static async listCategories() {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  static async createCategory(name: string, description?: string | null) {
    return prisma.category.create({
      data: {
        name,
        description: description ?? null,
      },
    });
  }

  static async listBrands() {
    return prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  static async createBrand(name: string) {
    return prisma.brand.create({ data: { name } });
  }

  static async listUnits() {
    return prisma.unit.findMany({ orderBy: { name: 'asc' } });
  }

  // --- Productos ---
  static async listProducts(filter?: ProductFilterDTO) {
    return prisma.product.findMany({
      where: {
        isActive: true,
        ...(filter?.categoryId !== undefined
          ? { categoryId: filter.categoryId }
          : {}),
        ...(filter?.isReagent !== undefined
          ? { isReagent: filter.isReagent }
          : {}),
        ...(filter?.search
          ? {
              OR: [
                { name: { contains: filter.search, mode: 'insensitive' } },
                { sku: { contains: filter.search, mode: 'insensitive' } },
                { barcode: { contains: filter.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        brand: true,
        baseUnit: true,
        purchaseUnit: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getProductById(id: bigint) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        baseUnit: true,
        purchaseUnit: true,
      },
    });

    if (!product) {
      throw new Error('Producto no encontrado');
    }

    return product;
  }

  static async createProduct(data: CreateProductDTO) {
    const count = await prisma.product.count();
    const sku = `PROD-${String(count + 1).padStart(4, '0')}`;

    return prisma.product.create({
      data: {
        name: data.name,
        sku,
        categoryId: data.categoryId,
        baseUnitId: data.baseUnitId,
        purchaseUnitId: data.purchaseUnitId ?? null,
        conversionFactor: data.conversionFactor ?? 1.0,
        brandId: data.brandId ?? null,
        barcode: data.barcode ?? null,
        description: data.description ?? null,
        isTaxExempt: data.isTaxExempt ?? false,
        minStockAlert: data.minStockAlert ?? 0,
        isReagent: data.isReagent ?? false,
      },
      include: {
        category: true,
        brand: true,
        baseUnit: true,
        purchaseUnit: true,
      },
    });
  }
}
