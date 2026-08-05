"use client";

import React from "react";

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider
 *
 * Auth state is managed entirely by:
 *   1. zustand/persist  → hydrates isAuthenticated/tokens from localStorage instantly
 *   2. axios 401 interceptor → transparently refreshes expired tokens on any API call
 *
 * On first load after the migration to zustand/persist, any old-format tokens
 * (stored as bare "accessToken"/"refreshToken" keys) are cleaned up so they
 * don't confuse future logic.
 */
export default function AuthProvider({ children }: AuthProviderProps) {
  React.useEffect(() => {
    // One-time migration: remove legacy bare localStorage keys from the old
    // manual storage approach. zustand/persist now owns the "ragcx-auth" key.
    if (localStorage.getItem("accessToken") || localStorage.getItem("refreshToken")) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  }, []);

  return <>{children}</>;
}
