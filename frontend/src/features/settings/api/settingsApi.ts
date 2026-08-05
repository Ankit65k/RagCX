import { axiosClient } from "@/core/api/axiosClient";
import { SystemSettings } from "../types";

export const settingsApi = {
  getSettings: async (): Promise<SystemSettings> => {
    try {
      const res = await axiosClient.get("/settings");
      return res.data;
    } catch (e) {
      // Robust fallback values for development settings
      return {
        general: {
          appName: "RagCX Operations Portal",
          theme: "system",
          timezone: "UTC-5 (EST)",
          language: "en-US",
        },
        ai: {
          chatModel: "llama3:8b-instruct-q8_0",
          embeddingModel: "nomic-embed-text:latest",
          temperature: 0.2,
          topP: 0.9,
          topK: 40,
          maxTokens: 2048,
          streaming: false,
        },
        retrieval: {
          topK: 5,
          scoreThreshold: 0.75,
          maxContextChunks: 10,
          maxContextCharacters: 8000,
        },
        documentProcessing: {
          chunkSize: 500,
          chunkOverlap: 50,
          maxFileSizeMB: 50,
          maxPages: 100,
        },
        preferences: {
          pollingIntervalMs: 3000,
          autoRefresh: true,
          notifyOnSuccess: true,
          notifyOnFailure: true,
        },
      };
    }
  },

  updateSettings: async (settings: SystemSettings): Promise<SystemSettings> => {
    try {
      const res = await axiosClient.put("/settings", settings);
      return res.data;
    } catch (e) {
      console.log("[SettingsApi]: Simulation saved settings updates:", settings);
      return settings;
    }
  },
};
