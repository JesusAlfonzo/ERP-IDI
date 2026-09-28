import type { Request, Response, NextFunction } from 'express';
import {
  ProductService,
  type ProductFilterDTO,
  type CreateProductDTO,
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
    const { search, q, categoryId, isReagent } = req.query;

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
    } = req.body;

    if (!name || !categoryId || !baseUnitId) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Nombre, categoría y unidad base son campos obligatorios',
      });
      return;
    }

    const newProductData: CreateProductDTO = {
      name: String(name),
      categoryId: Number(categoryId),
      baseUnitId: Number(baseUnitId),
      purchaseUnitId: purchaseUnitId ? Number(purchaseUnitId) : null,
      conversionFactor: conversionFactor ? Number(conversionFactor) : 1.0,
      brandId: brandId ? Number(brandId) : null,
      barcode: barcode ? String(barcode) : null,
      description: description ? String(description) : null,
      isTaxExempt: Boolean(isTaxExempt),
      minStockAlert: minStockAlert ? Number(minStockAlert) : 0,
      isReagent: Boolean(isReagent),
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
