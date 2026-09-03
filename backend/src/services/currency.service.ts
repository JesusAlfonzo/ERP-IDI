import { prisma } from '../config/prisma.js';

export interface RegisterExchangeRateDTO {
  currencyId: number;
  rate: number;
  effectiveDate?: Date;
  createdById: number;
}

export class CurrencyService {
  static async listCurrencies() {
    return prisma.currency.findMany({
      orderBy: { id: 'asc' },
    });
  }

  static async getLatestRates() {
    // Obtiene la última tasa registrada para cada moneda
    const currencies = await prisma.currency.findMany({
      include: {
        exchanges: {
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
      },
    });

    return currencies.map((curr) => ({
      id: curr.id,
      code: curr.code,
      name: curr.name,
      symbol: curr.symbol,
      isDefault: curr.isDefault,
      latestRate: curr.exchanges[0]?.rate ?? (curr.isDefault ? 1.0 : null),
      effectiveDate: curr.exchanges[0]?.effectiveDate ?? null,
    }));
  }

  static async registerRate(data: RegisterExchangeRateDTO) {
    const currency = await prisma.currency.findUnique({
      where: { id: data.currencyId },
    });

    if (!currency) {
      throw new Error('Moneda no encontrada');
    }

    return prisma.currencyExchange.create({
      data: {
        currencyId: data.currencyId,
        rate: data.rate,
        effectiveDate: data.effectiveDate ?? new Date(),
        createdById: data.createdById,
      },
      include: {
        currency: true,
      },
    });
  }
}
