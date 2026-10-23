"use client";

import { useState, useMemo } from "react";
import type { JustificationConceptItem } from "@/services/inventory-master.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProtocolBadgeSelectorProps {
  concepts: JustificationConceptItem[];
  isConceptSelected: (concept: JustificationConceptItem) => boolean;
  onToggleConcept: (concept: JustificationConceptItem) => void;
  onClearAll?: () => void;
  className?: string;
}

export function ProtocolBadgeSelector({
  concepts,
  isConceptSelected,
  onToggleConcept,
  onClearAll,
  className,
}: ProtocolBadgeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filteredConcepts = useMemo(() => {
    if (!searchTerm.trim()) return concepts;
    const term = searchTerm.toLowerCase();
    return concepts.filter(
      (c) =>
        c.title.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term) ||
        (c.description && c.description.toLowerCase().includes(term))
    );
  }, [concepts, searchTerm]);

  const selectedCount = useMemo(() => {
    return concepts.filter((c) => isConceptSelected(c)).length;
  }, [concepts, isConceptSelected]);

  if (concepts.length === 0) return null;

  const displayLimit = showAll || searchTerm ? filteredConcepts.length : 8;
  const visibleConcepts = filteredConcepts.slice(0, displayLimit);

  return (
    <div
      className={cn(
        "space-y-2.5 rounded-xl border border-border/70 bg-muted/20 p-3.5 transition-colors",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span>Protocolos y Conceptos Frecuentes</span>
            <span className="text-[11px] text-muted-foreground font-normal ml-1.5 hidden sm:inline">
              (Haz clic para activar o desactivar de la justificación)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedCount > 0 && onClearAll && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-7 text-[11px] text-muted-foreground hover:text-destructive gap-1 px-2"
              title="Quitar todos los protocolos seleccionados de la justificación"
            >
              <RotateCcw className="w-3 h-3" />
              Limpiar ({selectedCount})
            </Button>
          )}

          {concepts.length > 8 && (
            <div className="relative w-full sm:w-44">
              <Search className="w-3 h-3 absolute left-2 top-2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar protocolo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 text-[11px] pl-7 py-0 bg-background"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {visibleConcepts.map((concept) => {
          const selected = isConceptSelected(concept);

          return (
            <button
              key={concept.id}
              type="button"
              onClick={() => onToggleConcept(concept)}
              className={cn(
                "group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all text-left shadow-2xs cursor-pointer border",
                selected
                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-sm"
                  : "bg-background text-foreground border-border hover:border-primary/40 hover:bg-muted/70"
              )}
              title={
                selected
                  ? `[ACTIVO] Haz clic para remover '${concept.title}' de la justificación`
                  : concept.description || concept.title
              }
            >
              {selected ? (
                <Check className="w-3 h-3 text-primary-foreground shrink-0" />
              ) : (
                <span className="font-mono text-[10px] text-primary font-bold bg-primary/10 px-1 py-0.2 rounded">
                  {concept.code}
                </span>
              )}
              <span className="truncate max-w-[220px]">{concept.title}</span>
            </button>
          );
        })}

        {filteredConcepts.length === 0 && (
          <span className="text-xs text-muted-foreground italic py-1">
            No se encontraron protocolos con ese criterio.
          </span>
        )}

        {concepts.length > 8 && !searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAll((prev) => !prev)}
            className="h-6 text-[11px] text-primary hover:text-primary/80 px-2"
          >
            {showAll ? "Mostrar menos" : `+ Ver todos (${concepts.length})`}
          </Button>
        )}
      </div>
    </div>
  );
}
