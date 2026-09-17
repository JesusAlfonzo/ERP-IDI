import type { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export const getPaginationParams = (
  req: Request,
  defaultLimit: number = 20,
  maxLimit: number = 100
): PaginationParams => {
  const rawPage = Number(req.query.page);
  const rawLimit = Number(req.query.limit);

  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const parsedLimit =
    Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : defaultLimit;
  const limit = Math.min(parsedLimit, maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const createPaginatedResponse = <T>(
  items: T[],
  totalItems: number,
  params: PaginationParams
): PaginatedResult<T> => {
  const totalPages = Math.ceil(totalItems / params.limit) || 1;

  return {
    items,
    meta: {
      totalItems,
      itemCount: items.length,
      itemsPerPage: params.limit,
      totalPages,
      currentPage: params.page,
    },
  };
};
