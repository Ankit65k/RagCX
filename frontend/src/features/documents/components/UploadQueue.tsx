"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UploadProgressInfo, useDocumentStatusQuery } from "../hooks/useDocumentUpload";
import { Loader2, CheckCircle2, XCircle, FileText, Trash2, MessageSquare } from "lucide-react";

interface UploadQueueProps {
  queue: Record<string, UploadProgressInfo>;
  onClearItem: (fileKey: string) => void;
  onUpdateStatus: (fileKey: string, status: UploadProgressInfo["status"]) => void;
}

export default function UploadQueue({ queue, onClearItem, onUpdateStatus }: UploadQueueProps) {
  const queueKeys = Object.keys(queue);

  if (queueKeys.length === 0) return null;

  return (
    <div className="rounded-lg border border-hairline bg-surface-1 p-6">
      <h3 className="text-sm font-semibold text-ink mb-4">Active Upload Queue</h3>

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
  const router = useRouter();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusData]);

  const handleChatAboutDocument = () => {
    if (item.documentId) {
      router.push(`/chat/new?documentId=${item.documentId}`);
    }
  };

  const statusConfig = {
    UPLOADING: { color: "text-ink-muted", label: "Uploading", dot: "bg-warning" },
    QUEUED: { color: "text-ink-muted", label: "Queued", dot: "bg-warning" },
    PROCESSING: { color: "text-ink-muted", label: "Processing", dot: "bg-warning animate-pulse" },
    COMPLETED: { color: "text-ink-muted", label: "Completed", dot: "bg-success" },
    FAILED: { color: "text-destructive", label: "Failed", dot: "bg-destructive" },
    DUPLICATE: { color: "text-ink-muted", label: "Duplicate", dot: "bg-warning" },
  };

  const status = statusConfig[item.status];

  return (
    <div className="rounded-lg border border-hairline bg-surface-2 p-4 flex flex-col gap-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <span className="text-xs font-semibold text-ink truncate" title={item.filename}>
            {item.filename}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs font-medium flex items-center gap-1.5 ${status.color}`}>
            <span className={`h-2 w-2 rounded-full shrink-0 ${status.dot}`} />
            {status.label}
          </span>
          {(item.status === "COMPLETED" || item.status === "FAILED" || item.status === "DUPLICATE") && (
            <button
              onClick={onClear}
              className="rounded-md p-1 text-ink-subtle hover:bg-surface-3 hover:text-ink transition-colors"
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
          <div className="flex justify-between text-xs text-ink-muted font-medium">
            <span>Progress</span>
            <span>{item.progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${item.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Ingestion status description */}
      {item.status === "PROCESSING" && (
        <div className="flex items-center gap-2 text-xs text-ink-muted font-medium">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Ingestion pipeline running: parsing document blocks...</span>
        </div>
      )}

      {item.status === "COMPLETED" && (
        <>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span>Document chunks successfully indexed into ChromaDB!</span>
          </div>
          {item.documentId && (
            <button
              onClick={handleChatAboutDocument}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Chat about this document</span>
            </button>
          )}
        </>
      )}

      {item.status === "FAILED" && (
        <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
          <XCircle className="h-3.5 w-3.5" />
          <span>Ingestion failure: {item.error || "Failed to process document pages."}</span>
        </div>
      )}

      {item.status === "DUPLICATE" && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-ink-muted font-medium">
            <FileText className="h-3.5 w-3.5 text-warning" />
            <span>This document was already uploaded</span>
          </div>
          {item.existingDocumentId ? (
            <a
              href={`/documents/${item.existingDocumentId}`}
              className="inline-block text-xs font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              View existing document →
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
