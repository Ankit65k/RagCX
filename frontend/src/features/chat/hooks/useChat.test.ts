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
import { useChatSessions, useChatRoom } from "./useChat";
import { chatApi } from "../api/chatApi";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock chatApi calls
vi.mock("../api/chatApi", () => ({
  chatApi: {
    listSessions: vi.fn(),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    getSessionMessages: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe("useChat Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useChatSessions", () => {
    it("should list existing chat sessions", async () => {
      const mockSessions = [
        { sessionId: "c-1", title: "Safety guidelines", createdAt: "2026-08-04T12:00:00Z" },
      ];

      vi.mocked(chatApi.listSessions).mockResolvedValueOnce(mockSessions);

      const { result } = renderHook(() => useChatSessions(), { wrapper });

      await waitFor(() => {
        expect(result.current.sessions).toEqual(mockSessions);
      });
    });
  });

  describe("useChatRoom", () => {
    it("should optimistic update on message send and dispatch success", async () => {
      vi.mocked(chatApi.getSessionMessages).mockResolvedValueOnce([]);
      const mockResponse = {
        answer: "Continuous airflow is mandatory.",
        confidence: "HIGH" as const,
        citations: [],
        executionTime: 0.8,
      };
      vi.mocked(chatApi.sendMessage).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useChatRoom("c-1"), { wrapper });

      result.current.sendMessage("What are the ventilation standards?");

      await waitFor(() => {
        // Optimistic user message + assistant reply = 2 messages
        expect(result.current.messages.length).toBe(2);
        expect(result.current.messages[0].content).toBe("What are the ventilation standards?");
        expect(result.current.messages[1].content).toBe("Continuous airflow is mandatory.");
      });
    });
  });
});
