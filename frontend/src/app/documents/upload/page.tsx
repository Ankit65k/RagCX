"use client";

import React, { useState } from "react";
import { ProtectedRoute } from "@/features/auth/guards/RouteGuard";
import FileDropzone from "@/features/documents/components/FileDropzone";
import UploadQueue from "@/features/documents/components/UploadQueue";
import UploadHistory from "@/features/documents/components/UploadHistory";
import { UploadProgressInfo, useDocumentUpload } from "@/features/documents/hooks/useDocumentUpload";
import { useAuthStore } from "@/core/store/authStore";
import { FileUp } from "lucide-react";

export default function DocumentUploadPage() {
  const { user } = useAuthStore();
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

  const handleUpdateStatus = React.useCallback((fileKey: string, status: UploadProgressInfo["status"]) => {
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
  }, []);

  const handleClearItem = (fileKey: string) => {
    clearQueueItem(fileKey);
    setLocalQueue((prev) => {
      const copy = { ...prev };
      delete copy[fileKey];
      return copy;
    });
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-300 pb-8">

        {/* Title Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <FileUp className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">
              Upload PDF
            </h1>
            <p className="text-sm text-ink-subtle mt-0.5">
              Add a document to chat with.
            </p>
          </div>
        </div>

        {/* Wizard Main Grid Layout */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left / Dropzone panel */}
          <div className="md:col-span-2">
            <FileDropzone onFileSelected={uploadFile} />
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
