export interface SuggestedQuestion {
  id: string;
  question: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  relatedPages: number[];
  generationTimeMs: number;
}
