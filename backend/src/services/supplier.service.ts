import { prisma } from '../config/prisma.js';

export interface CreateSupplierDTO {
  rifOrId: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface UpdateSupplierDTO {
  name?: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive?: boolean;
}

export class SupplierService {
  static async listSuppliers(search?: string) {
    return prisma.supplier.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { rifOrId: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                { contactName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getSupplierById(id: number) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new Error('Proveedor no encontrado');
    }

    return supplier;
  }

  static async createSupplier(data: CreateSupplierDTO) {
    const existing = await prisma.supplier.findUnique({
      where: { rifOrId: data.rifOrId.trim().toUpperCase() },
    });

    if (existing) {
      throw new Error(
        'Ya existe un proveedor registrado con este RIF o identificación'
      );
    }

    return prisma.supplier.create({
      data: {
        rifOrId: data.rifOrId.trim().toUpperCase(),
        name: data.name.trim(),
        contactName: data.contactName ?? null,
        phone: data.phone ?? null,
        email: data.email ? data.email.trim().toLowerCase() : null,
        address: data.address ?? null,
      },
    });
  }

  static async updateSupplier(id: number, data: UpdateSupplierDTO) {
    const supplier = await prisma.supplier.findUnique({ where: { id } });

    if (!supplier) {
      throw new Error('Proveedor no encontrado');
    }

    return prisma.supplier.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.contactName !== undefined
          ? { contactName: data.contactName }
          : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined
          ? { email: data.email ? data.email.trim().toLowerCase() : null }
          : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  static async deleteSupplier(id: number) {
    const supplier = await prisma.supplier.findUnique({ where: { id } });

    if (!supplier) {
      throw new Error('Proveedor no encontrado');
    }

    // Desactivación lógica para no romper historial de órdenes
    return prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
