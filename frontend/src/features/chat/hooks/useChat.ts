"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatApi, ChatMessage } from "../api/chatApi";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function useChatSessions() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const sessionsQuery = useQuery({
    queryKey: ["chat", "sessions"],
    queryFn: chatApi.listSessions,
  });

  const createMutation = useMutation({
    mutationFn: chatApi.createSession,
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "sessions"] });
      toast.success("New Chat Created", {
        description: `Created thread: "${newSession.title}"`,
      });
      router.push(`/chat/${newSession.sessionId}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: chatApi.deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "sessions"] });
      toast.info("Session Deleted");
      router.push("/chat");
    },
  });

  return {
    sessions: sessionsQuery.data || [],
    isLoading: sessionsQuery.isLoading,
    createSession: createMutation.mutate,
    isCreating: createMutation.isPending,
    deleteSession: deleteMutation.mutate,
  };
}

export function useChatRoom(sessionId: string) {
  const queryClient = useQueryClient();
  const [isTyping, setIsTyping] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);

  const messagesQuery = useQuery({
    queryKey: ["chat", "messages", sessionId],
    queryFn: () => chatApi.getSessionMessages(sessionId),
    enabled: !!sessionId,
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => {
      setIsTyping(true);
      return chatApi.sendMessage(sessionId, text, selectedDocumentIds);
    },
    onMutate: async (text) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["chat", "messages", sessionId] });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(["chat", "messages", sessionId]) || [];

      // Optimistic insert for user prompt
      const userMsg: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        role: "USER",
        content: text,
        timestamp: new Date().toISOString(),
      };

      queryClient.setQueryData<ChatMessage[]>(
        ["chat", "messages", sessionId],
        [...previousMessages, userMsg]
      );

      return { previousMessages };
    },
    onSuccess: (data) => {
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "ASSISTANT",
        content: data.answer,
        timestamp: new Date().toISOString(),
        confidence: data.confidence,
        citations: data.citations,
        suggestedFollowUps: data.suggestedFollowUps,
      };

      queryClient.setQueryData<ChatMessage[]>(
        ["chat", "messages", sessionId],
        (old) => [...(old || []), assistantMsg]
      );

      queryClient.invalidateQueries({ queryKey: ["chat", "sessions"] });
    },
    onError: (err, text, context) => {
      // Rollback optimistic updates
      if (context?.previousMessages) {
        queryClient.setQueryData(["chat", "messages", sessionId], context.previousMessages);
      }
      // Better error message based on error type
      const errorMsg = err?.response?.data?.error?.message || "Request timed out";
      const isTimeout = err?.response?.status === 504 || errorMsg.includes("timed out");

      toast.error("Message Failed", {
        description: isTimeout
          ? "Request took too long (>2 minutes). Check if documents are uploaded or try a simpler question."
          : errorMsg,
      });
    },
    onSettled: () => {
      setIsTyping(false);
    },
  });

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    sendMessage: sendMutation.mutate,
    isSending: sendMutation.isPending,
    isTyping,
    selectedDocumentIds,
    setSelectedDocumentIds,
  };
}
