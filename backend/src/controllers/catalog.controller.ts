import type { Request, Response, NextFunction } from 'express';
import { CatalogService } from '../services/catalog.service.js';
import { serializeBigInt } from '../utils/serializer.js';
import { LocationType } from '@prisma/client';

function checkAdmin(req: Request, res: Response): boolean {
  const userRoles = req.user?.roles ?? [];
  if (!userRoles.includes('ADMINISTRADOR')) {
    res.status(403).json({
      status: 'FORBIDDEN',
      message:
        'Acceso denegado: Se requieren privilegios de Administración institucional.',
    });
    return false;
  }
  return true;
}

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
    if (!checkAdmin(req, res)) return;

    const { name, description, code } = req.body;
    if (!name) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'El nombre de la categoría es obligatorio',
      });
      return;
    }
    const category = await CatalogService.createCategory({
      name,
      description,
      code,
    });
    res.status(201).json({ status: 'SUCCESS', data: category });
  } catch (error: any) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      const isCode = Array.isArray(target)
        ? target.includes('code')
        : typeof target === 'string' && target.includes('code');
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: isCode
          ? 'Ya existe una categoría con este código'
          : 'Ya existe una categoría con este nombre',
      });
      return;
    }
    next(error);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!checkAdmin(req, res)) return;

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
  } catch (error: any) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      const isCode = Array.isArray(target)
        ? target.includes('code')
        : typeof target === 'string' && target.includes('code');
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: isCode
          ? 'Ya existe una categoría con este código'
          : 'Ya existe una categoría con este nombre',
      });
      return;
    }
    next(error);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!checkAdmin(req, res)) return;

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
  } catch (error: any) {
    if (
      error.statusCode === 400 ||
      (error.message && error.message.includes('No se puede eliminar'))
    ) {
      res.status(400).json({ status: 'BAD_REQUEST', message: error.message });
      return;
    }
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
    if (!checkAdmin(req, res)) return;

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
  } catch (error: any) {
    if (error.code === 'P2002') {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'Ya existe una marca con este nombre' });
      return;
    }
    next(error);
  }
};

export const updateBrand = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!checkAdmin(req, res)) return;

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
  } catch (error: any) {
    if (error.code === 'P2002') {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'Ya existe una marca con este nombre' });
      return;
    }
    next(error);
  }
};

export const deleteBrand = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!checkAdmin(req, res)) return;

    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'ID no proporcionado' });
      return;
    }
    await CatalogService.deleteBrand(Number(id));
    res
      .status(200)
      .json({ status: 'SUCCESS', message: 'Marca eliminada exitosamente' });
  } catch (error: any) {
    if (
      error.statusCode === 400 ||
      (error.message && error.message.includes('No se puede eliminar'))
    ) {
      res.status(400).json({ status: 'BAD_REQUEST', message: error.message });
      return;
    }
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
    if (!checkAdmin(req, res)) return;

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
  } catch (error: any) {
    if (error.code === 'P2002') {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'Ya existe una unidad con esta abreviatura' });
      return;
    }
    next(error);
  }
};

export const updateUnit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!checkAdmin(req, res)) return;

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
  } catch (error: any) {
    if (error.code === 'P2002') {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'Ya existe una unidad con esta abreviatura' });
      return;
    }
    next(error);
  }
};

export const deleteUnit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!checkAdmin(req, res)) return;

    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'ID no proporcionado' });
      return;
    }
    await CatalogService.deleteUnit(Number(id));
    res
      .status(200)
      .json({ status: 'SUCCESS', message: 'Unidad de medida eliminada exitosamente' });
  } catch (error: any) {
    if (
      error.statusCode === 400 ||
      (error.message && error.message.includes('No se puede eliminar'))
    ) {
      res.status(400).json({ status: 'BAD_REQUEST', message: error.message });
      return;
    }
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
    if (!checkAdmin(req, res)) return;

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
    if (!checkAdmin(req, res)) return;

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

export const deleteLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!checkAdmin(req, res)) return;

    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'ID no proporcionado' });
      return;
    }
    await CatalogService.deleteLocation(Number(id));
    res
      .status(200)
      .json({ status: 'SUCCESS', message: 'Ubicación física eliminada exitosamente' });
  } catch (error: any) {
    if (
      error.statusCode === 400 ||
      (error.message && error.message.includes('No se puede eliminar'))
    ) {
      res.status(400).json({ status: 'BAD_REQUEST', message: error.message });
      return;
    }
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
