"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { documentsApi } from "../api/documentsApi";
import { axiosClient } from "@/core/api/axiosClient";
import { toast } from "sonner";

export interface UploadProgressInfo {
  filename: string;
  progress: number;
  status: "UPLOADING" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  documentId?: string;
  error?: string;
}

export function useDocumentUpload() {
  const queryClient = useQueryClient();
  const [uploadQueue, setUploadQueue] = useState<Record<string, UploadProgressInfo>>({});

  // Mutation for uploading file
  const uploadMutation = useMutation({
    mutationFn: async ({ file, fileKey }: { file: File; fileKey: string }) => {
      setUploadQueue((prev) => ({
        ...prev,
        [fileKey]: { filename: file.name, progress: 0, status: "UPLOADING" },
      }));

      const formData = new FormData();
      formData.append("file", file);

      // Perform request directly with axiosClient to access progress listener
      const res = await axiosClient.post("/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || file.size;
          const percentage = Math.round((progressEvent.loaded * 100) / total);
          setUploadQueue((prev) => ({
            ...prev,
            [fileKey]: { ...prev[fileKey], progress: percentage },
          }));
        },
      });

      return { res: res.data, fileKey };
    },
    onSuccess: ({ res, fileKey }) => {
      setUploadQueue((prev) => ({
        ...prev,
        [fileKey]: {
          ...prev[fileKey],
          progress: 100,
          status: "PROCESSING",
          documentId: res.id,
        },
      }));

      toast.success(`Uploaded ${prevQueueName(fileKey)}`, {
        description: "Document received. Ingestion pipeline started.",
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: any, { file, fileKey }) => {
      const errMsg = err?.response?.data?.message || "File upload failed.";
      setUploadQueue((prev) => ({
        ...prev,
        [fileKey]: {
          ...prev[fileKey],
          status: "FAILED",
          error: errMsg,
        },
      }));

      toast.error(`Upload Failed`, {
        description: `${file.name}: ${errMsg}`,
      });
    },
  });

  const prevQueueName = (key: string) => {
    return uploadQueue[key]?.filename || "file";
  };

  const uploadFile = useCallback(
    (file: File) => {
      const fileKey = `${file.name}-${file.size}-${Date.now()}`;
      uploadMutation.mutate({ file, fileKey });
    },
    [uploadMutation]
  );

  const clearQueueItem = useCallback((fileKey: string) => {
    setUploadQueue((prev) => {
      const updated = { ...prev };
      delete updated[fileKey];
      return updated;
    });
  }, []);

  return {
    uploadFile,
    uploadQueue,
    clearQueueItem,
    isUploading: uploadMutation.isPending,
  };
}

export function useDocumentStatusQuery(documentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["documentStatus", documentId],
    queryFn: () => documentsApi.getStatus(documentId),
    enabled: enabled && !!documentId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === "COMPLETED" || data.status === "FAILED")) {
        console.log(`[StatusQuery]: Terminal state '${data.status}' reached. Polling stopped.`);
        return false;
      }
      return 3000; // Poll every 3 seconds while processing
    },
  });
}
