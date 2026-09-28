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

export interface CurrentExchangeRates {
  USD: number;
  EUR: number;
  VED: number;
  VES: number;
  rate?: number;
  usdRate?: number;
  bcvRate?: number;
  eurRate?: number;
  date?: string;
  effectiveDate?: string;
  lastUpdated?: string;
  rates: {
    USD: number;
    EUR: number;
    VED: number;
    VES?: number;
  };
}

export const CurrencyService = {
  getCurrencies: async (): Promise<CurrencyItem[]> => {
    const res = await apiClient.get("/currencies", {
      params: { _t: Date.now() },
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    return res.data?.data ?? res.data;
  },

  getCurrentRates: async (): Promise<CurrentExchangeRates> => {
    const res = await apiClient.get("/exchange-rates/current", {
      params: { _t: Date.now() },
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    return res.data?.data ?? res.data;
  },

  registerRate: async (data: {
    currencyId?: number;
    code?: string;
    rate?: number;
    usdRate?: number;
    eurRate?: number;
    effectiveDate?: string;
  }): Promise<CurrencyExchangeRecord> => {
    const res = await apiClient.post("/currencies/rate", data);
    return res.data?.data ?? res.data;
  },

  updateExchangeRate: async (data: {
    currencyId?: number;
    code?: string;
    rate?: number;
    usdRate?: number;
    eurRate?: number;
    rates?: Record<string, number> | Array<{ currencyId: number; rate: number }>;
    effectiveDate?: string;
  }): Promise<CurrentExchangeRates> => {
    const res = await apiClient.put("/exchange-rates", data);
    return res.data?.data ?? res.data;
  },
};

