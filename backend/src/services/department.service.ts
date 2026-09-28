import { prisma } from '../config/prisma.js';

export interface CreateDepartmentDTO {
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateDepartmentDTO {
  code?: string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export class DepartmentService {
  static async listDepartments(filter?: { activeOnly?: boolean; search?: string }) {
    return prisma.department.findMany({
      where: {
        ...(filter?.activeOnly ? { isActive: true } : {}),
        ...(filter?.search
          ? {
              OR: [
                { name: { contains: filter.search.trim(), mode: 'insensitive' } },
                { code: { contains: filter.search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            requests: true,
            purchaseRequisitions: true,
          },
        },
      },
    });
  }

  static async getDepartmentById(id: number) {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            requests: true,
            purchaseRequisitions: true,
          },
        },
      },
    });

    if (!department) {
      const error: any = new Error('Departamento no encontrado');
      error.status = 404;
      throw error;
    }

    return department;
  }

  static async createDepartment(data: CreateDepartmentDTO) {
    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();

    return prisma.department.create({
      data: {
        code,
        name,
        description: data.description?.trim() || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      include: {
        _count: {
          select: {
            requests: true,
            purchaseRequisitions: true,
          },
        },
      },
    });
  }

  static async updateDepartment(id: number, data: UpdateDepartmentDTO) {
    await this.getDepartmentById(id);

    return prisma.department.update({
      where: { id },
      data: {
        ...(data.code !== undefined ? { code: data.code.trim().toUpperCase() } : {}),
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: {
        _count: {
          select: {
            requests: true,
            purchaseRequisitions: true,
          },
        },
      },
    });
  }

  static async deleteDepartment(id: number) {
    const department = await this.getDepartmentById(id);

    const totalRelations =
      department._count.requests + department._count.purchaseRequisitions;

    if (totalRelations > 0) {
      const error: any = new Error(
        `No se puede eliminar el departamento: tiene ${totalRelations} registro(s) vinculado(s) (solicitudes/preórdenes). Puede desactivarlo en su lugar.`
      );
      error.status = 400;
      throw error;
    }

    return prisma.department.delete({
      where: { id },
    });
  }
}
