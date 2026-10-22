"use client";

import React from "react";
import { ChatMessage } from "../api/chatApi";
import { Sparkles, User, Info, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import SuggestedQuestionsList from "@/features/suggested-questions/components/SuggestedQuestionsList";

interface MessageBubbleProps {
  message: ChatMessage;
  onFollowUpClick?: (question: string) => void;
  onSourceClick?: (docId: string) => void;
}

export default function MessageBubble({ message, onFollowUpClick, onSourceClick }: MessageBubbleProps) {
  const isAssistant = message.role === "ASSISTANT";

  // Simple clean markdown paragraph formatter for React rendering without external vulnerabilities
  const formatContent = (content: string) => {
    return content.split("\n").map((paragraph, idx) => {
      if (!paragraph.trim()) return <div key={idx} className="h-2" />;

      // List item checker
      if (paragraph.startsWith("- ") || paragraph.startsWith("* ")) {
        return (
          <li key={idx} className="ml-4 list-disc text-sm leading-relaxed mb-1">
            {paragraph.substring(2)}
          </li>
        );
      }

      // Numeric list item checker
      if (/^\d+\.\s/.test(paragraph)) {
        const dotIdx = paragraph.indexOf(". ");
        return (
          <li key={idx} className="ml-4 list-decimal text-sm leading-relaxed mb-1">
            {paragraph.substring(dotIdx + 2)}
          </li>
        );
      }

      // Heading block checker
      if (paragraph.startsWith("### ")) {
        return (
          <h4 key={idx} className="text-sm font-semibold text-ink mt-4 mb-2">
            {paragraph.substring(4)}
          </h4>
        );
      }

      return (
        <p key={idx} className="text-sm leading-relaxed mb-2.5">
          {paragraph}
        </p>
      );
    });
  };

  return (
    <div className={`flex gap-4 p-5 ${isAssistant ? "bg-surface-1" : "bg-surface-3"}`}>
      {/* 1. Avatar Icon */}
      <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
        isAssistant ? "bg-primary text-primary-foreground" : "bg-surface-2 text-ink"
      }`}>
        {isAssistant ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>

      {/* 2. Message Body Area */}
      <div className="flex-1 space-y-4 overflow-hidden max-w-[720px]">
        <div className="flex items-center justify-between gap-3 text-xs text-ink-subtle font-medium">
          <span>{isAssistant ? "AI Assistant" : "You"}</span>
          <span>{new Date(message.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        {/* Formatted Paragraph block */}
        <div className="text-ink">{formatContent(message.content)}</div>

        {/* 3. Assistant Ingestion Metrics (Citations / Confidence) */}
        {isAssistant && (
          <div className="space-y-4 pt-2 border-t border-hairline">
            {/* Confidence metric indicator */}
            {message.confidence && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs text-ink-subtle font-medium">Grounded confidence:</span>
                <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-medium ${
                  message.confidence === "HIGH"
                    ? "bg-surface-2 border-hairline text-success"
                    : message.confidence === "MEDIUM"
                    ? "bg-surface-2 border-hairline text-warning"
                    : "bg-surface-2 border-hairline text-destructive"
                }`}>
                  {message.confidence === "HIGH" ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {message.confidence}
                </span>

                {/* Confidence explanation tooltip trigger */}
                <div className="relative group cursor-pointer text-ink-subtle hover:text-ink">
                  <Info className="h-3.5 w-3.5" />
                  <div className="absolute left-0 bottom-6 z-30 hidden group-hover:block w-52 rounded-lg border border-hairline bg-surface-2 p-2 text-xs text-ink leading-normal">
                    {message.confidence === "HIGH"
                      ? "The answer is strictly grounded in high-similarity documents with explicit source page matches."
                      : "The answer utilizes sparse contexts. Verify citations manually."}
                  </div>
                </div>
              </div>
            )}

            {/* Citations panel */}
            {message.citations && message.citations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-ink-subtle uppercase tracking-wide">Source citations</p>
                <div className="flex flex-wrap gap-2">
                  {message.citations.map((cite, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSourceClick && onSourceClick(cite.documentId)}
                      className="flex items-center gap-2 rounded-md border border-hairline bg-surface-2 px-3 py-1.5 hover:border-primary/40 hover:bg-surface-3 transition-colors text-xs font-medium text-ink text-left"
                    >
                      <FileText className="h-3.5 w-3.5 text-ink-subtle shrink-0" />
                      <span className="truncate max-w-[120px]">{cite.documentId}</span>
                      <span className="text-ink-subtle shrink-0">• Page {cite.page}</span>
                      {cite.similarity && (
                        <span className="rounded bg-surface-3 px-1 font-medium text-xs text-ink-muted shrink-0">
                          {Math.round(cite.similarity * 100)}% Match
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Follow up Questions */}
            <div className="pt-2">
              <SuggestedQuestionsList
                sessionId={message.id}
                onQuestionClick={(q) => onFollowUpClick && onFollowUpClick(q)}
                title="Suggested Follow-up Questions"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}