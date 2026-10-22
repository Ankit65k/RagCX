"use client";

import React from "react";
import { useHealthStatus } from "../hooks/useDashboard";
import { ShieldCheck, Cpu, HardDrive, RefreshCw } from "lucide-react";

type Status = "healthy" | "degraded" | "unhealthy";

const statusStyles: Record<Status, { dot: string; label: string }> = {
  healthy:   { dot: "bg-success", label: "Healthy" },
  degraded:  { dot: "bg-warning", label: "Degraded" },
  unhealthy: { dot: "bg-destructive", label: "Down" },
};

export default function HealthWidget() {
  const { data: health, isLoading, isError } = useHealthStatus();

  if (isLoading) {
    return (
      <div className="bg-surface-1 border border-hairline rounded-lg p-4 animate-pulse space-y-3 h-full">
        <div className="h-4 w-36 bg-surface-2 rounded" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-surface-2 rounded" />
        ))}
      </div>
    );
  }

  if (isError || !health) {
    return (
      <div className="rounded-lg border border-hairline bg-surface-1 p-4 text-xs text-ink-subtle text-center h-full flex items-center justify-center">
        Failed to load cluster health.
      </div>
    );
  }

  const services = [
    { label: "AI model", sub: "Ollama LLM", data: health.aiService,  icon: Cpu },
    { label: "Queue",    sub: "Queue & cache", data: health.redis,    icon: RefreshCw },
    { label: "ChromaDB", sub: "Vector store",  data: health.chromaDb, icon: HardDrive },
    { label: "Backend",  sub: "Backend core",  data: health.backendApi, icon: ShieldCheck },
  ];

  return (
    <div className="flex flex-col gap-4 bg-surface-1 border border-hairline rounded-lg p-4 h-full">
      <div>
        <h3 className="text-sm font-semibold text-ink">Service Health</h3>
        <p className="text-xs text-ink-subtle mt-0.5">Live cluster status</p>
      </div>

      <div className="flex flex-col divide-y divide-hairline">
        {services.map((srv) => {
          const Icon = srv.icon;
          const status = (srv.data?.status ?? "unhealthy") as Status;
          const st = statusStyles[status];

          return (
            <div
              key={srv.label}
              className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 hover:bg-surface-2 px-2 -mx-2 rounded transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2">
                  <Icon className="h-3.5 w-3.5 text-ink-subtle" />
                </div>
                <div>
                  <p className="text-xs font-medium text-ink leading-none">{srv.label}</p>
                  <p className="text-xs text-ink-subtle mt-0.5">
                    {srv.sub} · {srv.data?.latencyMs ?? "—"}ms
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                <span className="text-xs font-medium text-ink-muted">{st.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
