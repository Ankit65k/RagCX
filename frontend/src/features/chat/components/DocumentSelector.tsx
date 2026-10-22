"use client";

import React from "react";
import { FileText, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  filename: string;  // Using filename field from DocumentItem
  originalFileName?: string;
  createdAt?: string;
  uploadedAt?: string;
}

interface DocumentSelectorProps {
  documents: Document[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  className?: string;
}

export default function DocumentSelector({
  documents,
  selectedIds,
  onSelectionChange,
  className,
}: DocumentSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleDocument = (docId: string) => {
    if (selectedIds.includes(docId)) {
      onSelectionChange(selectedIds.filter((id) => id !== docId));
    } else {
      onSelectionChange([...selectedIds, docId]);
    }
  };

  const selectAll = () => {
    onSelectionChange(documents.map((d) => d.id));
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  const selectedCount = selectedIds.length;
  const allSelected = selectedCount === documents.length;

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-hairline bg-surface-1 hover:bg-surface-2 text-xs font-medium transition-colors"
      >
        <FileText className="h-4 w-4 text-ink-subtle" />
        <span>
          {selectedCount === 0
            ? "All documents"
            : `${selectedCount} document${selectedCount > 1 ? "s" : ""} selected`}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-72 rounded-lg border border-hairline bg-surface-1 shadow-md z-50 overflow-hidden">
            <div className="p-3 border-b border-hairline bg-surface-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink-subtle uppercase tracking-wide">
                  Select Documents
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={selectAll}
                    className="text-xs px-2 py-0.5 rounded-md border border-hairline bg-surface-3 text-ink-subtle hover:bg-surface-2 transition-colors"
                  >
                    All
                  </button>
                  <button
                    onClick={clearSelection}
                    className="text-xs px-2 py-0.5 rounded-md border border-hairline bg-surface-2 text-ink-subtle hover:bg-surface-3 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {documents.length === 0 ? (
                <div className="p-4 text-center text-xs text-ink-subtle">
                  No documents uploaded yet
                </div>
              ) : (
                documents.map((doc) => {
                  const isSelected = selectedIds.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      onClick={() => toggleDocument(doc.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 hover:bg-surface-2 transition-colors text-left",
                        isSelected && "bg-primary/10"
                      )}
                    >
                      <div
                        className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-hairline bg-surface-1"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-ink truncate">
                          {doc.filename || doc.originalFileName}
                        </p>
                        {(doc.createdAt || doc.uploadedAt) && (
                          <p className="text-xs text-ink-subtle">
                            {new Date(doc.createdAt || doc.uploadedAt!).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {selectedCount > 0 && (
              <div className="p-3 border-t border-hairline bg-surface-2">
                <p className="text-xs text-ink-subtle">
                  Chat will query {allSelected ? "all" : selectedCount} document{selectedCount > 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}