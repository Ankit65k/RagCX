
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { questionsApi } from "../api/questionsApi";
import { toast } from "sonner";

export function useSuggestedQuestions(
  documentId?: string,
  sessionId?: string
) {
  const queryClient = useQueryClient();

  const queryKey = ["suggestedQuestions", { documentId, sessionId }];
  const hasIdentifier = Boolean(documentId || sessionId);

  // Query for fetching questions - NOT enabled by default
  // Questions are only fetched when explicitly triggered via fetch()
  const questionsQuery = useQuery({
    queryKey,
    queryFn: () => questionsApi.getQuestions(documentId, sessionId),
    enabled: false, // Never auto-fetch on mount
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 0,
  });

  // Explicitly fetch questions (triggered by button click)
  const fetch = () => {
    if (!hasIdentifier) return;
    // Prevent duplicate requests - only fetch if not already loading
    if (questionsQuery.isLoading || questionsQuery.isFetching) return;
    questionsQuery.refetch();
  };

  // Regenerate questions - same as fetch but with clear intent
  const regenerateMutation = useMutation({
    mutationFn: () =>
      questionsApi.regenerateQuestions(documentId, sessionId),

    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);

      toast.success("Questions Regenerated", {
        description: "Suggested questions were regenerated successfully.",
      });

      console.log(
        "[SuggestedQuestionsHook]: Regenerated suggested questions."
      );
    },

    onError: (error) => {
      console.error(
        "[SuggestedQuestionsHook]: Failed to regenerate questions.",
        error
      );

      toast.error("Action Failed", {
        description: "Failed to regenerate questions.",
      });
    },
  });

  return {
    questions: questionsQuery.data || [],
    isLoading: questionsQuery.isLoading || questionsQuery.isFetching,
    isError: questionsQuery.isError,
    fetch,
    regenerate: regenerateMutation.mutate,
    isRegenerating: regenerateMutation.isPending,
    hasCachedData: questionsQuery.data !== undefined,
  };
}
