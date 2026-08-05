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
          <li key={idx} className="ml-4 list-disc text-xs leading-relaxed mb-1">
            {paragraph.substring(2)}
          </li>
        );
      }
      
      // Numeric list item checker
      if (/^\d+\.\s/.test(paragraph)) {
        const dotIdx = paragraph.indexOf(". ");
        return (
          <li key={idx} className="ml-4 list-decimal text-xs leading-relaxed mb-1">
            {paragraph.substring(dotIdx + 2)}
          </li>
        );
      }

      // Heading block checker
      if (paragraph.startsWith("### ")) {
        return (
          <h4 key={idx} className="text-xs font-bold text-foreground mt-4 mb-2">
            {paragraph.substring(4)}
          </h4>
        );
      }

      return (
        <p key={idx} className="text-xs leading-relaxed mb-2.5">
          {paragraph}
        </p>
      );
    });
  };

  return (
    <div className={`flex gap-4 p-5 ${isAssistant ? "bg-secondary/25 border-y border-border/40" : ""}`}>
      {/* 1. Avatar Icon */}
      <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
        isAssistant ? "bg-primary text-white" : "bg-secondary text-foreground"
      }`}>
        {isAssistant ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>

      {/* 2. Message Body Area */}
      <div className="flex-1 space-y-4 overflow-hidden">
        <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground font-semibold">
          <span>{isAssistant ? "AI Ingestion Assistant" : "You"}</span>
          <span>{new Date(message.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        {/* Formatted Paragraph block */}
        <div className="text-foreground">{formatContent(message.content)}</div>

        {/* 3. Assistant Ingestion Metrics (Citations / Confidence) */}
        {isAssistant && (
          <div className="space-y-4 pt-2 border-t border-border/50">
            {/* Confidence metric indicator */}
            {message.confidence && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[10px] text-muted-foreground font-semibold">Grounded confidence:</span>
                <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  message.confidence === "HIGH"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                    : message.confidence === "MEDIUM"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                }`}>
                  {message.confidence === "HIGH" ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {message.confidence}
                </span>
                
                {/* Confidence explanation tooltip trigger */}
                <div className="relative group cursor-pointer text-muted-foreground hover:text-foreground">
                  <Info className="h-3.5 w-3.5" />
                  <div className="absolute left-0 bottom-6 z-30 hidden group-hover:block w-52 rounded-lg border border-border bg-popover p-2 text-[10px] text-popover-foreground leading-normal shadow-lg">
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
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Source citations</p>
                <div className="flex flex-wrap gap-2">
                  {message.citations.map((cite, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSourceClick && onSourceClick(cite.documentId)}
                      className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 hover:border-primary/20 hover:bg-secondary/30 transition-all text-[10px] font-medium text-foreground text-left"
                    >
                      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate max-w-[120px]">{cite.documentId}</span>
                      <span className="text-muted-foreground shrink-0">• Page {cite.page}</span>
                      {cite.similarity && (
                        <span className="rounded bg-secondary/80 px-1 font-bold text-[8px] text-muted-foreground shrink-0">
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
