import type { Request, Response, NextFunction } from 'express';
import {
  ProductService,
  type ProductFilterDTO,
  type CreateProductDTO,
  type UpdateProductDTO,
} from '../services/product.service.js';
import { serializeBigInt } from '../utils/serializer.js';

export const getCatalogs = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [categories, brands, units] = await Promise.all([
      ProductService.listCategories(),
      ProductService.listBrands(),
      ProductService.listUnits(),
    ]);

    res.status(200).json({
      status: 'SUCCESS',
      data: { categories, brands, units },
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'El nombre de la categoría es requerido',
      });
      return;
    }
    const category = await ProductService.createCategory(
      name,
      description ?? null
    );
    res.status(201).json({ status: 'SUCCESS', data: category });
  } catch (error) {
    next(error);
  }
};

export const createBrand = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'El nombre de la marca es requerido',
      });
      return;
    }
    const brand = await ProductService.createBrand(name);
    res.status(201).json({ status: 'SUCCESS', data: brand });
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { search, q, categoryId, isReagent, isLabReagent, labAreaId } = req.query;

    const filter: ProductFilterDTO = {};
    const rawSearch =
      typeof search === 'string'
        ? search
        : typeof q === 'string'
          ? q
          : '';

    if (rawSearch.trim() !== '') {
      filter.search = rawSearch.trim();
    }
    if (
      categoryId !== undefined &&
      categoryId !== '' &&
      categoryId !== 'all' &&
      categoryId !== 'todas' &&
      categoryId !== '0'
    ) {
      const parsedCatId = Number(categoryId);
      if (!isNaN(parsedCatId) && parsedCatId > 0) {
        filter.categoryId = parsedCatId;
      }
    }
    if (isReagent !== undefined) {
      filter.isReagent = isReagent === 'true';
    }
    if (isLabReagent !== undefined) {
      filter.isLabReagent = isLabReagent === 'true';
    }
    if (labAreaId !== undefined && labAreaId !== '') {
      const parsedAreaId = Number(labAreaId);
      if (!isNaN(parsedAreaId) && parsedAreaId > 0) {
        filter.labAreaId = parsedAreaId;
      }
    }

    const products = await ProductService.listProducts(filter);

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(products),
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      categoryId,
      baseUnitId,
      purchaseUnitId,
      conversionFactor,
      brandId,
      barcode,
      description,
      isTaxExempt,
      minStockAlert,
      isReagent,
      isLabReagent,
      labItemType,
      theoreticalYield,
      includesCalibrator,
      calibratorsPerRun,
      allowedLabAreaIds,
      compatibleExamIds,
    } = req.body;

    if (!name || !categoryId || !baseUnitId) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Nombre, categoría y unidad base son campos obligatorios',
      });
      return;
    }

    const isLabReagentVal = Boolean(isLabReagent);
    const newProductData: CreateProductDTO = {
      name: String(name),
      categoryId: Number(categoryId),
      baseUnitId: Number(baseUnitId),
      purchaseUnitId: purchaseUnitId ? Number(purchaseUnitId) : null,
      conversionFactor: conversionFactor !== undefined ? Number(conversionFactor) : undefined,
      brandId: brandId ? Number(brandId) : null,
      barcode: barcode ? String(barcode) : null,
      description: description ? String(description) : null,
      isTaxExempt: Boolean(isTaxExempt),
      minStockAlert: minStockAlert ? Number(minStockAlert) : 0,
      isLabReagent: isLabReagentVal,
      isReagent: isReagent !== undefined ? Boolean(isReagent) : isLabReagentVal,
      labItemType: labItemType ?? null,
      theoreticalYield: theoreticalYield ? Number(theoreticalYield) : null,
      includesCalibrator: Boolean(includesCalibrator),
      calibratorsPerRun: calibratorsPerRun ? Number(calibratorsPerRun) : null,
      allowedLabAreaIds: Array.isArray(allowedLabAreaIds)
        ? allowedLabAreaIds.map((id: any) => Number(id))
        : undefined,
      compatibleExamIds: Array.isArray(compatibleExamIds)
        ? compatibleExamIds.map((id: any) => Number(id))
        : undefined,
    };

    const product = await ProductService.createProduct(newProductData);

    res.status(201).json({
      status: 'SUCCESS',
      data: serializeBigInt(product),
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'ID no proporcionado' });
      return;
    }

    const {
      name,
      categoryId,
      baseUnitId,
      purchaseUnitId,
      conversionFactor,
      brandId,
      barcode,
      description,
      isTaxExempt,
      minStockAlert,
      isReagent,
      isLabReagent,
      labItemType,
      theoreticalYield,
      includesCalibrator,
      calibratorsPerRun,
      allowedLabAreaIds,
      compatibleExamIds,
    } = req.body;

    const updateData: UpdateProductDTO = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (categoryId !== undefined) updateData.categoryId = Number(categoryId);
    if (baseUnitId !== undefined) updateData.baseUnitId = Number(baseUnitId);
    if (purchaseUnitId !== undefined) {
      updateData.purchaseUnitId = purchaseUnitId ? Number(purchaseUnitId) : null;
    }
    if (conversionFactor !== undefined) {
      updateData.conversionFactor = Number(conversionFactor) || 1;
    }
    if (brandId !== undefined) {
      updateData.brandId = brandId ? Number(brandId) : null;
    }
    if (barcode !== undefined) {
      updateData.barcode = barcode ? String(barcode).trim() : null;
    }
    if (description !== undefined) {
      updateData.description = description ? String(description).trim() : null;
    }
    if (isTaxExempt !== undefined) {
      updateData.isTaxExempt = Boolean(isTaxExempt);
    }
    if (minStockAlert !== undefined) {
      updateData.minStockAlert = Number(minStockAlert) || 0;
    }
    if (isLabReagent !== undefined) {
      updateData.isLabReagent = Boolean(isLabReagent);
      if (updateData.isLabReagent && isReagent === undefined) {
        updateData.isReagent = true;
      }
    }
    if (isReagent !== undefined) {
      updateData.isReagent = Boolean(isReagent);
    }
    if (labItemType !== undefined) {
      updateData.labItemType = labItemType;
    }
    if (theoreticalYield !== undefined) {
      updateData.theoreticalYield = theoreticalYield ? Number(theoreticalYield) : null;
    }
    if (includesCalibrator !== undefined) {
      updateData.includesCalibrator = Boolean(includesCalibrator);
    }
    if (calibratorsPerRun !== undefined) {
      updateData.calibratorsPerRun = calibratorsPerRun ? Number(calibratorsPerRun) : null;
    }
    if (allowedLabAreaIds !== undefined) {
      updateData.allowedLabAreaIds = Array.isArray(allowedLabAreaIds)
        ? allowedLabAreaIds.map((item: any) => Number(item))
        : [];
    }
    if (compatibleExamIds !== undefined) {
      updateData.compatibleExamIds = Array.isArray(compatibleExamIds)
        ? compatibleExamIds.map((item: any) => Number(item))
        : [];
    }

    const updated = await ProductService.updateProduct(BigInt(id), updateData);

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Insumo actualizado exitosamente',
      data: serializeBigInt(updated),
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'ID no proporcionado' });
      return;
    }

    const product = await ProductService.getProductById(BigInt(id));
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(product),
    });
  } catch (error) {
    next(error);
  }
};
