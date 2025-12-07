"use client";

import type { ReactNode } from "react";
import { GuestGuard } from "@/components/auth";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <GuestGuard>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/30" />
        <div className="relative z-10 w-full max-w-md mx-4">{children}</div>
      </div>
    </GuestGuard>
  );
}
