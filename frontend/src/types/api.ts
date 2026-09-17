export interface ApiResponse<T> {
  status:
    | "SUCCESS"
    | "ERROR"
    | "VALIDATION_ERROR"
    | "UNAUTHORIZED"
    | "FORBIDDEN";
  data?: T;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  totalItems: number;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  data: T[];
  meta: PaginationMeta;
}
