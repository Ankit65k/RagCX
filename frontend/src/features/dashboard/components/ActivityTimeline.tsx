"use client";

import React from "react";
import { useActivityTimeline } from "../hooks/useDashboard";
import { Upload, Trash2, RefreshCw, MessageSquare, AlertCircle } from "lucide-react";

const iconMap = {
  UPLOAD:    { icon: Upload,        bg: "bg-blue-500/15",    text: "text-blue-500" },
  DELETE:    { icon: Trash2,        bg: "bg-rose-500/15",    text: "text-rose-500" },
  RESTORE:   { icon: AlertCircle,   bg: "bg-emerald-500/15", text: "text-emerald-500" },
  REPROCESS: { icon: RefreshCw,     bg: "bg-amber-500/15",   text: "text-amber-500" },
  CHAT:      { icon: MessageSquare, bg: "bg-violet-500/15",  text: "text-violet-500" },
};

export default function ActivityTimeline() {
  const { data: timeline, isLoading, isError } = useActivityTimeline();

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-6 animate-pulse space-y-4 h-full">
        <div className="h-4 w-36 bg-muted rounded" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5 pt-1">
              <div className="h-3 w-4/5 bg-muted rounded" />
              <div className="h-2.5 w-1/3 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError || !timeline) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive text-center h-full flex items-center justify-center">
        Failed to load activity.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl glass p-6 h-full">
      <div>
        <h3 className="text-sm font-bold text-foreground tracking-tight">Activity</h3>
        <p className="text-xs text-muted-foreground/80 mt-0.5">Recent platform events</p>
      </div>

      {/* Timeline */}
      <div className="relative flex-1 pl-2 space-y-6">
        {/* Vertical line */}
        <div className="absolute left-[24px] top-2 bottom-2 w-[2px] bg-secondary" />

        {timeline.map((act) => {
          const cfg = iconMap[act.type as keyof typeof iconMap] ?? iconMap.CHAT;
          const Icon = cfg.icon;

          return (
            <div key={act.id} className="relative flex items-start gap-4">
              {/* Node (flex child) */}
              <div
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-4 border-card bg-card ${cfg.bg}`}
              >
                <Icon className={`h-3.5 w-3.5 ${cfg.text}`} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-xs text-foreground font-medium leading-relaxed">
                  {act.description}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-bold text-primary">{act.user}</span>
                  <span className="text-[10px] text-muted-foreground/80">
                    {new Date(act.timestamp).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
