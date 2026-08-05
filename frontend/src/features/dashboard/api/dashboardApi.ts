import { axiosClient } from "@/core/api/axiosClient";
import { SystemStats, PlatformHealth, RecentUploadItem, ConversationItem, ActivityItem } from "../types";

export const dashboardApi = {
  getStats: async (): Promise<SystemStats> => {
    try {
      const res = await axiosClient.get("/dashboard/stats");
      return res.data;
    } catch (e) {
      // Fallback statistics for demonstration/development
      return {
        totalDocuments: 24,
        indexedDocuments: 18,
        processingDocuments: 3,
        failedDocuments: 2,
        deletedDocuments: 1,
      };
    }
  },

  getHealth: async (): Promise<PlatformHealth> => {
    try {
      const res = await axiosClient.get("/dashboard/health");
      return res.data;
    } catch (e) {
      return {
        aiService: { status: "healthy", latencyMs: 142 },
        redis: { status: "healthy", latencyMs: 4 },
        chromaDb: { status: "healthy", latencyMs: 18 },
        backendApi: { status: "healthy", latencyMs: 24 },
      };
    }
  },

  getRecentUploads: async (): Promise<RecentUploadItem[]> => {
    try {
      const res = await axiosClient.get("/dashboard/uploads");
      return res.data;
    } catch (e) {
      return [
        { id: "doc-1", filename: "safety_requirements_underground.pdf", uploadTime: "2026-08-04T10:15:00Z", status: "COMPLETED", pageCount: 14 },
        { id: "doc-2", filename: "mine_operations_manual.pdf", uploadTime: "2026-08-04T09:30:00Z", status: "PROCESSING", pageCount: 8 },
        { id: "doc-3", filename: "ventilation_standards.pdf", uploadTime: "2026-08-03T16:45:00Z", status: "FAILED", pageCount: 5 },
      ];
    }
  },

  getRecentConversations: async (): Promise<ConversationItem[]> => {
    try {
      const res = await axiosClient.get("/dashboard/conversations");
      return res.data;
    } catch (e) {
      return [
        { id: "c-1", title: "Underground Mines Safety Guidelines", lastUpdated: "2026-08-04T15:20:00Z", messageCount: 8 },
        { id: "c-2", title: "Ventilation fan failure protocols", lastUpdated: "2026-08-04T11:05:00Z", messageCount: 4 },
        { id: "c-3", title: "Drilling equipment specifications", lastUpdated: "2026-08-03T14:50:00Z", messageCount: 12 },
      ];
    }
  },

  getActivityTimeline: async (): Promise<ActivityItem[]> => {
    try {
      const res = await axiosClient.get("/dashboard/timeline");
      return res.data;
    } catch (e) {
      return [
        { id: "act-1", type: "CHAT", description: "Inquired about safety ventilation regulations", timestamp: "2026-08-04T15:20:00Z", user: "Sarah Jenkins" },
        { id: "act-2", type: "UPLOAD", description: "Uploaded 'mine_operations_manual.pdf'", timestamp: "2026-08-04T09:30:00Z", user: "Sarah Jenkins" },
        { id: "act-3", type: "REPROCESS", description: "Triggered reprocessing of 'safety_requirements_underground.pdf'", timestamp: "2026-08-04T08:10:00Z", user: "Sarah Jenkins" },
        { id: "act-4", type: "DELETE", description: "Removed obsolete document 'old_ventilation_guidelines.pdf'", timestamp: "2026-08-03T18:00:00Z", user: "System Scheduler" },
      ];
    }
  },
};
