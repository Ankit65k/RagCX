"use client";

import React from "react";
import { useSuggestedQuestions } from "../hooks/useSuggestedQuestions";
import QuestionCard from "./QuestionCard";
import { RefreshCw, Sparkles } from "lucide-react";

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
  const { questions, isLoading, isError, regenerate, isRegenerating } = useSuggestedQuestions(
    documentId,
    sessionId
  );

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

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center text-xs text-destructive">
        Failed to retrieve suggested questions.
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-secondary/10 p-4 text-center text-xs text-muted-foreground">
        No questions suggested for this context.
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
