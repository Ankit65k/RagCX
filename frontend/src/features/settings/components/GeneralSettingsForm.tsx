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
      <div className="flex items-center gap-2 text-foreground font-bold text-sm border-b pb-2">
        <Settings className="h-4.5 w-4.5 text-primary" />
        <span>General Application Settings</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            Application Brand Title
          </label>
          <input
            type="text"
            {...register("appName")}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
            Portal Timezone
          </label>
          <select
            {...register("timezone")}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
          >
            <option value="UTC-5 (EST)">UTC-5 (EST Eastern Time)</option>
            <option value="UTC+0 (GMT)">UTC+0 (GMT Greenwich Time)</option>
            <option value="UTC+5.5 (IST)">UTC+5.5 (IST Indian Time)</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
      >
        Save General Settings
      </button>
    </form>
  );
}
