"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { AiConfiguration } from "../types";
import { Cpu, ShieldAlert } from "lucide-react";

interface AiSettingsFormProps {
  initialValues: AiConfiguration;
  onSubmit: (data: AiConfiguration) => void;
  isAdmin: boolean;
}

export default function AiSettingsForm({ initialValues, onSubmit, isAdmin }: AiSettingsFormProps) {
  const { register, handleSubmit } = useForm<AiConfiguration>({
    defaultValues: initialValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="flex items-center gap-2 text-foreground font-bold text-sm border-b pb-2">
        <Cpu className="h-4.5 w-4.5 text-primary" />
        <span>AI & LLM Orchestration Settings</span>
      </div>

      {!isAdmin && (
        <div className="flex gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-[10px] text-amber-600 font-semibold leading-relaxed">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Regular User mode active: system-level configurations are read-only.</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Model selectors */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            Chat / Reasoning Model
          </label>
          <select
            {...register("chatModel")}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
            disabled={!isAdmin}
          >
            <option value="llama3:8b-instruct-q8_0">Llama 3 (8B Instruct Q8)</option>
            <option value="mistral:7b-instruct-v0.3">Mistral (7B Instruct v0.3)</option>
            <option value="phi3:mini">Phi 3 Mini (3.8B)</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            Embedding Model
          </label>
          <select
            {...register("embeddingModel")}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
            disabled={!isAdmin}
          >
            <option value="nomic-embed-text:latest">Nomic Embed Text (latest)</option>
            <option value="all-minilm:latest">All MiniLM L6 v2</option>
          </select>
        </div>

        {/* Hyperparameters */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            Temperature (Creativity)
          </label>
          <input
            type="number"
            step="0.05"
            min="0"
            max="1.5"
            {...register("temperature", { valueAsNumber: true })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
            disabled={!isAdmin}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            Max Generation Tokens
          </label>
          <input
            type="number"
            {...register("maxTokens", { valueAsNumber: true })}
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
          Save AI Config
        </button>
      )}
    </form>
  );
}
