import { prisma } from '../config/prisma.js';
import { BatchStatus, LabItemType } from '@prisma/client';

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
  isLabReagent?: boolean;
  labItemType?: LabItemType | null;
  theoreticalYield?: number | null;
  includesCalibrator?: boolean;
  calibratorsPerRun?: number | null;
  allowedLabAreaIds?: number[];
  compatibleExamIds?: number[];
}

export interface UpdateProductDTO {
  name?: string;
  categoryId?: number;
  baseUnitId?: number;
  purchaseUnitId?: number | null;
  conversionFactor?: number;
  brandId?: number | null;
  barcode?: string | null;
  description?: string | null;
  isTaxExempt?: boolean;
  minStockAlert?: number;
  isReagent?: boolean;
  isLabReagent?: boolean;
  labItemType?: LabItemType | null;
  theoreticalYield?: number | null;
  includesCalibrator?: boolean;
  calibratorsPerRun?: number | null;
  allowedLabAreaIds?: number[];
  compatibleExamIds?: number[];
}

export interface ProductFilterDTO {
  search?: string;
  categoryId?: number;
  isReagent?: boolean;
  isLabReagent?: boolean;
  labAreaId?: number;
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
    return prisma.product
      .findMany({
        where: {
          isActive: true,
          ...(filter?.categoryId !== undefined
            ? { categoryId: filter.categoryId }
            : {}),
          ...(filter?.isReagent !== undefined
            ? { isReagent: filter.isReagent }
            : {}),
          ...(filter?.isLabReagent !== undefined
            ? { isLabReagent: filter.isLabReagent }
            : {}),
          ...(filter?.labAreaId !== undefined
            ? {
                allowedLabAreas: {
                  some: { labAreaId: filter.labAreaId },
                },
              }
            : {}),
          ...(filter?.search
            ? {
                OR: [
                  { name: { contains: filter.search, mode: 'insensitive' } },
                  { sku: { contains: filter.search, mode: 'insensitive' } },
                  { barcode: { contains: filter.search, mode: 'insensitive' } },
                  { description: { contains: filter.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: {
          category: true,
          brand: true,
          baseUnit: true,
          purchaseUnit: true,
          allowedLabAreas: {
            include: { labArea: true },
          },
          compatibleExams: {
            include: { labExam: true },
          },
          stockBatches: {
            include: {
              location: true,
            },
            orderBy: [{ expirationDate: 'asc' }, { createdAt: 'desc' }],
          },
        },
        orderBy: { name: 'asc' },
      })
      .then((products) =>
        products.map((product) => {
          const totalStock = product.stockBatches
            .filter((batch) => batch.status === BatchStatus.DISPONIBLE)
            .reduce(
              (total, batch) => total + Number(batch.currentQuantity),
              0
            );

          return {
            ...product,
            totalStock,
            batches: product.stockBatches,
          };
        })
      );
  }

  static async getProductById(id: bigint) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        baseUnit: true,
        purchaseUnit: true,
        allowedLabAreas: {
          include: { labArea: true },
        },
        compatibleExams: {
          include: { labExam: true },
        },
        stockBatches: {
          include: {
            location: true,
          },
          orderBy: [{ expirationDate: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!product) {
      throw new Error('Producto no encontrado');
    }

    const totalStock = product.stockBatches
      .filter((b) => b.status === BatchStatus.DISPONIBLE)
      .reduce((acc, b) => acc + Number(b.currentQuantity), 0);

    return {
      ...product,
      totalStock,
      batches: product.stockBatches,
    };
  }

  static async createProduct(data: CreateProductDTO) {
    const count = await prisma.product.count();
    const sku = `PROD-${String(count + 1).padStart(4, '0')}`;

    const isLabReagent = data.isLabReagent ?? false;
    const isReagent = data.isReagent ?? isLabReagent;

    let theoreticalYield = data.theoreticalYield ?? null;
    let conversionFactor = data.conversionFactor ?? 1.0;

    if (isLabReagent || isReagent) {
      if (
        theoreticalYield !== null &&
        theoreticalYield !== undefined &&
        !data.conversionFactor
      ) {
        conversionFactor = theoreticalYield;
      } else if (
        (theoreticalYield === null || theoreticalYield === undefined) &&
        data.conversionFactor
      ) {
        theoreticalYield = Math.floor(Number(data.conversionFactor));
      }
    }

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          sku,
          categoryId: data.categoryId,
          baseUnitId: data.baseUnitId,
          purchaseUnitId: data.purchaseUnitId ?? null,
          conversionFactor,
          brandId: data.brandId ?? null,
          barcode: data.barcode ?? null,
          description: data.description ?? null,
          isTaxExempt: data.isTaxExempt ?? false,
          minStockAlert: data.minStockAlert ?? 0,
          isReagent,
          isLabReagent,
          labItemType: data.labItemType ?? null,
          theoreticalYield,
          includesCalibrator: data.includesCalibrator ?? false,
          calibratorsPerRun: data.calibratorsPerRun ?? null,
        },
        include: {
          category: true,
          brand: true,
          baseUnit: true,
          purchaseUnit: true,
        },
      });

      if (data.allowedLabAreaIds && data.allowedLabAreaIds.length > 0) {
        await tx.labAreaProduct.createMany({
          data: data.allowedLabAreaIds.map((areaId) => ({
            labAreaId: areaId,
            productId: product.id,
          })),
        });
      }

      if (data.compatibleExamIds && data.compatibleExamIds.length > 0) {
        await tx.labExamProduct.createMany({
          data: data.compatibleExamIds.map((examId) => ({
            labExamId: examId,
            productId: product.id,
          })),
        });
      }

      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          category: true,
          brand: true,
          baseUnit: true,
          purchaseUnit: true,
          allowedLabAreas: { include: { labArea: true } },
          compatibleExams: { include: { labExam: true } },
        },
      });
    });
  }

  static async updateProduct(id: bigint, data: UpdateProductDTO) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      const error: any = new Error('Producto no encontrado');
      error.statusCode = 404;
      throw error;
    }

    return prisma.$transaction(async (tx) => {
      let isLabReagent = data.isLabReagent;
      let isReagent = data.isReagent;
      if (isLabReagent === true && isReagent === undefined) {
        isReagent = true;
      }

      let theoreticalYield = data.theoreticalYield;
      let conversionFactor = data.conversionFactor;

      if (
        theoreticalYield !== undefined &&
        theoreticalYield !== null &&
        conversionFactor === undefined
      ) {
        conversionFactor = theoreticalYield;
      } else if (
        conversionFactor !== undefined &&
        (theoreticalYield === undefined || theoreticalYield === null)
      ) {
        if (existing.isLabReagent || isLabReagent) {
          theoreticalYield = Math.floor(Number(conversionFactor));
        }
      }

      await tx.product.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.categoryId ? { categoryId: data.categoryId } : {}),
          ...(data.baseUnitId ? { baseUnitId: data.baseUnitId } : {}),
          ...(data.purchaseUnitId !== undefined
            ? { purchaseUnitId: data.purchaseUnitId }
            : {}),
          ...(conversionFactor !== undefined
            ? { conversionFactor }
            : {}),
          ...(data.brandId !== undefined ? { brandId: data.brandId } : {}),
          ...(data.barcode !== undefined ? { barcode: data.barcode } : {}),
          ...(data.description !== undefined
            ? { description: data.description }
            : {}),
          ...(data.isTaxExempt !== undefined
            ? { isTaxExempt: data.isTaxExempt }
            : {}),
          ...(data.minStockAlert !== undefined
            ? { minStockAlert: data.minStockAlert }
            : {}),
          ...(isReagent !== undefined ? { isReagent } : {}),
          ...(isLabReagent !== undefined ? { isLabReagent } : {}),
          ...(data.labItemType !== undefined
            ? { labItemType: data.labItemType }
            : {}),
          ...(theoreticalYield !== undefined
            ? { theoreticalYield }
            : {}),
          ...(data.includesCalibrator !== undefined
            ? { includesCalibrator: data.includesCalibrator }
            : {}),
          ...(data.calibratorsPerRun !== undefined
            ? { calibratorsPerRun: data.calibratorsPerRun }
            : {}),
        },
      });

      if (data.allowedLabAreaIds !== undefined) {
        await tx.labAreaProduct.deleteMany({ where: { productId: id } });
        if (data.allowedLabAreaIds.length > 0) {
          await tx.labAreaProduct.createMany({
            data: data.allowedLabAreaIds.map((areaId) => ({
              labAreaId: areaId,
              productId: id,
            })),
          });
        }
      }

      if (data.compatibleExamIds !== undefined) {
        await tx.labExamProduct.deleteMany({ where: { productId: id } });
        if (data.compatibleExamIds.length > 0) {
          await tx.labExamProduct.createMany({
            data: data.compatibleExamIds.map((examId) => ({
              labExamId: examId,
              productId: id,
            })),
          });
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          brand: true,
          baseUnit: true,
          purchaseUnit: true,
          allowedLabAreas: { include: { labArea: true } },
          compatibleExams: { include: { labExam: true } },
        },
      });
    });
  }
}
