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
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors text-xs font-medium"
      >
        <FileText className="h-4 w-4 text-primary" />
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
          <div className="absolute top-full left-0 mt-2 w-72 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 border-b border-border bg-secondary/20">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Select Documents
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={selectAll}
                    className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    All
                  </button>
                  <button
                    onClick={clearSelection}
                    className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {documents.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
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
                        "w-full flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors text-left",
                        isSelected && "bg-primary/5"
                      )}
                    >
                      <div
                        className={cn(
                          "h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-border"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {doc.filename || doc.originalFileName}
                        </p>
                        {(doc.createdAt || doc.uploadedAt) && (
                          <p className="text-[10px] text-muted-foreground">
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
              <div className="p-3 border-t border-border bg-secondary/10">
                <p className="text-[10px] text-muted-foreground">
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
