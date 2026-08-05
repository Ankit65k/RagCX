import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const waitFor = (fn: () => void | Promise<void>, timeout = 1000) => {
  const start = Date.now();
  return new Promise<void>((resolve, reject) => {
    const check = async () => {
      try {
        await fn();
        resolve();
      } catch (err) {
        if (Date.now() - start > timeout) {
          reject(err);
        } else {
          setTimeout(check, 50);
        }
      }
    };
    check();
  });
};
import { useAuth } from "./useAuth";
import { useAuthStore } from "@/core/store/authStore";
import { authApi } from "../api/authApi";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock authApi calls
vi.mock("../api/authApi", () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

// Wrapper helper
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe("useAuth Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
    localStorage.clear();
  });

  it("should successfully log in and set auth details in store", async () => {
    const mockUser = { id: "u-1", name: "Sarah Jenkins", email: "sarah.j@enterprise.com", role: "ADMIN" as const };
    const mockResponse = {
      tokens: {
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
      },
      user: mockUser,
    };

    vi.mocked(authApi.login).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    result.current.login({ email: "sarah.j@enterprise.com", password: "password123" });

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      const persisted = JSON.parse(localStorage.getItem("ragcx-auth") || "{}");
      expect(persisted.state.accessToken).toBe("access-token-123");
    });
  });

  it("should successfully log out and clear auth details from store", async () => {
    // pre-set authentication state
    useAuthStore.getState().setAuth(
      { id: "u-1", name: "Sarah Jenkins", email: "sarah.j@enterprise.com", role: "ADMIN" },
      "token",
      "token"
    );

    vi.mocked(authApi.logout).mockResolvedValueOnce();

    const { result } = renderHook(() => useAuth(), { wrapper });

    result.current.logout();

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      const persisted = JSON.parse(localStorage.getItem("ragcx-auth") || "{}");
      expect(persisted.state?.accessToken).toBeNull();
    });
  });
});
