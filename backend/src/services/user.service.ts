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
  static async updateUser(userId: number, data: UpdateUserDTO) {
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

    return prisma.user.update({
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
  }

  /**
   * Sincroniza los roles de un usuario
   */
  static async syncUserRoles(userId: number, roleIds: number[]) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`Usuario con ID ${userId} no encontrado`);
    }

    return prisma.$transaction(async (tx) => {
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
}
