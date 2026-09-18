import { prisma } from '../config/prisma.js';
import bcrypt from 'bcrypt';

export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  fullName: string;
  department: string;
  roleIds: number[];
}

export interface UpdateUserDTO {
  email?: string;
  fullName?: string;
  department?: string;
  isActive?: boolean;
  password?: string;
  roles?: string[];
  roleIds?: number[];
}

const userSafeSelect = {
  id: true,
  username: true,
  email: true,
  fullName: true,
  department: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  userRoles: {
    include: {
      role: true,
    },
  },
};

export class UserService {
  /**
   * Obtiene todos los usuarios registrados con sus roles asociados
   */
  static async getAllUsers() {
    return prisma.user.findMany({
      select: userSafeSelect,
      orderBy: { id: 'asc' },
    });
  }

  /**
   * Obtiene un usuario específico por ID
   */
  static async getUserById(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSafeSelect,
    });

    if (!user) {
      throw new Error(`Usuario con ID ${userId} no encontrado`);
    }

    return user;
  }

  /**
   * Crea un nuevo usuario y asigna sus roles iniciales
   */
  static async createUser(data: CreateUserDTO) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existing) {
      throw new Error(
        'Ya existe un usuario registrado con ese correo o nombre de usuario'
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: data.username,
          email: data.email,
          fullName: data.fullName,
          department: data.department,
          passwordHash,
          isActive: true,
        },
      });

      if (data.roleIds && data.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: data.roleIds.map((roleId) => ({
            userId: newUser.id,
            roleId,
          })),
        });
      }

      return tx.user.findUnique({
        where: { id: newUser.id },
        select: userSafeSelect,
      });
    });
  }

  /**
   * Actualiza los datos de perfil o contraseña de un usuario
   */
  static async updateUser(
    userId: number,
    data: UpdateUserDTO,
    actorId?: number
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`Usuario con ID ${userId} no encontrado`);
    }

    let passwordHash = user.passwordHash;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 10);
    }

    return prisma.$transaction(async (tx) => {
      const requestedRoleIds =
        data.roleIds ??
        (data.roles
          ? (
              await tx.role.findMany({
                where: { name: { in: data.roles } },
                select: { id: true },
              })
            ).map((role) => role.id)
          : undefined);
      if (actorId === userId && data.isActive === false) {
        throw new Error('No puede desactivar su propia cuenta');
      }
      if (
        actorId === userId &&
        requestedRoleIds &&
        !requestedRoleIds.includes(1)
      ) {
        throw new Error(
          'No puede revocar el rol ADMINISTRADOR de su propia cuenta'
        );
      }
      if (requestedRoleIds && requestedRoleIds.length === 0) {
        throw new Error('El usuario debe conservar al menos un rol');
      }
      if (requestedRoleIds && !requestedRoleIds.includes(1)) {
        const activeAdmins = await tx.user.count({
          where: { isActive: true, userRoles: { some: { roleId: 1 } } },
        });
        const targetIsAdmin = await tx.userRole.findFirst({
          where: { userId, roleId: 1 },
        });
        if (targetIsAdmin && activeAdmins <= 1) {
          throw new Error('No se puede revocar el último administrador activo');
        }
      }
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          email: data.email ?? user.email,
          fullName: data.fullName ?? user.fullName,
          department: data.department ?? user.department,
          isActive: data.isActive !== undefined ? data.isActive : user.isActive,
          passwordHash,
        },
        select: userSafeSelect,
      });
      if (requestedRoleIds) {
        await tx.userRole.deleteMany({ where: { userId } });
        await tx.userRole.createMany({
          data: requestedRoleIds.map((roleId) => ({ userId, roleId })),
        });
      }
      return tx.user.findUnique({
        where: { id: updated.id },
        select: userSafeSelect,
      });
    });
  }

  static async resetPassword(userId: number, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new Error(`Usuario con ID ${userId} no encontrado`);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  /**
   * Sincroniza los roles de un usuario
   */
  static async syncUserRoles(
    userId: number,
    roleIds: number[],
    actorId?: number
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`Usuario con ID ${userId} no encontrado`);
    }

    return prisma.$transaction(async (tx) => {
      if (roleIds.length === 0) {
        throw new Error('El usuario debe conservar al menos un rol');
      }
      if (actorId === userId && !roleIds.includes(1)) {
        throw new Error(
          'No puede revocar el rol ADMINISTRADOR de su propia cuenta'
        );
      }
      if (!roleIds.includes(1)) {
        const targetIsAdmin = await tx.userRole.findFirst({
          where: { userId, roleId: 1 },
        });
        const activeAdmins = await tx.user.count({
          where: { isActive: true, userRoles: { some: { roleId: 1 } } },
        });
        if (targetIsAdmin && activeAdmins <= 1) {
          throw new Error('No se puede revocar el último administrador activo');
        }
      }
      await tx.userRole.deleteMany({
        where: { userId },
      });

      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId,
            roleId,
          })),
        });
      }

      return tx.user.findUnique({
        where: { id: userId },
        select: userSafeSelect,
      });
    });
  }

  /**
   * Listado de roles disponibles en el sistema
   */
  static async getAvailableRoles() {
    return prisma.role.findMany({
      orderBy: { id: 'asc' },
    });
  }

  static async getRoleIdsByNames(names: string[]) {
    if (names.length === 0) return [];
    const roles = await prisma.role.findMany({
      where: { name: { in: names } },
      select: { id: true, name: true },
    });
    if (roles.length !== names.length) {
      throw new Error('Uno o más roles solicitados no existen');
    }
    return roles.map((role) => role.id);
  }
}
