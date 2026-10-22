"use client";

import React, { useRef, useState, useEffect } from "react";
import { Send, CornerDownLeft } from "lucide-react";

interface MessageComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function MessageComposer({ onSend, disabled = false }: MessageComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height to accommodate multi-line paragraphs
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");

    // Focus back on composer
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send message on Enter, unless Shift is held (for new line)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-hairline bg-surface-1 p-4">
      <div className="relative max-w-4xl mx-auto flex items-end gap-3 rounded-lg border border-hairline bg-surface-1 px-4 py-3 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about the uploaded document library..."
          className="flex-1 max-h-36 min-h-[24px] resize-none bg-transparent pr-12 text-sm text-ink focus:outline-none leading-relaxed"
          rows={1}
          disabled={disabled}
        />

        <div className="flex items-center gap-2">
          {/* Shift Enter Helper indicator */}
          <span className="hidden sm:inline-flex items-center gap-0.5 text-xs text-ink-subtle select-none font-medium">
            <span>Enter to Send</span>
            <CornerDownLeft className="h-2 w-2" />
          </span>

          <button
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            aria-label="Transmit Prompt"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}