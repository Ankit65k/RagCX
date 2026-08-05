"use client";

import React from "react";
import { useRecentUploads } from "../hooks/useDashboard";
import { FileText, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

const STATUS = {
  COMPLETED:  { icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/15", label: "Done" },
  PROCESSING: { icon: Loader2,      color: "text-amber-400 bg-amber-500/10 border-amber-500/15",   label: "Processing", spin: true },
  FAILED:     { icon: XCircle,      color: "text-rose-400 bg-rose-500/10 border-rose-500/15",    label: "Failed" },
} as const;

export default function RecentUploadsWidget() {
  const { data: uploads, isLoading, isError } = useRecentUploads();

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-6 animate-pulse space-y-3 h-full">
        <div className="h-4 w-40 bg-muted rounded" />
        {[...Array(4)].map((_, i) => <div key={i} className="h-11 bg-muted rounded-xl" />)}
      </div>
    );
  }

  if (isError || !uploads) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive text-center h-full flex items-center justify-center">
        Failed to load uploads.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl glass p-6 h-full">
      <div>
        <h3 className="text-sm font-bold text-foreground tracking-tight">Recent Uploads</h3>
        <p className="text-xs text-muted-foreground/80 mt-0.5">Latest ingested documents</p>
      </div>

      <div className="flex flex-col gap-2">
        {uploads.length === 0 && (
          <p className="text-sm text-muted-foreground/80 text-center py-6">No documents yet.</p>
        )}
        {uploads.map((doc) => {
          const st = STATUS[doc.status as keyof typeof STATUS] ?? STATUS.PROCESSING;
          const Icon = st.icon;

          return (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-xl bg-secondary/25 px-3 py-2.5 hover:bg-secondary/55 hover:shadow-sm hover:shadow-black/10 transition-all"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate" title={doc.filename}>
                  {doc.filename}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">{doc.pageCount} pages</p>
              </div>
              <div className={`flex items-center gap-1 shrink-0 rounded-lg px-2.5 py-1 border text-[10px] font-bold ${st.color}`}>
                <Icon className={`h-3 w-3 ${(st as any).spin ? "animate-spin" : ""}`} />
                {st.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
