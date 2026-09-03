import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import type { AuthUserPayload } from '../types/express.js';

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_default_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export class AuthService {
  static async login(identifier: string, pass: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new Error('Usuario deshabilitado. Contacte a soporte.');
    }

    const isPasswordValid = await bcrypt.compare(pass, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);

    const payload: AuthUserPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      department: user.department,
      roles,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        department: user.department,
        roles,
      },
    };
  }

  static async getMe(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        department: true,
        isActive: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return {
      ...user,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }
}
