"use client";

import React from "react";
import { useActivityTimeline } from "../hooks/useDashboard";
import { Upload, Trash2, RefreshCw, MessageSquare, AlertCircle } from "lucide-react";

const iconMap = {
  UPLOAD:    { icon: Upload,        text: "text-ink-subtle" },
  DELETE:    { icon: Trash2,        text: "text-ink-subtle" },
  RESTORE:   { icon: AlertCircle,   text: "text-ink-subtle" },
  REPROCESS: { icon: RefreshCw,     text: "text-ink-subtle" },
  CHAT:      { icon: MessageSquare, text: "text-ink-subtle" },
};

export default function ActivityTimeline() {
  const { data: timeline, isLoading, isError } = useActivityTimeline();

  if (isLoading) {
    return (
      <div className="bg-surface-1 border border-hairline rounded-lg p-4 animate-pulse space-y-4 h-full">
        <div className="h-4 w-36 bg-surface-2 rounded" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-7 w-7 rounded-md bg-surface-2 shrink-0" />
            <div className="flex-1 space-y-1.5 pt-0.5">
              <div className="h-3 w-4/5 bg-surface-2 rounded" />
              <div className="h-2.5 w-1/3 bg-surface-2 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError || !timeline) {
    return (
      <div className="rounded-lg border border-hairline bg-surface-1 p-4 text-xs text-ink-subtle text-center h-full flex items-center justify-center">
        Failed to load activity.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 bg-surface-1 border border-hairline rounded-lg p-4 h-full">
      <div>
        <h3 className="text-sm font-semibold text-ink tracking-tight">Activity</h3>
        <p className="text-xs text-ink-subtle mt-0.5">Recent platform events</p>
      </div>

      {/* Timeline */}
      <div className="relative flex-1 space-y-4">
        {/* Vertical line */}
        <div className="absolute left-3.5 top-0 bottom-0 w-px" style={{ backgroundColor: "hsl(var(--hairline))" }} />

        {timeline.map((act) => {
          const cfg = iconMap[act.type as keyof typeof iconMap] ?? iconMap.CHAT;
          const Icon = cfg.icon;

          return (
            <div key={act.id} className="relative flex items-start gap-3 pl-10">
              {/* Node */}
              <div
                className="absolute left-0 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2 border border-hairline"
                style={{ marginTop: "1px" }}
              >
                <Icon className={`h-3.5 w-3.5 ${cfg.text}`} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-xs text-ink font-medium leading-relaxed">
                  {act.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium text-ink-muted">{act.user}</span>
                  <span className="text-xs text-ink-subtle">
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
