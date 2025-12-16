"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Sidebar } from "@/components/layout";
import { AuthGuard } from "@/features/auth";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("sidebar-collapsed");
    return stored === "true";
  });

  // Save preference to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-collapsed", String(isCollapsed));
    }
  }, [isCollapsed]);

  const toggleCollapsed = () => setIsCollapsed((prev) => !prev);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 hidden border-r border-border lg:block",
            "transition-all duration-300 ease-in-out",
            isCollapsed ? "w-[72px]" : "w-64"
          )}
        >
          <Sidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapsed} />
        </aside>

        {/* Main Content */}
        <main
          className={cn(
            "min-h-screen transition-all duration-300 ease-in-out",
            isCollapsed ? "lg:pl-[72px]" : "lg:pl-64"
          )}
        >
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
