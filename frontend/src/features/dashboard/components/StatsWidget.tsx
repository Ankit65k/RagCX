"use client";

import React from "react";
import { useDashboardStats } from "../hooks/useDashboard";
import { FileText, Database, RefreshCw, AlertOctagon, Trash2 } from "lucide-react";

const statConfig = [
  {
    key: "totalDocuments" as const,
    label: "Total Documents",
    icon: FileText,
    iconColor: "text-ink-subtle",
  },
  {
    key: "indexedDocuments" as const,
    label: "Indexed",
    icon: Database,
    iconColor: "text-success",
  },
  {
    key: "processingDocuments" as const,
    label: "Processing",
    icon: RefreshCw,
    iconColor: "text-ink-subtle",
    animate: true,
  },
  {
    key: "failedDocuments" as const,
    label: "Failed",
    icon: AlertOctagon,
    iconColor: "text-destructive/80",
  },
  {
    key: "deletedDocuments" as const,
    label: "Archived",
    icon: Trash2,
    iconColor: "text-ink-subtle",
  },
];

export default function StatsWidget() {
  const { data: stats, isLoading, isError } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-surface-2 border border-hairline rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="rounded-lg border border-hairline bg-surface-1 p-4 text-sm text-ink-subtle text-center">
        Failed to load metrics.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-5">
      {statConfig.map((cfg) => {
        const Icon = cfg.icon;
        const value = stats[cfg.key];
        return (
          <div
            key={cfg.key}
            className="bg-surface-1 border border-hairline rounded-lg p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-ink-subtle uppercase tracking-wide">
                {cfg.label}
              </p>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2">
                <Icon
                  className={`h-4 w-4 ${cfg.iconColor} ${
                    cfg.animate ? "animate-spin" : ""
                  }`}
                />
              </div>
            </div>

            <div className="mt-3">
              <span className="text-3xl font-semibold tracking-tight text-ink">
                {value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}