"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  entityName?: string;
  className?: string;
}

export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  entityName = "registros",
  className,
}: TablePaginationProps) {
  if (totalItems <= 0) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);
  const startRecord = (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, totalItems);

  return (
    <div
      className={cn(
        "p-3.5 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none",
        className
      )}
    >
      {/* Contador de registros */}
      <div className="text-muted-foreground font-medium text-center sm:text-left">
        Mostrando{" "}
        <span className="font-bold text-foreground font-mono">
          {startRecord}
        </span>{" "}
        a{" "}
        <span className="font-bold text-foreground font-mono">
          {endRecord}
        </span>{" "}
        de{" "}
        <span className="font-bold text-foreground font-mono">
          {totalItems}
        </span>{" "}
        {entityName}
      </div>

      {/* Controles de navegación y tamaño de página */}
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center sm:justify-end">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground whitespace-nowrap">Por página:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
              }}
              className="h-8 bg-background border border-input rounded-md px-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage <= 1}
            className="h-8 w-8 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Primera página"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
            disabled={safeCurrentPage <= 1}
            className="h-8 w-8 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Página anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>

          <div className="px-2 font-mono font-medium text-foreground text-xs whitespace-nowrap">
            Página <strong className="font-bold">{safeCurrentPage}</strong> de{" "}
            <strong className="font-bold">{safeTotalPages}</strong>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))}
            disabled={safeCurrentPage >= safeTotalPages}
            className="h-8 w-8 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Página siguiente"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(safeTotalPages)}
            disabled={safeCurrentPage >= safeTotalPages}
            className="h-8 w-8 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Última página"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
