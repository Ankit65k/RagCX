"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "../api/settingsApi";
import { SystemSettings } from "../types";
import { toast } from "sonner";

export function useSettingsQuery() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.getSettings,
    staleTime: Infinity, // keep cache until manually modified
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: settingsApi.updateSettings,
    onSuccess: (data) => {
      // Update local query cache immediately
      queryClient.setQueryData(["settings"], data);
      toast.success("Settings Updated", {
        description: "Application preferences and configuration saved successfully.",
      });
      console.log("[SettingsHook]: Saved configuration updates successfully.");
    },
    onError: () => {
      toast.error("Save Failed", {
        description: "Failed to update configuration changes.",
      });
    },
  });

  return {
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
