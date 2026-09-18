import type { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.js';
import { serializeBigInt } from '../utils/serializer.js';

const withRoles = (user: any) => ({
  ...user,
  roles: user.userRoles?.map((userRole: any) => userRole.role.name) ?? [],
});

export const listUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await UserService.getAllUsers();
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(users.map(withRoles)),
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
      data: serializeBigInt(withRoles(user)),
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
    const { username, email, password, fullName, department, roleIds, roles } =
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
      roleIds: Array.isArray(roleIds)
        ? roleIds.map(Number)
        : await UserService.getRoleIdsByNames(
            Array.isArray(roles) ? roles : []
          ),
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Usuario registrado exitosamente',
      data: serializeBigInt(withRoles(newUser)),
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

    const updatedUser = await UserService.updateUser(
      Number(id),
      req.body,
      req.user?.id
    );

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Usuario actualizado exitosamente',
      data: serializeBigInt(withRoles(updatedUser)),
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const newPassword = String(req.body?.newPassword ?? '');
    if (!id || newPassword.length < 8) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message:
          'newPassword es obligatorio y debe tener al menos 8 caracteres',
      });
      return;
    }
    await UserService.resetPassword(Number(id), newPassword);
    res.status(200).json({
      status: 'SUCCESS',
      message: 'Contraseña restablecida exitosamente',
      data: { message: 'Contraseña restablecida exitosamente' },
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
      roleIds.map(Number),
      req.user?.id
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
