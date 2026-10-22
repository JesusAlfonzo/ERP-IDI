"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { RoleGuard } from "@/components/auth/role-guard";
import { RefreshCw } from "lucide-react";

const SIDEBAR_STORAGE_KEY = "idi_sidebar_collapsed";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Forzar modo claro de forma permanente dentro del sistema interno
  useEffect(() => {
    try {
      setTheme("light");
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
    } catch (e) {
      console.error("Error forzando modo claro en el sistema interno:", e);
    }
  }, [setTheme]);

  useEffect(() => {
    const checkAuth = async () => {
      if (!AuthService.isAuthenticated()) {
        router.replace("/login");
        return;
      }
      setUser(AuthService.getCurrentUser());
      setLoading(false);
    };

    void checkAuth();
  }, [router]);

  // Cargar preferencia persistida del estado del sidebar al montar el componente
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved !== null) {
        setSidebarCollapsed(saved === "true");
      }
    } catch (e) {
      console.error("Error al leer preferencia del sidebar:", e);
    }
  }, []);

  const handleToggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const nextState = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextState));
      } catch (e) {
        console.error("Error al guardar preferencia del sidebar:", e);
      }
      return nextState;
    });
  };

  // Atajo de teclado global: Ctrl + B o Cmd + B para guardar/expandir la barra lateral
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        handleToggleSidebarCollapse();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-primary" />
        <span className="text-sm font-medium">Validando sesión...</span>
      </div>
    );
  }

  return (
    <div className="light flex h-screen overflow-hidden bg-background text-foreground print:bg-white print:text-black print:h-auto print:overflow-visible">
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
      />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden print:overflow-visible">
        <div className="no-print print:hidden shrink-0">
          <Navbar
            user={user}
            onOpenSidebar={() => setSidebarOpen(true)}
            isSidebarCollapsed={sidebarCollapsed}
            onToggleSidebarCollapse={handleToggleSidebarCollapse}
          />
        </div>
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto print:p-0 print:m-0 print:overflow-visible">
          <RoleGuard user={user}>{children}</RoleGuard>
        </main>
      </div>
    </div>
  );
}
