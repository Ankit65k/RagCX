import { axiosClient } from "@/core/api/axiosClient";

export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "ERROR";
  content: string;
  timestamp: string;
  citations?: Array<{
    documentId: string;
    page: number;
    chunkId: string;
    similarity?: number;
  }>;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  suggestedFollowUps?: string[];
}

export interface ChatSession {
  sessionId: string;
  title: string;
  createdAt: string;
  messageCount?: number;
}

export interface ChatResponse {
  answer: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  citations: Array<{
    documentId: string;
    page: number;
    chunkId: string;
    similarity?: number;
  }>;
  executionTime: number;
  suggestedFollowUps?: string[];
}

export const chatApi = {
  listSessions: async (): Promise<ChatSession[]> => {
    const res = await axiosClient.get("/chat/sessions");
    return res.data;
  },

  createSession: async (title: string): Promise<ChatSession> => {
    const res = await axiosClient.post("/chat/sessions", { title });
    return res.data;
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    await axiosClient.delete(`/chat/sessions/${sessionId}`);
  },

  getSessionMessages: async (sessionId: string): Promise<ChatMessage[]> => {
    const res = await axiosClient.get(`/chat/sessions/${sessionId}/messages`);
    return res.data;
  },

  sendMessage: async (sessionId: string, message: string, documentIds?: string[]): Promise<ChatResponse> => {
    const res = await axiosClient.post(`/chat/sessions/${sessionId}/messages`, {
      prompt: message,
      documentIds: documentIds || [],
    });
    return res.data;
  },
};
