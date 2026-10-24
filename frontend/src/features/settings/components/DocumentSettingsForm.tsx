"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { DocumentProcessingSettings } from "../types";
import { FileUp } from "lucide-react";

interface DocumentSettingsFormProps {
  initialValues: DocumentProcessingSettings;
  onSubmit: (data: DocumentProcessingSettings) => void;
  isAdmin: boolean;
}

export default function DocumentSettingsForm({ initialValues, onSubmit, isAdmin }: DocumentSettingsFormProps) {
  const { register, handleSubmit } = useForm<DocumentProcessingSettings>({
    defaultValues: initialValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="flex items-center gap-2 text-ink font-semibold text-sm border-b border-hairline pb-3">
        <FileUp className="h-4.5 w-4.5 text-primary" />
        <span>Document Processing & Chunking</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-ink-subtle mb-1.5">
            Default Chunk Size (Tokens)
          </label>
          <input
            type="number"
            {...register("chunkSize", { valueAsNumber: true })}
            className="w-full rounded-md border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-subtle mb-1.5">
            Default Chunk Overlap (Tokens)
          </label>
          <input
            type="number"
            {...register("chunkOverlap", { valueAsNumber: true })}
            className="w-full rounded-md border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-subtle mb-1.5">
            Maximum Upload File Size (MB)
          </label>
          <input
            type="number"
            {...register("maxFileSizeMB", { valueAsNumber: true })}
            className="w-full rounded-md border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-subtle mb-1.5">
            Maximum Document Page Count
          </label>
          <input
            type="number"
            {...register("maxPages", { valueAsNumber: true })}
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
          Save Processing Config
        </button>
      )}
    </form>
  );
}
