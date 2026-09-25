import type { Request, Response } from 'express';
import { InventoryMasterService } from '../services/inventory-master.service.js';
import type { LocationType } from '@prisma/client';

export class InventoryMasterController {
  // Helper de validación de rol de Administrador
  private static checkAdmin(req: Request, res: Response): boolean {
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
  static async getCategories(_req: Request, res: Response): Promise<void> {
    try {
      const categories = await InventoryMasterService.listCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: 'Error al obtener categorías', error });
    }
  }

  static async createCategory(req: Request, res: Response): Promise<void> {
    try {
      if (!InventoryMasterController.checkAdmin(req, res)) return;

      const { name, description, code } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: 'El nombre de la categoría debe tener al menos 2 caracteres',
        });
        return;
      }

      const category = await InventoryMasterService.createCategory({
        name,
        description,
        code,
      });
      res.status(201).json(category);
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
      res.status(500).json({ message: 'Error al registrar categoría', error });
    }
  }

  static async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      if (!InventoryMasterController.checkAdmin(req, res)) return;

      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ status: 'BAD_REQUEST', message: 'ID no válido' });
        return;
      }

      const { name, description, code } = req.body;
      if (
        name !== undefined &&
        (typeof name !== 'string' || name.trim().length < 2)
      ) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: 'El nombre de la categoría debe tener al menos 2 caracteres',
        });
        return;
      }

      const category = await InventoryMasterService.updateCategory(id, {
        name,
        description,
        code,
      });
      res.json(category);
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
      res.status(500).json({ message: 'Error al actualizar categoría', error });
    }
  }

  static async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      if (!InventoryMasterController.checkAdmin(req, res)) return;

      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ status: 'BAD_REQUEST', message: 'ID no válido' });
        return;
      }

      await InventoryMasterService.deleteCategory(id);
      res.json({ status: 'SUCCESS', message: 'Categoría eliminada exitosamente' });
    } catch (error: any) {
      if (
        error.statusCode === 400 ||
        (error.message && error.message.includes('No se puede eliminar'))
      ) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: error.message,
        });
        return;
      }
      res.status(500).json({ message: 'Error al eliminar categoría', error });
    }
  }

  // --- MARCAS ---
  static async getBrands(_req: Request, res: Response): Promise<void> {
    try {
      const brands = await InventoryMasterService.listBrands();
      res.json(brands);
    } catch (error) {
      res.status(500).json({ message: 'Error al obtener marcas', error });
    }
  }

  static async createBrand(req: Request, res: Response): Promise<void> {
    try {
      if (!InventoryMasterController.checkAdmin(req, res)) return;

      const { name, description } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: 'El nombre de la marca debe tener al menos 2 caracteres',
        });
        return;
      }
      const brand = await InventoryMasterService.createBrand({
        name,
        description,
      });
      res.status(201).json(brand);
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: 'Ya existe una marca con este nombre',
        });
        return;
      }
      res.status(500).json({ message: 'Error al registrar marca', error });
    }
  }

  static async updateBrand(req: Request, res: Response): Promise<void> {
    try {
      if (!InventoryMasterController.checkAdmin(req, res)) return;

      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ status: 'BAD_REQUEST', message: 'ID no válido' });
        return;
      }

      const { name, description } = req.body;
      if (
        name !== undefined &&
        (typeof name !== 'string' || name.trim().length < 2)
      ) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: 'El nombre de la marca debe tener al menos 2 caracteres',
        });
        return;
      }

      const brand = await InventoryMasterService.updateBrand(id, {
        name,
        description,
      });
      res.json(brand);
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: 'Ya existe una marca con este nombre',
        });
        return;
      }
      res.status(500).json({ message: 'Error al actualizar marca', error });
    }
  }

  static async deleteBrand(req: Request, res: Response): Promise<void> {
    try {
      if (!InventoryMasterController.checkAdmin(req, res)) return;

      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ status: 'BAD_REQUEST', message: 'ID no válido' });
        return;
      }

      await InventoryMasterService.deleteBrand(id);
      res.json({ status: 'SUCCESS', message: 'Marca eliminada exitosamente' });
    } catch (error: any) {
      if (
        error.statusCode === 400 ||
        (error.message && error.message.includes('No se puede eliminar'))
      ) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: error.message,
        });
        return;
      }
      res.status(500).json({ message: 'Error al eliminar marca', error });
    }
  }

  // --- UNIDADES ---
  static async getUnits(_req: Request, res: Response): Promise<void> {
    try {
      const units = await InventoryMasterService.listUnits();
      res.json(units);
    } catch (error) {
      res.status(500).json({ message: 'Error al obtener unidades', error });
    }
  }

  static async createUnit(req: Request, res: Response): Promise<void> {
    try {
      if (!InventoryMasterController.checkAdmin(req, res)) return;

      const { name, abbreviation } = req.body;
      if (!name || !abbreviation) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: 'Nombre y abreviatura son requeridos',
        });
        return;
      }
      const unit = await InventoryMasterService.createUnit({
        name,
        abbreviation,
      });
      res.status(201).json(unit);
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: 'Ya existe una unidad con esta abreviatura',
        });
        return;
      }
      res.status(500).json({ message: 'Error al registrar unidad', error });
    }
  }

  static async updateUnit(req: Request, res: Response): Promise<void> {
    try {
      if (!InventoryMasterController.checkAdmin(req, res)) return;

      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ status: 'BAD_REQUEST', message: 'ID no válido' });
        return;
      }

      const { name, abbreviation } = req.body;
      const unit = await InventoryMasterService.updateUnit(id, {
        name,
        abbreviation,
      });
      res.json(unit);
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: 'Ya existe una unidad con esta abreviatura',
        });
        return;
      }
      res.status(500).json({ message: 'Error al actualizar unidad', error });
    }
  }

  static async deleteUnit(req: Request, res: Response): Promise<void> {
    try {
      if (!InventoryMasterController.checkAdmin(req, res)) return;

      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ status: 'BAD_REQUEST', message: 'ID no válido' });
        return;
      }

      await InventoryMasterService.deleteUnit(id);
      res.json({
        status: 'SUCCESS',
        message: 'Unidad de medida eliminada exitosamente',
      });
    } catch (error: any) {
      if (
        error.statusCode === 400 ||
        (error.message && error.message.includes('No se puede eliminar'))
      ) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: error.message,
        });
        return;
      }
      res.status(500).json({
        message: 'Error al eliminar unidad de medida',
        error,
      });
    }
  }

  // --- UBICACIONES ---
  static async getLocations(_req: Request, res: Response): Promise<void> {
    try {
      const locations = await InventoryMasterService.listLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: 'Error al obtener ubicaciones', error });
    }
  }

  static async createLocation(req: Request, res: Response): Promise<void> {
    try {
      if (!InventoryMasterController.checkAdmin(req, res)) return;

      const { name, type, description } = req.body;
      const validTypes: LocationType[] = [
        'ALMACEN_GENERAL',
        'LABORATORIO',
        'OFICINA',
        'DEPOSITO',
      ];
      if (!name || !validTypes.includes(type)) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: 'Nombre y un tipo de ubicación válido son requeridos',
        });
        return;
      }
      const location = await InventoryMasterService.createLocation({
        name,
        type,
        description,
      });
      res.status(201).json(location);
    } catch (error) {
      res.status(500).json({ message: 'Error al registrar ubicación', error });
    }
  }

  static async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      if (!InventoryMasterController.checkAdmin(req, res)) return;

      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ status: 'BAD_REQUEST', message: 'ID no válido' });
        return;
      }

      const { name, type, description } = req.body;
      const validTypes: LocationType[] = [
        'ALMACEN_GENERAL',
        'LABORATORIO',
        'OFICINA',
        'DEPOSITO',
      ];
      if (type !== undefined && !validTypes.includes(type)) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: 'Tipo de ubicación no válido',
        });
        return;
      }

      const location = await InventoryMasterService.updateLocation(id, {
        name,
        type,
        description,
      });
      res.json(location);
    } catch (error) {
      res.status(500).json({ message: 'Error al actualizar ubicación', error });
    }
  }

  static async deleteLocation(req: Request, res: Response): Promise<void> {
    try {
      if (!InventoryMasterController.checkAdmin(req, res)) return;

      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ status: 'BAD_REQUEST', message: 'ID no válido' });
        return;
      }

      await InventoryMasterService.deleteLocation(id);
      res.json({
        status: 'SUCCESS',
        message: 'Ubicación física eliminada exitosamente',
      });
    } catch (error: any) {
      if (
        error.statusCode === 400 ||
        (error.message && error.message.includes('No se puede eliminar'))
      ) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: error.message,
        });
        return;
      }
      res.status(500).json({
        message: 'Error al eliminar ubicación física',
        error,
      });
    }
  }
}
