"use client";

import React from "react";
import { UploadProgressInfo } from "../hooks/useDocumentUpload";
import { FileText, RefreshCw } from "lucide-react";
import { documentsApi } from "../api/documentsApi";
import { toast } from "sonner";

interface UploadHistoryProps {
  history: UploadProgressInfo[];
}

export default function UploadHistory({ history }: UploadHistoryProps) {
  if (history.length === 0) return null;

  const handleReprocess = async (docId: string, filename: string) => {
    try {
      console.log(`[UploadHistory]: Triggering reprocessing for document: ${docId}`);
      await documentsApi.reprocess(docId);
      toast.success("Reprocessing Started", {
        description: `Triggered re-indexing for ${filename}`,
      });
    } catch (e) {
      toast.error("Reprocess Failed", {
        description: "Failed to request reprocessing from the API.",
      });
    }
  };

  return (
    <div className="rounded-lg border border-hairline bg-surface-1 p-6">
      <h3 className="text-sm font-semibold text-ink mb-4">Session Upload History</h3>

      <div className="space-y-3 divide-y divide-hairline">
        {history.map((doc, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between pt-3 first:pt-0"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-ink truncate">{doc.filename}</p>
                <p className="text-xs text-ink-subtle mt-0.5">
                  Uploaded at: {new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                {doc.status === "COMPLETED" ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-success shrink-0" />
                    <span>Success</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                    <span>Failed</span>
                  </>
                )}
              </div>

              {doc.status === "COMPLETED" && doc.documentId && (
                <button
                  onClick={() => handleReprocess(doc.documentId!, doc.filename)}
                  className="rounded-md p-1.5 text-ink-subtle hover:bg-surface-2 hover:text-ink transition-colors"
                  title="Reprocess document"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
