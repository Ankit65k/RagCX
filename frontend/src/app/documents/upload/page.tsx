"use client";

import React, { useState } from "react";
import { ProtectedRoute } from "@/features/auth/guards/RouteGuard";
import FileDropzone from "@/features/documents/components/FileDropzone";
import UploadQueue from "@/features/documents/components/UploadQueue";
import UploadHistory from "@/features/documents/components/UploadHistory";
import { UploadProgressInfo, useDocumentUpload } from "@/features/documents/hooks/useDocumentUpload";
import { useAuthStore } from "@/core/store/authStore";
import { FileUp, Info } from "lucide-react";

export default function DocumentUploadPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const { uploadFile, uploadQueue, clearQueueItem } = useDocumentUpload();
  const [localQueue, setLocalQueue] = useState<Record<string, UploadProgressInfo>>({});
  const [historyList, setHistoryList] = useState<UploadProgressInfo[]>([]);

  // Capture queue mutations from custom hook and sync locally
  React.useEffect(() => {
    setLocalQueue((prev) => {
      const merged = { ...prev };
      Object.entries(uploadQueue).forEach(([key, val]) => {
        merged[key] = val;
      });
      return merged;
    });
  }, [uploadQueue]);

  const handleUpdateStatus = (fileKey: string, status: UploadProgressInfo["status"]) => {
    setLocalQueue((prev) => {
      if (!prev[fileKey]) return prev;
      const updatedItem = { ...prev[fileKey], status };
      
      // If reached terminal status, push to history
      if (status === "COMPLETED" || status === "FAILED") {
        setHistoryList((hist) => {
          // Avoid pushing duplicates
          if (hist.some((h) => h.filename === updatedItem.filename && h.status === updatedItem.status)) {
            return hist;
          }
          return [updatedItem, ...hist];
        });
      }

      return {
        ...prev,
        [fileKey]: updatedItem,
      };
    });
  };

  const handleClearItem = (fileKey: string) => {
    clearQueueItem(fileKey);
    setLocalQueue((prev) => {
      const copy = { ...prev };
      delete copy[fileKey];
      return copy;
    });
  };

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <div className="mx-auto max-w-7xl text-center py-20 animate-in fade-in duration-300">
          <h2 className="text-xl font-bold text-destructive">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2 font-medium">
            Only administrators are permitted to access the document ingestion pipeline.
          </p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-300 pb-8">
        
        {/* Title Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <FileUp className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Upload PDF Documents
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ingest new reference documents into the vector store.
            </p>
          </div>
        </div>

        {/* Wizard Main Grid Layout */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left / Dropzone panel */}
          <div className="md:col-span-2 space-y-6">
            <FileDropzone onFileSelected={uploadFile} />
            
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3 text-xs text-blue-600 font-semibold leading-relaxed">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p>Corporate Security Regulations Notice</p>
                <p className="text-[10px] text-muted-foreground font-medium mt-1 leading-normal">
                  All PDF uploads undergo text extraction, page alignment, embedding calculation via local vectors, and secure persistence in ChromaDB. Handlers log activity timeline traces.
                </p>
              </div>
            </div>
          </div>

          {/* Right / Queue and history list panel */}
          <div className="space-y-6">
            <UploadQueue
              queue={localQueue}
              onClearItem={handleClearItem}
              onUpdateStatus={handleUpdateStatus}
            />

            <UploadHistory history={historyList} />
          </div>
        </div>

      </div>
    </ProtectedRoute>
  );
}
