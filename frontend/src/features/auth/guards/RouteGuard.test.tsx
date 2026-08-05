import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { ProtectedRoute, RoleGuard } from "./RouteGuard";
import { useAuthStore } from "@/core/store/authStore";
import React from "react";

// Mock router pushes
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: mockPush,
      prefetch: () => null,
    };
  },
  usePathname() {
    return "/";
  },
}));

describe("RouteGuards components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
  });

  describe("ProtectedRoute", () => {
    it("should render children if user is authenticated", () => {
      useAuthStore.getState().setAuth(
        { id: "u-1", name: "Sarah", email: "s@e.com", role: "USER" },
        "token",
        "token"
      );
      useAuthStore.getState().setLoading(false);

      const { getByTestId } = render(
        <ProtectedRoute>
          <div data-testid="protected-content">Secret Content</div>
        </ProtectedRoute>
      );

      expect(getByTestId("protected-content")).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("should redirect to /login if user is not authenticated", () => {
      useAuthStore.getState().setLoading(false);

      const { queryByTestId } = render(
        <ProtectedRoute>
          <div data-testid="protected-content">Secret Content</div>
        </ProtectedRoute>
      );

      expect(queryByTestId("protected-content")).toBeNull();
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  describe("RoleGuard", () => {
    it("should block user access and show Forbidden if role doesn't match", () => {
      useAuthStore.getState().setAuth(
        { id: "u-1", name: "Sarah", email: "s@e.com", role: "USER" },
        "token",
        "token"
      );
      useAuthStore.getState().setLoading(false);

      const { queryByTestId, getByText } = render(
        <RoleGuard allowedRoles={["ADMIN"]}>
          <div data-testid="admin-content">Admin settings</div>
        </RoleGuard>
      );

      expect(queryByTestId("admin-content")).toBeNull();
      expect(getByText("Access Forbidden")).toBeInTheDocument();
    });
  });
});
