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
      <div className="flex items-center gap-2 text-foreground font-bold text-sm border-b pb-2">
        <FileUp className="h-4.5 w-4.5 text-primary" />
        <span>Document Processing & Chunking</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            Default Chunk Size (Tokens)
          </label>
          <input
            type="number"
            {...register("chunkSize", { valueAsNumber: true })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
            disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            Default Chunk Overlap (Tokens)
          </label>
          <input
            type="number"
            {...register("chunkOverlap", { valueAsNumber: true })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
            disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            Maximum Upload File Size (MB)
          </label>
          <input
            type="number"
            {...register("maxFileSizeMB", { valueAsNumber: true })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
            disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            Maximum Document Page Count
          </label>
          <input
            type="number"
            {...register("maxPages", { valueAsNumber: true })}
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
          Save Processing Config
        </button>
      )}
    </form>
  );
}
