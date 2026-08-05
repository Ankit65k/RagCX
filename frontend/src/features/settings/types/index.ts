export interface GeneralSettings {
  appName: string;
  theme: "light" | "dark" | "system";
  timezone: string;
  language: string;
}

export interface AiConfiguration {
  chatModel: string;
  embeddingModel: string;
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  streaming: boolean;
}

export interface RetrievalConfiguration {
  topK: number;
  scoreThreshold: number;
  maxContextChunks: number;
  maxContextCharacters: number;
}

export interface DocumentProcessingSettings {
  chunkSize: number;
  chunkOverlap: number;
  maxFileSizeMB: number;
  maxPages: number;
}

export interface ApplicationPreferences {
  pollingIntervalMs: number;
  autoRefresh: boolean;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
}

export interface SystemSettings {
  general: GeneralSettings;
  ai: AiConfiguration;
  retrieval: RetrievalConfiguration;
  documentProcessing: DocumentProcessingSettings;
  preferences: ApplicationPreferences;
}
