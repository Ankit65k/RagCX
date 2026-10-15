"use client";

import React from "react";
import { useSuggestedQuestions } from "../hooks/useSuggestedQuestions";
import QuestionCard from "./QuestionCard";
import { RefreshCw, Sparkles, Wand2 } from "lucide-react";

interface SuggestedQuestionsListProps {
  documentId?: string;
  sessionId?: string;
  onQuestionClick: (text: string) => void;
  title?: string;
}

export default function SuggestedQuestionsList({
  documentId,
  sessionId,
  onQuestionClick,
  title = "Suggested Grounded Questions",
}: SuggestedQuestionsListProps) {
  const { questions, isLoading, isError, fetch, regenerate, isRegenerating, hasCachedData } =
    useSuggestedQuestions(documentId, sessionId);

  // Debug logging
  console.log('[SuggestedQuestionsList] Render:', {
    documentId,
    sessionId,
    hasCachedData,
    isLoading,
    isError,
    questionsCount: questions?.length
  });

  const handleGenerate = () => {
    // Prevent double-clicks
    if (isLoading) {
      console.log('[SuggestedQuestionsList] Blocked - already loading');
      return;
    }
    console.log('[SuggestedQuestionsList] Fetch triggered');
    fetch();
  };

  // Show "Generate" button when no cached data exists and not loading
  if (!hasCachedData && !isLoading && !isError) {
    console.log('[SuggestedQuestionsList] Rendering button');
    return (
      <div className="pt-2">
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 px-3 py-2 text-[10px] font-semibold text-foreground transition-all disabled:opacity-50"
        >
          <Wand2 className={`h-3.5 w-3.5 ${isLoading ? "animate-pulse" : ""}`} />
          <span>{isLoading ? "Generating..." : "Suggest Questions"}</span>
        </button>
      </div>
    );
  }

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className="space-y-3.5 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded"></div>
        <div className="space-y-2">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="h-16 bg-muted rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // Error state - show retry button with cached data if available
  if (isError) {
    return (
      <div className="space-y-3">
        {hasCachedData && questions.length > 0 ? (
          // Show cached data with error banner
          <>
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              Failed to refresh questions. Showing cached results.
            </div>
            <div className="space-y-2.5">
              {questions.map((q) => (
                <QuestionCard key={q.id} question={q} onClick={onQuestionClick} />
              ))}
            </div>
          </>
        ) : (
          // No cached data, show error with retry button
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center text-xs text-destructive space-y-3">
            <p>Failed to retrieve suggested questions.</p>
            <button
              onClick={handleGenerate}
              className="rounded-lg border border-destructive/30 hover:bg-destructive/10 px-3 py-1.5 text-[10px] font-semibold transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    );
  }

  // Empty state
  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-secondary/10 p-4 text-center text-xs text-muted-foreground space-y-3">
        <p>No questions suggested for this context.</p>
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="rounded-lg border border-border hover:bg-secondary px-3 py-1.5 text-[10px] font-semibold text-foreground transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 inline mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Generate Questions
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span>{title}</span>
        </div>

        <button
          onClick={() => regenerate()}
          disabled={isRegenerating}
          className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-secondary px-2.5 py-1 text-[10px] font-semibold text-foreground disabled:opacity-50 transition-all"
          title="Regenerate suggestions"
        >
          <RefreshCw className={`h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`} />
          <span>{isRegenerating ? "Regenerating..." : "Regenerate"}</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {questions.map((q) => (
          <QuestionCard key={q.id} question={q} onClick={onQuestionClick} />
        ))}
      </div>
    </div>
  );
}
