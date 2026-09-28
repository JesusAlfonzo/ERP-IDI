import { prisma } from '../config/prisma.js';

export interface CreateBankAccountDTO {
  bankName: string;
  accountNumber?: string | null;
  type: string;
  currency: string;
  holderName: string;
  holderId: string;
  isActive?: boolean;
}

export interface UpdateBankAccountDTO {
  bankName?: string;
  accountNumber?: string | null;
  type?: string;
  currency?: string;
  holderName?: string;
  holderId?: string;
  isActive?: boolean;
}

export class BankAccountService {
  static async listAccounts(activeOnly = false) {
    return prisma.bankAccount.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { id: 'asc' },
    });
  }

  static async getAccountById(id: number) {
    return prisma.bankAccount.findUnique({
      where: { id },
      include: {
        payments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  static async createAccount(data: CreateBankAccountDTO) {
    return prisma.bankAccount.create({
      data: {
        bankName: data.bankName.trim(),
        accountNumber: data.accountNumber ? data.accountNumber.trim() : null,
        type: data.type || 'CORRIENTE',
        currency: (data.currency || 'USD').toUpperCase(),
        holderName: data.holderName.trim(),
        holderId: data.holderId.trim(),
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  static async updateAccount(id: number, data: UpdateBankAccountDTO) {
    return prisma.bankAccount.update({
      where: { id },
      data: {
        bankName: data.bankName !== undefined ? data.bankName.trim() : undefined,
        accountNumber:
          data.accountNumber !== undefined
            ? data.accountNumber
              ? data.accountNumber.trim()
              : null
            : undefined,
        type: data.type !== undefined ? data.type : undefined,
        currency:
          data.currency !== undefined ? data.currency.toUpperCase() : undefined,
        holderName:
          data.holderName !== undefined ? data.holderName.trim() : undefined,
        holderId:
          data.holderId !== undefined ? data.holderId.trim() : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });
  }

  static async deleteAccount(id: number) {
    // Verificar si tiene pagos vinculados
    const linkedPaymentsCount = await prisma.orderPayment.count({
      where: { sourceAccountId: id },
    });

    if (linkedPaymentsCount > 0) {
      // Soft-delete para preservar integridad referencial de auditoría contable
      return prisma.bankAccount.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return prisma.bankAccount.delete({
      where: { id },
    });
  }
}
