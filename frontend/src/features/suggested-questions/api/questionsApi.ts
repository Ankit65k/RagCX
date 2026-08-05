import { axiosClient } from "@/core/api/axiosClient";
import { SuggestedQuestion } from "../types";

export const questionsApi = {
  getQuestions: async (documentId?: string, sessionId?: string): Promise<SuggestedQuestion[]> => {
    const res = await axiosClient.get("/suggested-questions", {
      params: { documentId, sessionId },
    });
    return res.data;
  },

  regenerateQuestions: async (documentId?: string, sessionId?: string): Promise<SuggestedQuestion[]> => {
    const res = await axiosClient.post("/suggested-questions/regenerate", { documentId, sessionId });
    return res.data;
  },
};
