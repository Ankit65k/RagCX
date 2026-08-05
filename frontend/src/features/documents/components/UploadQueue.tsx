"use client";

import React, { useEffect } from "react";
import { UploadProgressInfo, useDocumentStatusQuery } from "../hooks/useDocumentUpload";
import { Loader2, CheckCircle2, XCircle, FileText, Trash2 } from "lucide-react";

interface UploadQueueProps {
  queue: Record<string, UploadProgressInfo>;
  onClearItem: (fileKey: string) => void;
  onUpdateStatus: (fileKey: string, status: UploadProgressInfo["status"]) => void;
}

export default function UploadQueue({ queue, onClearItem, onUpdateStatus }: UploadQueueProps) {
  const queueKeys = Object.keys(queue);

  if (queueKeys.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-sm font-bold text-foreground mb-4">Active Upload Queue</h3>
      
      <div className="space-y-4">
        {queueKeys.map((key) => (
          <QueueItemRow
            key={key}
            fileKey={key}
            item={queue[key]}
            onClear={() => onClearItem(key)}
            onStatusChange={(status) => onUpdateStatus(key, status)}
          />
        ))}
      </div>
    </div>
  );
}

// Sub-component executing status polling for each processing document
interface QueueItemRowProps {
  fileKey: string;
  item: UploadProgressInfo;
  onClear: () => void;
  onStatusChange: (status: UploadProgressInfo["status"]) => void;
}

function QueueItemRow({ fileKey, item, onClear, onStatusChange }: QueueItemRowProps) {
  const isPolling = item.status === "PROCESSING" && !!item.documentId;
  
  // Status Query: polls status every 3 seconds, stops automatically on COMPLETED/FAILED
  const { data: statusData } = useDocumentStatusQuery(
    item.documentId || "",
    isPolling
  );

  useEffect(() => {
    if (statusData && (statusData.status === "COMPLETED" || statusData.status === "FAILED")) {
      onStatusChange(statusData.status);
    }
  }, [statusData, onStatusChange]);

  const statusConfig = {
    UPLOADING: { color: "text-blue-500", label: "Uploading" },
    QUEUED: { color: "text-muted-foreground", label: "Queued" },
    PROCESSING: { color: "text-amber-500", label: "Processing", animate: true },
    COMPLETED: { color: "text-emerald-500", label: "Completed" },
    FAILED: { color: "text-rose-500", label: "Failed" },
  };

  const status = statusConfig[item.status];

  return (
    <div className="rounded-xl border border-border bg-secondary/15 p-4 flex flex-col gap-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground truncate" title={item.filename}>
            {item.filename}
          </span>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-background border ${status.color}`}>
            {status.label}
          </span>
          {(item.status === "COMPLETED" || item.status === "FAILED") && (
            <button
              onClick={onClear}
              className="p-1 rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              title="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress slider / bar */}
      {item.status === "UPLOADING" && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
            <span>Progress</span>
            <span>{item.progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${item.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Ingestion status description */}
      {item.status === "PROCESSING" && (
        <div className="flex items-center gap-2 text-[10px] text-amber-600 font-semibold animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Ingestion pipeline running: parsing document blocks...</span>
        </div>
      )}

      {item.status === "COMPLETED" && (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Document chunks successfully indexed into ChromaDB!</span>
        </div>
      )}

      {item.status === "FAILED" && (
        <div className="flex items-center gap-1.5 text-[10px] text-rose-600 font-semibold">
          <XCircle className="h-3.5 w-3.5" />
          <span>Ingestion failure: {item.error || "Failed to process document pages."}</span>
        </div>
      )}
    </div>
  );
}
