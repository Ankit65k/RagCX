"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentsApi, ListDocumentsParams } from "../api/documentsApi";
import { toast } from "sonner";

export function useDocumentsQuery(params: ListDocumentsParams) {
  return useQuery({
    queryKey: ["documents", params],
    queryFn: () => documentsApi.list(params),
    staleTime: 5000,
  });
}

export function useDocumentMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  // 1. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => {
      toast.success("Document Deleted", {
        description: "Soft deletion successful. The item was archived.",
      });
      invalidate();
    },
    onError: () => {
      toast.error("Deletion Failed", {
        description: "Failed to delete document.",
      });
    },
  });

  // 2. Reprocess Mutation
  const reprocessMutation = useMutation({
    mutationFn: documentsApi.reprocess,
    onSuccess: (data) => {
      toast.success("Reprocessing Triggered", {
        description: `Pipeline restarted for: ${data.filename}`,
      });
      invalidate();
    },
    onError: () => {
      toast.error("Action Failed", {
        description: "Failed to trigger reprocessing.",
      });
    },
  });

  // 3. Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: documentsApi.restore,
    onSuccess: (data) => {
      toast.success("Document Restored", {
        description: `${data.filename} has been returned to service.`,
      });
      invalidate();
    },
    onError: () => {
      toast.error("Action Failed", {
        description: "Failed to restore document.",
      });
    },
  });

  return {
    deleteDoc: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    reprocessDoc: reprocessMutation.mutate,
    isReprocessing: reprocessMutation.isPending,
    restoreDoc: restoreMutation.mutate,
    isRestoring: restoreMutation.isPending,
  };
}
