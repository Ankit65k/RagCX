"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { GeneralSettings } from "../types";
import { Settings } from "lucide-react";

interface GeneralSettingsFormProps {
  initialValues: GeneralSettings;
  onSubmit: (data: GeneralSettings) => void;
}

export default function GeneralSettingsForm({ initialValues, onSubmit }: GeneralSettingsFormProps) {
  const { register, handleSubmit } = useForm<GeneralSettings>({
    defaultValues: initialValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="flex items-center gap-2 text-ink font-semibold text-sm border-b border-hairline pb-3">
        <Settings className="h-4.5 w-4.5 text-primary" />
        <span>General Application Settings</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-ink-subtle mb-1.5">
            Application Brand Title
          </label>
          <input
            type="text"
            {...register("appName")}
            className="w-full rounded-md border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-subtle mb-1.5">
            Portal Timezone
          </label>
          <select
            {...register("timezone")}
            className="w-full rounded-md border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="UTC-5 (EST)">UTC-5 (EST Eastern Time)</option>
            <option value="UTC+0 (GMT)">UTC+0 (GMT Greenwich Time)</option>
            <option value="UTC+5.5 (IST)">UTC+5.5 (IST Indian Time)</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
      >
        Save General Settings
      </button>
    </form>
  );
}
