"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { questionsApi } from "../api/questionsApi";
import { toast } from "sonner";

export function useSuggestedQuestions(documentId?: string, sessionId?: string) {
  const queryClient = useQueryClient();

  const queryKey = ["suggestedQuestions", { documentId, sessionId }];

  const questionsQuery = useQuery({
    queryKey,
    queryFn: () => questionsApi.getQuestions(documentId, sessionId),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const regenerateMutation = useMutation({
    mutationFn: () => questionsApi.regenerateQuestions(documentId, sessionId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      toast.success("Questions Regenerated", {
        description: "Ingestion pipeline updated suggestion nodes.",
      });
      console.log("[SuggestedQuestionsHook]: Regenerated suggested questions.");
    },
    onError: () => {
      toast.error("Action Failed", {
        description: "Failed to regenerate questions.",
      });
    },
  });

  return {
    questions: questionsQuery.data || [],
    isLoading: questionsQuery.isLoading,
    isError: questionsQuery.isError,
    regenerate: regenerateMutation.mutate,
    isRegenerating: regenerateMutation.isPending,
  };
}
