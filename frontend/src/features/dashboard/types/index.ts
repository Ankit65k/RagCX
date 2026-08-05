export interface SystemStats {
  totalDocuments: number;
  indexedDocuments: number;
  processingDocuments: number;
  failedDocuments: number;
  deletedDocuments: number;
}

export interface ServiceHealth {
  status: "healthy" | "unhealthy" | "degraded";
  latencyMs: number;
}

export interface PlatformHealth {
  aiService: ServiceHealth;
  redis: ServiceHealth;
  chromaDb: ServiceHealth;
  backendApi: ServiceHealth;
}

export interface RecentUploadItem {
  id: string;
  filename: string;
  uploadTime: string;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  pageCount: number;
}

export interface ConversationItem {
  id: string;
  title: string;
  lastUpdated: string;
  messageCount: number;
}

export interface ActivityItem {
  id: string;
  type: "UPLOAD" | "DELETE" | "RESTORE" | "REPROCESS" | "CHAT";
  description: string;
  timestamp: string;
  user: string;
}
