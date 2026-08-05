import { axiosClient } from "@/core/api/axiosClient";

export interface DocumentItem {
  id: string;
  filename: string;
  status: "UPLOADING" | "UPLOADED" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "REPROCESSING" | "DELETED";
  pageCount?: number;
  uploadedAt: string;
  uploadedBy?: string;
  fileSize?: number;
  checksum?: string;
  chunkCount?: number;
  embeddingCount?: number;
  processingTimeline?: Array<{ event: string; timestamp: string }>;
  suggestedQuestions?: string[];
  lastUpdated?: string;
}

export interface ListDocumentsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ListDocumentsResponse {
  items: DocumentItem[];
  total: number;
  page: number;
  pageSize: number;
}

const mapDocument = (raw: any): DocumentItem => {
  if (!raw) return raw;
  return {
    id: raw.id,
    filename: raw.originalFileName || raw.filename || "",
    status: raw.processingStatus || raw.status || "PENDING",
    pageCount: raw.totalPages ?? raw.pageCount ?? 0,
    uploadedAt: raw.createdAt || raw.uploadedAt || new Date().toISOString(),
    uploadedBy: raw.uploadedBy || raw.user?.email || raw.user?.id || "",
    fileSize: raw.fileSize,
    checksum: raw.checksum,
    chunkCount: raw.chunkCount || 0,
    embeddingCount: raw.embeddingCount || 0,
    processingTimeline: raw.processingTimeline || [],
    suggestedQuestions: raw.suggestedQuestions || [],
    lastUpdated: raw.updatedAt || raw.lastUpdated || raw.createdAt || new Date().toISOString(),
  };
};

export const documentsApi = {
  list: async (params?: ListDocumentsParams): Promise<ListDocumentsResponse> => {
    const res = await axiosClient.get("/documents", { params });
    const rawItems = res.data.items || [];
    return {
      items: rawItems.map(mapDocument),
      total: res.data.meta?.totalItems || 0,
      page: res.data.meta?.currentPage || 1,
      pageSize: res.data.meta?.itemsPerPage || 10,
    };
  },

  getById: async (documentId: string): Promise<DocumentItem> => {
    const res = await axiosClient.get(`/documents/${documentId}`);
    return mapDocument(res.data);
  },

  upload: async (file: File): Promise<DocumentItem> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axiosClient.post("/documents", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return mapDocument(res.data);
  },

  delete: async (documentId: string): Promise<void> => {
    await axiosClient.delete(`/documents/${documentId}`);
  },

  getStatus: async (documentId: string): Promise<DocumentItem> => {
    const res = await axiosClient.get(`/documents/${documentId}`);
    return mapDocument(res.data);
  },

  reprocess: async (documentId: string): Promise<DocumentItem> => {
    const res = await axiosClient.post(`/documents/${documentId}/reprocess`);
    return mapDocument(res.data);
  },

  restore: async (documentId: string): Promise<DocumentItem> => {
    const res = await axiosClient.post(`/documents/${documentId}/restore`);
    return mapDocument(res.data);
  },
};
