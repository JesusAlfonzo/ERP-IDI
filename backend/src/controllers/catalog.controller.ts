import type { Request, Response, NextFunction } from 'express';
import { CatalogService } from '../services/catalog.service.js';
import { serializeBigInt } from '../utils/serializer.js';
import { LocationType } from '@prisma/client';

// --- CATEGORÍAS ---
export const getCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await CatalogService.listCategories();
    res.status(200).json({ status: 'SUCCESS', data: categories });
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
        message: 'El nombre de la categoría es obligatorio',
      });
      return;
    }
    const category = await CatalogService.createCategory({ name, description });
    res.status(201).json({ status: 'SUCCESS', data: category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (
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
    const updated = await CatalogService.updateCategory(Number(id), req.body);
    res.status(200).json({ status: 'SUCCESS', data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (
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
    await CatalogService.deleteCategory(Number(id));
    res
      .status(200)
      .json({ status: 'SUCCESS', message: 'Categoría eliminada exitosamente' });
  } catch (error) {
    next(error);
  }
};

// --- MARCAS ---
export const getBrands = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const brands = await CatalogService.listBrands();
    res.status(200).json({ status: 'SUCCESS', data: brands });
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
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'El nombre de la marca es obligatorio',
      });
      return;
    }
    const brand = await CatalogService.createBrand(name, description);
    res.status(201).json({ status: 'SUCCESS', data: brand });
  } catch (error) {
    next(error);
  }
};

export const updateBrand = async (
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
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'El nuevo nombre es requerido',
      });
      return;
    }
    const brand = await CatalogService.updateBrand(Number(id), {
      name,
      description,
    });
    res.status(200).json({ status: 'SUCCESS', data: brand });
  } catch (error) {
    next(error);
  }
};

// --- UNIDADES DE MEDIDA ---
export const getUnits = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const units = await CatalogService.listUnits();
    res.status(200).json({ status: 'SUCCESS', data: units });
  } catch (error) {
    next(error);
  }
};

export const createUnit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, abbreviation } = req.body;
    if (!name || !abbreviation) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Nombre y abreviatura son requeridos',
      });
      return;
    }
    const unit = await CatalogService.createUnit({ name, abbreviation });
    res.status(201).json({ status: 'SUCCESS', data: unit });
  } catch (error) {
    next(error);
  }
};

export const updateUnit = async (
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
    const updated = await CatalogService.updateUnit(Number(id), req.body);
    res.status(200).json({ status: 'SUCCESS', data: updated });
  } catch (error) {
    next(error);
  }
};

// --- UBICACIONES ---
export const getLocations = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const locations = await CatalogService.listLocations();
    res
      .status(200)
      .json({ status: 'SUCCESS', data: serializeBigInt(locations) });
  } catch (error) {
    next(error);
  }
};

export const createLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, type, description } = req.body;
    if (
      !name ||
      !type ||
      !Object.values(LocationType).includes(type as LocationType)
    ) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: `Nombre y tipo válido (${Object.values(LocationType).join(', ')}) son requeridos`,
      });
      return;
    }
    const location = await CatalogService.createLocation({
      name,
      type: type as LocationType,
      description,
    });
    res
      .status(201)
      .json({ status: 'SUCCESS', data: serializeBigInt(location) });
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (
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
    const updated = await CatalogService.updateLocation(Number(id), req.body);
    res.status(200).json({ status: 'SUCCESS', data: serializeBigInt(updated) });
  } catch (error) {
    next(error);
  }
};

// --- DEPARTAMENTOS ---
export const getDepartments = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const depts = await CatalogService.listActiveDepartments();
    res.status(200).json({ status: 'SUCCESS', data: depts });
  } catch (error) {
    next(error);
  }
};
