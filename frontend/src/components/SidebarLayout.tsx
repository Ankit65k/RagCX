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
  Sun,
  Moon,
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
    <div className="flex h-screen w-screen overflow-hidden gradient-animate">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={`relative z-20 flex flex-col bg-card shadow-premium shadow-black/50 transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-60" : "w-[68px]"
        }`}
      >
        {/* Brand header */}
        <div className="flex h-14 items-center justify-between px-3">
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
            {/* Logo mark */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-sm shadow-glow shadow-primary/20">
              R
            </div>
            {sidebarOpen && (
              <div className="min-w-0 animate-in fade-in duration-200">
                <p className="text-sm font-bold text-foreground tracking-tight truncate">RagCX</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="ml-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
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
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${isActive ? "text-primary-foreground" : ""}`} />
                {sidebarOpen && (
                  <span className="truncate animate-in fade-in duration-150">
                    {item.label}
                  </span>
                )}
                {isActive && sidebarOpen && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground/70" />
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
              className={`flex items-center gap-2.5 rounded-xl p-2 bg-secondary/30 ${
                sidebarOpen ? "" : "justify-center"
              }`}
              title={!sidebarOpen ? userName : undefined}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold ring-2 ring-primary/10">
                {userInitial}
              </div>
              {sidebarOpen && (
                <div className="min-w-0 animate-in fade-in duration-200">
                  <p className="text-xs font-semibold text-foreground truncate leading-none">
                    {userName}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
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
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title="Expand sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            )}

            {/* Sign out */}
            {sidebarOpen && (
              <button
                onClick={() => logout(undefined)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors animate-in fade-in duration-200"
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
        <header className="flex h-14 shrink-0 items-center justify-between bg-card/40 backdrop-blur-lg px-5 shadow-sm shadow-black/30 z-10">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground text-xs">RagCX</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
            <span className="font-semibold text-foreground text-sm">{currentTitle}</span>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden sm:inline rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                {user.role}
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-transparent">
          <div className="p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
