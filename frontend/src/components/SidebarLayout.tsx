"use client";

import React from "react";
import { useTheme } from "next-themes";
import { useUIStore } from "@/core/store/uiStore";
import { useAuthStore } from "@/core/store/authStore";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  LayoutDashboard,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { label: "Dashboard",          icon: LayoutDashboard, path: "/" },
  { label: "AI Chat",            icon: MessageSquare,   path: "/chat" },
  { label: "Documents",          icon: FileText,        path: "/documents" },
  { label: "Settings",           icon: Settings,        path: "/settings" },
];

// Map path → page title shown in the top bar
const pageTitles: Record<string, string> = {
  "/":          "Dashboard",
  "/chat":      "AI Document Chat",
  "/documents": "Document Library",
  "/settings":  "System Settings",
};

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const { theme, setTheme } = useTheme();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (isAuthPage) return <>{children}</>;

  const userName = user?.name || user?.email?.split("@")[0] || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  const currentTitle =
    pageTitles[pathname] ||
    (pathname.startsWith("/chat") ? "AI Document Chat" : "RagCX");

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={`relative z-20 flex flex-col bg-surface-1 border-r border-hairline transition-all duration-200 ${
          sidebarOpen ? "w-60" : "w-[68px]"
        }`}
      >
        {/* Brand header */}
        <div className="flex h-14 items-center justify-between px-3">
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
            {/* Logo mark - simple lavender accent */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
              R
            </div>
            {sidebarOpen && (
              <div className="min-w-0 animate-fade-in">
                <p className="text-sm font-semibold text-foreground tracking-tight truncate">RagCX</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="ml-1 shrink-0 rounded-md p-1.5 text-ink-subtle hover:bg-surface-2 hover:text-foreground transition-colors"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.path ||
              (item.path !== "/" && pathname.startsWith(item.path));

            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                title={!sidebarOpen ? item.label : undefined}
                className={`group relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-surface-3 text-ink"
                    : "text-ink-subtle hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                {/* Lavender indicator bar on left edge for active item */}
                {isActive && (
                  <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-r" />
                )}
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "" : "group-hover:text-foreground"}`} />
                {sidebarOpen && (
                  <span className="truncate animate-fade-in">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 space-y-2">
          {/* User profile */}
          {user && (
            <div
              className={`flex items-center gap-2.5 rounded-md p-2 bg-surface-2 ${
                sidebarOpen ? "" : "justify-center"
              }`}
              title={!sidebarOpen ? userName : undefined}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                {userInitial}
              </div>
              {sidebarOpen && (
                <div className="min-w-0 animate-fade-in">
                  <p className="text-xs font-semibold text-foreground truncate leading-none">
                    {userName}
                  </p>
                  <p className="text-[10px] text-ink-subtle truncate mt-0.5">
                    {user.role}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className={`flex items-center gap-1.5 ${sidebarOpen ? "justify-between" : "flex-col"}`}>
            {/* Expand toggle (icon-only mode) */}
            {!sidebarOpen && (
              <button
                onClick={toggleSidebar}
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle hover:bg-surface-2 hover:text-foreground transition-colors"
                title="Expand sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            )}

            {/* Sign out */}
            {sidebarOpen && (
              <button
                onClick={() => logout(undefined)}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors animate-fade-in"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between bg-surface-1 border-b border-hairline px-5 z-10">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-ink-subtle text-xs">RagCX</span>
            <ChevronRight className="h-3.5 w-3.5 text-hairline" />
            <span className="font-semibold text-foreground text-sm">{currentTitle}</span>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden sm:inline rounded-md bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold text-ink-muted">
                {user.role}
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}