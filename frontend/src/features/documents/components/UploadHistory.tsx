"use client";

import React from "react";
import { UploadProgressInfo } from "../hooks/useDocumentUpload";
import { CheckCircle2, XCircle, RefreshCw, FileText } from "lucide-react";
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
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-sm font-bold text-foreground mb-4">Session Upload History</h3>
      
      <div className="space-y-3">
        {history.map((doc, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-xl border border-border bg-secondary/10 p-3"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-foreground truncate">{doc.filename}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Uploaded at: {new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1 text-[10px] font-semibold">
                {doc.status === "COMPLETED" ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Success</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    <span className="text-rose-500">Failed</span>
                  </>
                )}
              </div>
              
              {doc.status === "COMPLETED" && doc.documentId && (
                <button
                  onClick={() => handleReprocess(doc.documentId!, doc.filename)}
                  className="rounded-lg p-1.5 border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
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
