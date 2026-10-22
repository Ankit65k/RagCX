"use client";

import React from "react";
import { useRecentUploads } from "../hooks/useDashboard";
import { FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";

const STATUS = {
  COMPLETED:  { icon: CheckCircle2, color: "text-success",             label: "Done" },
  PROCESSING: { icon: Loader2,      color: "text-warning",             label: "Processing", spin: true },
  FAILED:     { icon: XCircle,      color: "text-destructive",         label: "Failed" },
} as const;

export default function RecentUploadsWidget() {
  const { data: uploads, isLoading, isError } = useRecentUploads();

  if (isLoading) {
    return (
      <div className="bg-surface-1 border border-hairline rounded-lg p-4 animate-pulse space-y-3 h-full">
        <div className="h-4 w-40 bg-surface-2 rounded" />
        {[...Array(4)].map((_, i) => <div key={i} className="h-11 bg-surface-2 rounded" />)}
      </div>
    );
  }

  if (isError || !uploads) {
    return (
      <div className="rounded-lg border border-hairline bg-surface-1 p-4 text-xs text-ink-subtle text-center h-full flex items-center justify-center">
        Failed to load uploads.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 bg-surface-1 border border-hairline rounded-lg p-4 h-full">
      <div>
        <h3 className="text-sm font-semibold text-ink tracking-tight">Recent Uploads</h3>
        <p className="text-xs text-ink-subtle mt-0.5">Latest ingested documents</p>
      </div>

      <div className="flex flex-col divide-y divide-hairline">
        {uploads.length === 0 && (
          <p className="text-xs text-ink-subtle text-center py-4">No documents yet.</p>
        )}
        {uploads.map((doc) => {
          const st = STATUS[doc.status as keyof typeof STATUS] ?? STATUS.PROCESSING;
          const Icon = st.icon;

          return (
            <div
              key={doc.id}
              className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 hover:bg-surface-2 px-2 -mx-2 rounded transition-colors"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2">
                <FileText className="h-4 w-4 text-ink-subtle" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-ink truncate" title={doc.filename}>
                  {doc.filename}
                </p>
                <p className="text-xs text-ink-subtle mt-0.5">{doc.pageCount} pages</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`h-1.5 w-1.5 rounded-full ${st.color}`} />
                <span className="text-xs font-medium text-ink-muted">{st.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
