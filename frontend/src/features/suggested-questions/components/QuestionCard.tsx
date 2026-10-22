"use client";

import React from "react";
import { SuggestedQuestion } from "../types";
import { HelpCircle, ChevronRight, CheckCircle, AlertTriangle } from "lucide-react";

interface QuestionCardProps {
  question: SuggestedQuestion;
  onClick: (text: string) => void;
}

export default function QuestionCard({ question, onClick }: QuestionCardProps) {
  return (
    <button
      onClick={() => onClick(question.question)}
      className="w-full flex items-center justify-between gap-3 text-left rounded-lg border border-hairline bg-surface-2 p-3.5 hover:bg-surface-3 hover:border-primary/40 transition-colors group"
      aria-label={`Select suggested question: ${question.question}`}
    >
      <div className="flex items-start gap-2.5 overflow-hidden">
        <HelpCircle className="h-4 w-4 text-ink-subtle shrink-0 mt-0.5" />
        <div className="space-y-1.5 overflow-hidden">
          <p className="text-xs font-medium text-ink leading-normal">{question.question}</p>

          <div className="flex flex-wrap items-center gap-2 text-xs select-none">
            {/* Confidence badge */}
            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 border font-medium ${
              question.confidence === "HIGH"
                ? "bg-surface-3 border-hairline text-success"
                : "bg-surface-3 border-hairline text-warning"
            }`}>
              {question.confidence === "HIGH" ? (
                <CheckCircle className="h-2.5 w-2.5" />
              ) : (
                <AlertTriangle className="h-2.5 w-2.5" />
              )}
              {question.confidence}
            </span>

            {/* Related Pages */}
            {question.relatedPages.length > 0 && (
              <span className="rounded-md bg-surface-3 border border-hairline px-1.5 py-0.5 text-ink-muted">
                Pages: {question.relatedPages.join(", ")}
              </span>
            )}

            {/* Gen time */}
            <span className="text-ink-subtle font-medium">
              ({question.generationTimeMs}ms)
            </span>
          </div>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-ink-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}