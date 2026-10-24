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
      <div className="flex items-center gap-2 text-ink font-semibold text-sm border-b border-hairline pb-3">
        <Compass className="h-4.5 w-4.5 text-primary" />
        <span>RAG Vector Retrieval Configuration</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-ink-subtle mb-1.5">
            Top K Retrieved Chunks
          </label>
          <input
            type="number"
            {...register("topK", { valueAsNumber: true })}
            className="w-full rounded-md border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-subtle mb-1.5">
            Cosine Similarity Threshold
          </label>
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            {...register("scoreThreshold", { valueAsNumber: true })}
            className="w-full rounded-md border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-subtle mb-1.5">
            Maximum Context Chunks Limit
          </label>
          <input
            type="number"
            {...register("maxContextChunks", { valueAsNumber: true })}
            className="w-full rounded-md border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-subtle mb-1.5">
            Maximum Context Characters Limit
          </label>
          <input
            type="number"
            {...register("maxContextCharacters", { valueAsNumber: true })}
            className="w-full rounded-md border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            disabled={!isAdmin}
          />
        </div>
      </div>

      {isAdmin && (
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
        >
          Save Retrieval Config
        </button>
      )}
    </form>
  );
}
