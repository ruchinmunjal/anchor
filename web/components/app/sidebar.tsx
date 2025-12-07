"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Anchor,
  FileText,
  Trash2,
  Tag,
  LogOut,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
  LucideHash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getTags } from "@/lib/api/tags";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { logout, user } = useAuth();

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: getTags,
  });

  const navItems = [
    {
      href: "/notes",
      label: "All Notes",
      icon: FileText,
    },
    {
      href: "/trash",
      label: "Trash",
      icon: Trash2,
    },
  ];

  const handleNavClick = () => {
    onNavigate?.();
  };

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  return (
    <div className={cn("flex h-full flex-col bg-sidebar", className)}>
      {/* Header */}
      <div className="flex h-16 items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center">
            <Anchor className="w-5 h-5 text-accent" />
          </div>
          <span className="font-serif text-xl font-bold text-sidebar-foreground">
            Anchor
          </span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Tags Section */}
        {tags.length > 0 && (
          <>
            <Separator className="my-4 bg-sidebar-border" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                <Tag className="h-3 w-3" />
                Tags
              </div>
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/?tagId=${tag.id}`}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                    "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <LucideHash className="h-3 w-3" style={{ color: tag.color || "var(--accent)" }} />
                  <span className="flex-1 truncate">{tag.name}</span>
                  <ChevronRight className="h-3 w-3 opacity-50" />
                </Link>
              ))}
            </div>
          </>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {/* User info */}
        {user && (
          <div className="px-3 py-2">
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {user.email}
            </p>
          </div>
        )}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={cycleTheme}
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          {theme === "dark" ? (
            <><Moon className="h-4 w-4" /> Dark</>
          ) : theme === "light" ? (
            <><Sun className="h-4 w-4" /> Light</>
          ) : (
            <><Monitor className="h-4 w-4" /> System</>
          )}
        </Button>

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
