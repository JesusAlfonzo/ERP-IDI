import { apiClient } from "@/lib/api-client";

export interface CurrencyExchange {
  id: number;
  currencyId: number;
  rate: string | number;
  effectiveDate: string;
  createdAt: string;
}

export interface CurrencyItem {
  id: number;
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
  exchangeRates?: CurrencyExchange[];
  rates?: CurrencyExchange[];
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
  }): Promise<CurrencyExchange> => {
    const res = await apiClient.post("/currencies/rate", data);
    return res.data?.data ?? res.data;
  },
};
