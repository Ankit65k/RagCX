"use client";

import React from "react";
import { useDashboardStats } from "../hooks/useDashboard";
import { FileText, Database, RefreshCw, AlertOctagon, Trash2 } from "lucide-react";

const statConfig = [
  {
    key: "totalDocuments" as const,
    label: "Total Documents",
    icon: FileText,
    gradient: "from-violet-500/20 to-purple-500/10",
    iconColor: "text-violet-500",
    ring: "ring-violet-500/20",
  },
  {
    key: "indexedDocuments" as const,
    label: "Indexed",
    icon: Database,
    gradient: "from-emerald-500/20 to-teal-500/10",
    iconColor: "text-emerald-500",
    ring: "ring-emerald-500/20",
  },
  {
    key: "processingDocuments" as const,
    label: "Processing",
    icon: RefreshCw,
    gradient: "from-amber-500/20 to-orange-500/10",
    iconColor: "text-amber-500",
    ring: "ring-amber-500/20",
    animate: true,
  },
  {
    key: "failedDocuments" as const,
    label: "Failed",
    icon: AlertOctagon,
    gradient: "from-rose-500/20 to-red-500/10",
    iconColor: "text-rose-500",
    ring: "ring-rose-500/20",
  },
  {
    key: "deletedDocuments" as const,
    label: "Archived",
    icon: Trash2,
    gradient: "from-slate-500/20 to-gray-500/10",
    iconColor: "text-slate-400",
    ring: "ring-slate-500/20",
  },
];

export default function StatsWidget() {
  const { data: stats, isLoading, isError } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-5 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 glass rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive text-center">
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
            className={`card-glow relative overflow-hidden rounded-2xl glass p-5 flex flex-col justify-between`}
          >
            {/* Gradient background overlay inside glass */}
            <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradient} opacity-20 pointer-events-none`} />

            <div className="relative flex items-center justify-between">
              <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest">{cfg.label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/40 shadow-inner`}>
                <Icon className={`h-4 w-4 ${cfg.iconColor} ${cfg.animate ? "animate-spin" : ""}`} />
              </div>
            </div>

            <div className="relative mt-4">
              <span className={`text-4xl font-extrabold tracking-tighter ${cfg.iconColor}`}>
                {value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
