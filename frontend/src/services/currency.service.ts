import { apiClient } from "@/lib/api-client";

export interface CurrencyItem {
  id: number;
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
  latestRate: string | number | null;
  effectiveDate: string | null;
}

export interface CurrencyExchangeRecord {
  id: number;
  currencyId: number;
  rate: string | number;
  effectiveDate: string;
  createdById: number;
  createdAt?: string;
  currency?: {
    id: number;
    code: string;
    name: string;
    symbol: string;
  };
}

export const CurrencyService = {
  getCurrencies: async (): Promise<CurrencyItem[]> => {
    const res = await apiClient.get("/currencies");
    return res.data?.data ?? res.data;
  },

  registerRate: async (data: {
    currencyId: number;
    rate: number;
    effectiveDate?: string;
  }): Promise<CurrencyExchangeRecord> => {
    const res = await apiClient.post("/currencies/rate", data);
    return res.data?.data ?? res.data;
  },
};
