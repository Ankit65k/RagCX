"use client";

import React from "react";
import { DocumentItem } from "../api/documentsApi";
import { FileText, Loader2, CheckCircle2, XCircle, ChevronUp, ChevronDown, RefreshCw, Trash2, ArrowUpRight, History } from "lucide-react";

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
    { icon: React.ComponentType<any>; color: string; label: string; animate?: string }
  > = {
    UPLOADING: { icon: Loader2, color: "text-blue-500 bg-blue-500/10 border-blue-500/20", label: "Uploading", animate: "animate-spin" },
    UPLOADED: { icon: Loader2, color: "text-blue-500 bg-blue-500/10 border-blue-500/20", label: "Uploaded", animate: "animate-spin" },
    QUEUED: { icon: Loader2, color: "text-slate-500 bg-slate-500/10 border-slate-500/20", label: "Queued", animate: "animate-spin" },
    PROCESSING: { icon: Loader2, color: "text-amber-500 bg-amber-500/10 border-amber-500/20", label: "Processing", animate: "animate-spin" },
    COMPLETED: { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", label: "Completed" },
    FAILED: { icon: XCircle, color: "text-rose-500 bg-rose-500/10 border-rose-500/20", label: "Failed" },
    REPROCESSING: { icon: Loader2, color: "text-amber-500 bg-amber-500/10 border-amber-500/20", label: "Reprocessing", animate: "animate-spin" },
    DELETED: { icon: Trash2, color: "text-slate-400 bg-slate-100 border-slate-200", label: "Deleted" },
  };

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />;
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/15 text-xs font-semibold text-muted-foreground select-none">
              {/* Select All Checkbox */}
              <th className="p-4 w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
                />
              </th>
              
              <th className="p-4 cursor-pointer hover:text-foreground" onClick={() => onSort("filename")}>
                <div className="flex items-center gap-1.5">
                  Filename {renderSortIcon("filename")}
                </div>
              </th>

              <th className="p-4 cursor-pointer hover:text-foreground" onClick={() => onSort("uploadedAt")}>
                <div className="flex items-center gap-1.5">
                  Uploaded At {renderSortIcon("uploadedAt")}
                </div>
              </th>

              <th className="p-4 cursor-pointer hover:text-foreground" onClick={() => onSort("pageCount")}>
                <div className="flex items-center gap-1.5">
                  Pages {renderSortIcon("pageCount")}
                </div>
              </th>

              <th className="p-4">Status</th>
              
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No documents found matching the criteria.
                </td>
              </tr>
            ) : (
              documents.map((doc) => {
                const isSelected = selectedIds.includes(doc.id);
                const status = statusConfig[doc.status] || { icon: XCircle, color: "text-slate-500 bg-slate-500/10 border-slate-500/20", label: doc.status };
                const StatusIcon = status.icon;

                return (
                  <tr
                    key={doc.id}
                    className={`hover:bg-secondary/15 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectRow(doc.id)}
                        className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
                      />
                    </td>
                    
                    <td className="p-4 font-semibold text-foreground max-w-[200px] truncate">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate" title={doc.filename}>{doc.filename}</span>
                      </div>
                    </td>

                    <td className="p-4 text-muted-foreground">
                      {new Date(doc.uploadedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="p-4 font-medium text-muted-foreground">{doc.pageCount || 0} pgs</td>

                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${status.color}`}>
                        <StatusIcon className={`h-3.5 w-3.5 ${status.animate || ""}`} />
                        {status.label}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => onViewDetails(doc)}
                          className="rounded-lg p-1.5 border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="Open"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => onReprocess(doc.id)}
                          className="rounded-lg p-1.5 border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="Reprocess"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>

                        {(isAdmin || doc.status !== "DELETED") && (
                          <button
                            onClick={() => onDelete(doc.id)}
                            className="rounded-lg p-1.5 border border-destructive/20 hover:bg-destructive/10 text-destructive transition-colors"
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
