"use client";

import { useState, useMemo } from "react";
import type { JustificationConceptItem } from "@/services/inventory-master.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Extrae una única palabra representativa como resumen del concepto/justificación.
 */
export function getConceptSummaryWord(concept: JustificationConceptItem): string {
  const code = (concept.code || "").toUpperCase();
  const title = (concept.title || "").toLowerCase();

  if (code.includes("URG") || title.includes("urgencia")) return "Urgencia";
  if (code.includes("REP") || title.includes("reposic")) return "Reposición";
  if (code.includes("INV") || title.includes("investig") || title.includes("protocolo")) return "Investigación";
  if (code.includes("CALIB") || title.includes("calibrac")) return "Calibración";
  if (code.includes("MANT") || title.includes("mantenimiento")) return "Mantenimiento";
  if (code.includes("DOT") || title.includes("dotaci")) return "Dotación";
  if (title.includes("rutina") || title.includes("regular")) return "Rutinario";
  if (title.includes("control") || title.includes("calidad")) return "Calidad";
  if (title.includes("emergencia")) return "Emergencia";
  if (title.includes("seguridad")) return "Seguridad";

  // En caso de títulos personalizados, tomar la primera palabra limpia
  const firstWord = concept.title
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, "");
  return firstWord || "Justificación";
}

/**
 * Paleta de colores vivos y modernos sin bordes negros para cada tipo de justificación.
 */
export function getConceptColorTheme(word: string) {
  switch (word.toLowerCase()) {
    case "urgencia":
    case "emergencia":
      return {
        unselected:
          "bg-rose-50/90 text-rose-700 border-rose-200/90 hover:bg-rose-100/90 hover:border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/70",
        selected:
          "bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/30 font-semibold ring-2 ring-rose-500/20",
        dot: "bg-rose-500",
      };
    case "reposición":
      return {
        unselected:
          "bg-emerald-50/90 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100/90 hover:border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/70",
        selected:
          "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30 font-semibold ring-2 ring-emerald-500/20",
        dot: "bg-emerald-500",
      };
    case "investigación":
      return {
        unselected:
          "bg-indigo-50/90 text-indigo-700 border-indigo-200/90 hover:bg-indigo-100/90 hover:border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/70",
        selected:
          "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30 font-semibold ring-2 ring-indigo-500/20",
        dot: "bg-indigo-500",
      };
    case "calibración":
    case "mantenimiento":
      return {
        unselected:
          "bg-sky-50/90 text-sky-700 border-sky-200/90 hover:bg-sky-100/90 hover:border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/70",
        selected:
          "bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-600/30 font-semibold ring-2 ring-sky-500/20",
        dot: "bg-sky-500",
      };
    case "dotación":
      return {
        unselected:
          "bg-amber-50/90 text-amber-700 border-amber-200/90 hover:bg-amber-100/90 hover:border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/70",
        selected:
          "bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-600/30 font-semibold ring-2 ring-amber-500/20",
        dot: "bg-amber-500",
      };
    case "calidad":
      return {
        unselected:
          "bg-purple-50/90 text-purple-700 border-purple-200/90 hover:bg-purple-100/90 hover:border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/70",
        selected:
          "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-600/30 font-semibold ring-2 ring-purple-500/20",
        dot: "bg-purple-500",
      };
    default:
      return {
        unselected:
          "bg-teal-50/90 text-teal-700 border-teal-200/90 hover:bg-teal-100/90 hover:border-teal-300 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/70",
        selected:
          "bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-600/30 font-semibold ring-2 ring-teal-500/20",
        dot: "bg-teal-500",
      };
  }
}

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
        "space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3.5 transition-colors",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span>Conceptos de Justificación</span>
            <span className="text-[11px] text-muted-foreground font-normal ml-1.5 hidden sm:inline">
              (Haz clic en un badge para asociar la justificación)
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
              title="Quitar las justificaciones seleccionadas"
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
                placeholder="Buscar justificación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 text-[11px] pl-7 py-0 bg-background"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-0.5">
        {visibleConcepts.map((concept) => {
          const selected = isConceptSelected(concept);
          const summaryWord = getConceptSummaryWord(concept);
          const theme = getConceptColorTheme(summaryWord);

          return (
            <button
              key={concept.id}
              type="button"
              onClick={() => onToggleConcept(concept)}
              className={cn(
                "group inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all text-left shadow-2xs cursor-pointer border",
                selected ? theme.selected : theme.unselected
              )}
              title={
                concept.description
                  ? `${concept.title}: ${concept.description}`
                  : concept.title
              }
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125",
                  selected ? "bg-white" : theme.dot
                )}
              />
              <span className="font-bold tracking-tight">{summaryWord}</span>
              <span className="text-[11px] opacity-80 border-l border-current/20 pl-2 hidden sm:inline truncate max-w-[200px]">
                {concept.title}
              </span>
              {selected && <Check className="w-3.5 h-3.5 shrink-0 ml-0.5" />}
            </button>
          );
        })}

        {filteredConcepts.length === 0 && (
          <span className="text-xs text-muted-foreground italic py-1">
            No se encontraron justificaciones con ese criterio.
          </span>
        )}

        {concepts.length > 8 && !searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAll((prev) => !prev)}
            className="h-7 text-[11px] text-primary hover:text-primary/80 px-2"
          >
            {showAll ? "Mostrar menos" : `+ Ver todos (${concepts.length})`}
          </Button>
        )}
      </div>
    </div>
  );
}
