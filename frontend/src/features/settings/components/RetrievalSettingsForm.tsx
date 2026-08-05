"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { RetrievalConfiguration } from "../types";
import { Compass } from "lucide-react";

interface RetrievalSettingsFormProps {
  initialValues: RetrievalConfiguration;
  onSubmit: (data: RetrievalConfiguration) => void;
  isAdmin: boolean;
}

export default function RetrievalSettingsForm({ initialValues, onSubmit, isAdmin }: RetrievalSettingsFormProps) {
  const { register, handleSubmit } = useForm<RetrievalConfiguration>({
    defaultValues: initialValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="flex items-center gap-2 text-foreground font-bold text-sm border-b pb-2">
        <Compass className="h-4.5 w-4.5 text-primary" />
        <span>RAG Vector Retrieval Configuration</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            Top K Retrieved Chunks
          </label>
          <input
            type="number"
            {...register("topK", { valueAsNumber: true })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
            disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            Cosine Similarity Threshold
          </label>
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            {...register("scoreThreshold", { valueAsNumber: true })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
            disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            Maximum Context Chunks Limit
          </label>
          <input
            type="number"
            {...register("maxContextChunks", { valueAsNumber: true })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
            disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            Maximum Context Characters Limit
          </label>
          <input
            type="number"
            {...register("maxContextCharacters", { valueAsNumber: true })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
            disabled={!isAdmin}
          />
        </div>
      </div>

      {isAdmin && (
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
        >
          Save Retrieval Config
        </button>
      )}
    </form>
  );
}
