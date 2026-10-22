"use client";

import React from "react";
import { Trash2, RefreshCw, X } from "lucide-react";

interface BulkActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkReprocess: () => void;
}

export default function BulkActions({
  selectedIds,
  onClearSelection,
  onBulkDelete,
  onBulkReprocess,
}: BulkActionsProps) {
  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-lg border border-hairline bg-surface-1 shadow-sm px-5 py-3.5 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {selectedIds.length}
        </span>
        <span className="text-xs font-semibold text-ink">Selected items</span>
      </div>

      <div className="h-4 w-px bg-hairline"></div>

      <div className="flex items-center gap-2">
        <button
          onClick={onBulkReprocess}
          className="flex items-center gap-1.5 rounded-md border border-hairline hover:bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reprocess
        </button>

        <button
          onClick={onBulkDelete}
          className="flex items-center gap-1.5 rounded-md border border-hairline hover:bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      <div className="h-4 w-px bg-hairline"></div>

      <button
        onClick={onClearSelection}
        className="rounded-md p-1 text-ink-subtle hover:bg-surface-2 hover:text-ink transition-colors"
        title="Clear Selection"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
