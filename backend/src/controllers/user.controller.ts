import type { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.js';
import { serializeBigInt } from '../utils/serializer.js';

export const listUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await UserService.getAllUsers();
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(users),
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
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

    const user = await UserService.getUserById(Number(id));
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(user),
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username, email, password, fullName, department, roleIds } =
      req.body;

    if (!username || !email || !password || !fullName || !department) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Todos los campos obligatorios deben ser proporcionados',
      });
      return;
    }

    const newUser = await UserService.createUser({
      username,
      email,
      password,
      fullName,
      department,
      roleIds: Array.isArray(roleIds) ? roleIds.map(Number) : [],
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Usuario registrado exitosamente',
      data: serializeBigInt(newUser),
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
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

    const updatedUser = await UserService.updateUser(Number(id), req.body);

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Usuario actualizado exitosamente',
      data: serializeBigInt(updatedUser),
    });
  } catch (error) {
    next(error);
  }
};

export const syncUserRoles = async (
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

    const { roleIds } = req.body;
    if (!Array.isArray(roleIds)) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Debe suministrar un arreglo de IDs de roles',
      });
      return;
    }

    const updatedUser = await UserService.syncUserRoles(
      Number(id),
      roleIds.map(Number)
    );

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Roles sincronizados exitosamente',
      data: serializeBigInt(updatedUser),
    });
  } catch (error) {
    next(error);
  }
};

export const listRoles = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roles = await UserService.getAvailableRoles();
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(roles),
    });
  } catch (error) {
    next(error);
  }
};
