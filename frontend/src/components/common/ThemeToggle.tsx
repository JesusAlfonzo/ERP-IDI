"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 text-muted-foreground opacity-60 ${className}`}
        aria-label="Cargando tema"
        disabled
      >
        <Sun className="w-4 h-4" />
      </Button>
    );
  }

  const isDark = theme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors ${className}`}
          title={`Tema actual: ${theme === "dark" ? "Oscuro" : theme === "light" ? "Claro" : "Sistema"}`}
          aria-label="Cambiar tema visual"
        >
          {isDark ? (
            <Moon className="w-4 h-4 text-sky-400 transition-transform duration-200" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500 transition-transform duration-200" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex items-center gap-2 text-xs cursor-pointer font-medium"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Modo Claro</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex items-center gap-2 text-xs cursor-pointer font-medium"
        >
          <Moon className="w-3.5 h-3.5 text-sky-400" />
          <span>Modo Oscuro</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex items-center gap-2 text-xs cursor-pointer font-medium"
        >
          <Laptop className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Sistema</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
