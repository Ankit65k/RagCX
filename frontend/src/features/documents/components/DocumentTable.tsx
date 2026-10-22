"use client";

import React from "react";
import { DocumentItem } from "../api/documentsApi";
import { FileText, ChevronUp, ChevronDown, RefreshCw, Trash2, ArrowUpRight } from "lucide-react";

interface DocumentTableProps {
  documents: DocumentItem[];
  selectedIds: string[];
  onSelectRow: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onViewDetails: (doc: DocumentItem) => void;
  onReprocess: (id: string) => void;
  onDelete: (id: string) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort: (column: string) => void;
  isAdmin?: boolean;
}

export default function DocumentTable({
  documents,
  selectedIds,
  onSelectRow,
  onSelectAll,
  onViewDetails,
  onReprocess,
  onDelete,
  sortBy,
  sortOrder,
  onSort,
  isAdmin = false,
}: DocumentTableProps) {
  
  const allSelected = documents.length > 0 && selectedIds.length === documents.length;

  const statusConfig: Record<
    DocumentItem["status"],
    { color: string; label: string; dot: string }
  > = {
    UPLOADING: { color: "text-warning", label: "Uploading", dot: "bg-warning animate-pulse" },
    UPLOADED: { color: "text-warning", label: "Uploaded", dot: "bg-warning animate-pulse" },
    QUEUED: { color: "text-warning", label: "Queued", dot: "bg-warning animate-pulse" },
    PROCESSING: { color: "text-warning", label: "Processing", dot: "bg-warning animate-pulse" },
    COMPLETED: { color: "text-success", label: "Completed", dot: "bg-success" },
    FAILED: { color: "text-destructive", label: "Failed", dot: "bg-destructive" },
    REPROCESSING: { color: "text-warning", label: "Reprocessing", dot: "bg-warning animate-pulse" },
    DELETED: { color: "text-ink-muted", label: "Deleted", dot: "bg-ink-subtle" },
  };

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />;
  };

  return (
    <div className="rounded-lg border border-hairline bg-surface-1 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-hairline bg-surface-2 text-xs font-semibold text-ink-subtle select-none">
              {/* Select All Checkbox */}
              <th className="p-4 w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border border-hairline bg-surface-3 text-primary accent-primary focus:ring-2 focus:ring-primary/50 cursor-pointer"
                />
              </th>

              <th className="p-4 cursor-pointer hover:text-ink" onClick={() => onSort("filename")}>
                <div className="flex items-center gap-1.5">
                  Filename {renderSortIcon("filename")}
                </div>
              </th>

              <th className="p-4 cursor-pointer hover:text-ink" onClick={() => onSort("uploadedAt")}>
                <div className="flex items-center gap-1.5">
                  Uploaded At {renderSortIcon("uploadedAt")}
                </div>
              </th>

              <th className="p-4 cursor-pointer hover:text-ink" onClick={() => onSort("pageCount")}>
                <div className="flex items-center gap-1.5">
                  Pages {renderSortIcon("pageCount")}
                </div>
              </th>

              <th className="p-4">Status</th>

              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline text-xs">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-ink-subtle">
                  No documents found matching the criteria.
                </td>
              </tr>
            ) : (
              documents.map((doc) => {
                const isSelected = selectedIds.includes(doc.id);
                const status = statusConfig[doc.status] || { color: "text-ink-muted", label: doc.status, dot: "bg-ink-subtle" };

                return (
                  <tr
                    key={doc.id}
                    className={`hover:bg-surface-2 transition-colors ${isSelected ? "bg-surface-3" : ""}`}
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectRow(doc.id)}
                        className="h-4 w-4 rounded border border-hairline bg-surface-3 text-primary accent-primary focus:ring-2 focus:ring-primary/50 cursor-pointer"
                      />
                    </td>

                    <td className="p-4 font-semibold text-ink max-w-[200px] truncate">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate" title={doc.filename}>{doc.filename}</span>
                      </div>
                    </td>

                    <td className="p-4 text-ink-muted text-12px">
                      {new Date(doc.uploadedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="p-4 font-medium text-ink-muted text-12px">{doc.pageCount || 0} pgs</td>

                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted`}>
                        <span className={`h-2 w-2 rounded-full shrink-0 ${status.dot}`} />
                        {status.label}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => onViewDetails(doc)}
                          className="rounded-md p-1.5 text-ink-subtle hover:bg-surface-3 hover:text-ink transition-colors"
                          title="Open"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => onReprocess(doc.id)}
                          className="rounded-md p-1.5 text-ink-subtle hover:bg-surface-3 hover:text-ink transition-colors"
                          title="Reprocess"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>

                        {(isAdmin || doc.status !== "DELETED") && (
                          <button
                            onClick={() => onDelete(doc.id)}
                            className="rounded-md p-1.5 text-ink-subtle hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
