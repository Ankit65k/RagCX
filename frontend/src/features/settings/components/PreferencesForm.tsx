"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { ApplicationPreferences } from "../types";
import { Sliders } from "lucide-react";

interface PreferencesFormProps {
  initialValues: ApplicationPreferences;
  onSubmit: (data: ApplicationPreferences) => void;
}

export default function PreferencesForm({ initialValues, onSubmit }: PreferencesFormProps) {
  const { register, handleSubmit } = useForm<ApplicationPreferences>({
    defaultValues: initialValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="flex items-center gap-2 text-foreground font-bold text-sm border-b pb-2">
        <Sliders className="h-4.5 w-4.5 text-primary" />
        <span>Application Preferences</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            Ingestion status Polling Rate (ms)
          </label>
          <input
            type="number"
            {...register("pollingIntervalMs", { valueAsNumber: true })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            id="autoRefresh"
            {...register("autoRefresh")}
            className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
          />
          <label htmlFor="autoRefresh" className="text-xs font-semibold text-foreground select-none">
            Auto Refresh Operations Dashboard
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
      >
        Save Preferences
      </button>
    </form>
  );
}
