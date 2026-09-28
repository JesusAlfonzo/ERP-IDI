import type { Request, Response, NextFunction } from 'express';
import { DepartmentService } from '../services/department.service.js';

export class DepartmentController {
  static async getDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const search = req.query.search ? String(req.query.search) : undefined;
      const departments = await DepartmentService.listDepartments({ activeOnly, search });
      res.json(departments);
    } catch (error) {
      next(error);
    }
  }

  static async getDepartmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ status: 'BAD_REQUEST', message: 'ID inválido' });
        return;
      }
      const department = await DepartmentService.getDepartmentById(id);
      res.json(department);
    } catch (error) {
      next(error);
    }
  }

  static async createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, name, description, isActive } = req.body;

      if (!code || typeof code !== 'string' || code.trim().length < 2) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: 'El código del departamento es obligatorio (mínimo 2 caracteres)',
        });
        return;
      }

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: 'El nombre del departamento es obligatorio (mínimo 2 caracteres)',
        });
        return;
      }

      const department = await DepartmentService.createDepartment({
        code,
        name,
        description,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      });

      res.status(201).json(department);
    } catch (error: any) {
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        const isCode = Array.isArray(target)
          ? target.includes('code')
          : typeof target === 'string' && target.includes('code');
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: isCode
            ? 'Ya existe un departamento con este código'
            : 'Ya existe un departamento con este nombre',
        });
        return;
      }
      next(error);
    }
  }

  static async updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ status: 'BAD_REQUEST', message: 'ID inválido' });
        return;
      }

      const { code, name, description, isActive } = req.body;

      if (code !== undefined && (typeof code !== 'string' || code.trim().length < 2)) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: 'El código debe tener al menos 2 caracteres',
        });
        return;
      }

      if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: 'El nombre debe tener al menos 2 caracteres',
        });
        return;
      }

      const updated = await DepartmentService.updateDepartment(id, {
        code,
        name,
        description,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      });

      res.json(updated);
    } catch (error: any) {
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        const isCode = Array.isArray(target)
          ? target.includes('code')
          : typeof target === 'string' && target.includes('code');
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: isCode
            ? 'Ya existe un departamento con este código'
            : 'Ya existe un departamento con este nombre',
        });
        return;
      }
      next(error);
    }
  }

  static async deleteDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ status: 'BAD_REQUEST', message: 'ID inválido' });
        return;
      }

      await DepartmentService.deleteDepartment(id);
      res.json({ status: 'SUCCESS', message: 'Departamento eliminado correctamente' });
    } catch (error: any) {
      if (error.status === 400) {
        res.status(400).json({ status: 'BAD_REQUEST', message: error.message });
        return;
      }
      next(error);
    }
  }
}
