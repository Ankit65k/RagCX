"use client";

import React from "react";
import { useAuthStore } from "@/core/store/authStore";
import { useRouter } from "next/navigation";
import Loading from "@/app/loading";
import ForbiddenScreen from "../components/ForbiddenScreen";

interface GuardProps {
  children: React.ReactNode;
}

// ─── 1. Protected Route Guard ──────────────────────────────────────────────

export function ProtectedRoute({ children }: GuardProps) {
  const { isAuthenticated, isLoading, _hasHydrated } = useAuthStore();
  const router = useRouter();

  React.useEffect(() => {
    // Only redirect once zustand/persist has finished rehydrating from localStorage.
    // Without this guard the store's default isAuthenticated:false would fire a
    // spurious redirect on every page load before the persisted state is read.
    if (_hasHydrated && !isLoading && !isAuthenticated) {
      console.log("[DEBUG] MIDDLEWARE REDIRECT");
      console.log("[RouteGuard]: Not authenticated. Redirecting to /login.");
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, _hasHydrated, router]);

  // Show a spinner while localStorage is being read (usually < 1 frame)
  if (!_hasHydrated || isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    console.log("[DEBUG] ROUTE BLOCKED");
    return null;
  }

  return <>{children}</>;
}

// ─── 2. Public Route Guard (Redirects to dashboard if already authenticated)

export function PublicRoute({ children }: GuardProps) {
  const { isAuthenticated, isLoading, _hasHydrated } = useAuthStore();
  const router = useRouter();

  React.useEffect(() => {
    if (_hasHydrated && !isLoading && isAuthenticated) {
      console.log("[DEBUG] MIDDLEWARE REDIRECT");
      router.push("/");
    }
  }, [isAuthenticated, isLoading, _hasHydrated, router]);

  if (!_hasHydrated || isLoading) {
    return <Loading />;
  }

  if (isAuthenticated) {
    console.log("[DEBUG] ROUTE BLOCKED");
    return null;
  }

  return <>{children}</>;
}

// ─── 3. Role Guard (Restricts access to specific user roles) ─────────────────

interface RoleGuardProps extends GuardProps {
  allowedRoles: Array<"ADMIN" | "USER" | "MANAGER">;
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isAuthenticated, isLoading, _hasHydrated } = useAuthStore();

  if (!_hasHydrated || isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    console.log("[DEBUG] ROUTE BLOCKED");
    return null;
  }

  if (user && !allowedRoles.includes(user.role)) {
    console.log("[DEBUG] ROUTE BLOCKED");
    return <ForbiddenScreen />;
  }

  return <>{children}</>;
}
