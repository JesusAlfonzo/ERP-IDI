"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { RoleGuard } from "@/components/auth/role-guard";
import { RefreshCw } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-blue-600" />
        <span className="text-sm font-medium">Validando sesión...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={user} onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-8">
          <RoleGuard user={user}>{children}</RoleGuard>
        </main>
      </div>
    </div>
  );
}
