import type { Request, Response } from 'express';
import { InventoryMasterService } from '../services/inventory-master.service.js';
import type { LocationType } from '@prisma/client';

export class InventoryMasterController {
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
      const { name, description } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        res
          .status(400)
          .json({
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
        res
          .status(400)
          .json({ message: 'Ya existe una marca con este nombre' });
        return;
      }
      res.status(500).json({ message: 'Error al registrar marca', error });
    }
  }

  static async updateBrand(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const brand = await InventoryMasterService.updateBrand(id, req.body);
      res.json(brand);
    } catch (error) {
      res.status(500).json({ message: 'Error al actualizar marca', error });
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
      const { name, abbreviation } = req.body;
      if (!name || !abbreviation) {
        res
          .status(400)
          .json({ message: 'Nombre y abreviatura son requeridos' });
        return;
      }
      const unit = await InventoryMasterService.createUnit({
        name,
        abbreviation,
      });
      res.status(201).json(unit);
    } catch (error: any) {
      if (error.code === 'P2002') {
        res
          .status(400)
          .json({ message: 'Ya existe una unidad con esta abreviatura' });
        return;
      }
      res.status(500).json({ message: 'Error al registrar unidad', error });
    }
  }

  static async updateUnit(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const unit = await InventoryMasterService.updateUnit(id, req.body);
      res.json(unit);
    } catch (error) {
      res.status(500).json({ message: 'Error al actualizar unidad', error });
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
      const { name, type, description } = req.body;
      const validTypes: LocationType[] = [
        'ALMACEN_GENERAL',
        'LABORATORIO',
        'OFICINA',
        'DEPOSITO',
      ];
      if (!name || !validTypes.includes(type)) {
        res
          .status(400)
          .json({
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
      const id = Number(req.params.id);
      const location = await InventoryMasterService.updateLocation(
        id,
        req.body
      );
      res.json(location);
    } catch (error) {
      res.status(500).json({ message: 'Error al actualizar ubicación', error });
    }
  }
}
