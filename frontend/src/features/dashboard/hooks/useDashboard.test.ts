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
import { useDashboardStats, useHealthStatus } from "./useDashboard";
import { dashboardApi } from "../api/dashboardApi";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock api calls
vi.mock("../api/dashboardApi", () => ({
  dashboardApi: {
    getStats: vi.fn(),
    getHealth: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe("useDashboard hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should query system stats successfully", async () => {
    const mockStats = {
      totalDocuments: 10,
      indexedDocuments: 8,
      processingDocuments: 1,
      failedDocuments: 1,
      deletedDocuments: 0,
    };

    vi.mocked(dashboardApi.getStats).mockResolvedValueOnce(mockStats);

    const { result } = renderHook(() => useDashboardStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(mockStats);
    });
  });

  it("should query cluster health successfully", async () => {
    const mockHealth = {
      aiService: { status: "healthy" as const, latencyMs: 120 },
      redis: { status: "healthy" as const, latencyMs: 2 },
      chromaDb: { status: "healthy" as const, latencyMs: 15 },
      backendApi: { status: "healthy" as const, latencyMs: 10 },
    };

    vi.mocked(dashboardApi.getHealth).mockResolvedValueOnce(mockHealth);

    const { result } = renderHook(() => useHealthStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(mockHealth);
    });
  });
});
