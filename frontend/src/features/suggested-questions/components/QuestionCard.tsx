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
      className="w-full flex items-center justify-between gap-3 text-left rounded-xl border border-border bg-card p-3.5 hover:border-primary/20 hover:bg-secondary/35 transition-all group"
      aria-label={`Select suggested question: ${question.question}`}
    >
      <div className="flex items-start gap-2.5 overflow-hidden">
        <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1.5 overflow-hidden">
          <p className="text-xs font-semibold text-foreground leading-normal">{question.question}</p>
          
          <div className="flex flex-wrap items-center gap-2 text-[8px] font-bold tracking-wider uppercase select-none">
            {/* Confidence badge */}
            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 border ${
              question.confidence === "HIGH"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                : "bg-amber-500/10 border-amber-500/20 text-amber-500"
            }`}>
              {question.confidence === "HIGH" ? (
                <CheckCircle className="h-2.5 w-2.5" />
              ) : (
                <AlertTriangle className="h-2.5 w-2.5" />
              )}
              {question.confidence} Grounding
            </span>

            {/* Related Pages */}
            {question.relatedPages.length > 0 && (
              <span className="rounded bg-secondary/80 border border-border px-1.5 py-0.5 text-muted-foreground">
                Pages: {question.relatedPages.join(", ")}
              </span>
            )}

            {/* Gen time */}
            <span className="text-muted-foreground/60 font-semibold lowercase">
              ({question.generationTimeMs}ms)
            </span>
          </div>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}
