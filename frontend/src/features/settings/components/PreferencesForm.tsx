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
      <div className="flex items-center gap-2 text-ink font-semibold text-sm border-b border-hairline pb-3">
        <Sliders className="h-4.5 w-4.5 text-primary" />
        <span>Application Preferences</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-ink-subtle mb-1.5">
            Ingestion status Polling Rate (ms)
          </label>
          <input
            type="number"
            {...register("pollingIntervalMs", { valueAsNumber: true })}
            className="w-full rounded-md border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            id="autoRefresh"
            {...register("autoRefresh")}
            className="h-4 w-4 rounded-md border border-hairline bg-surface-3 text-primary accent-primary focus:ring-2 focus:ring-primary/50 cursor-pointer"
          />
          <label htmlFor="autoRefresh" className="text-sm font-medium text-ink select-none cursor-pointer">
            Auto Refresh Operations Dashboard
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
      >
        Save Preferences
      </button>
    </form>
  );
}
