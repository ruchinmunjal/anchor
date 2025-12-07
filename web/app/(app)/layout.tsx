"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/components/app/sidebar";
import { AuthGuard } from "@/components/auth";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-border lg:block">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <main className="lg:pl-64 min-h-screen">{children}</main>
      </div>
    </AuthGuard>
  );
}
