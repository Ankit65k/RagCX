"use client";

import React from "react";
import { useHealthStatus } from "../hooks/useDashboard";
import { ShieldCheck, Cpu, HardDrive, RefreshCw } from "lucide-react";

type Status = "healthy" | "degraded" | "unhealthy";

const statusStyles: Record<Status, { dot: string; badge: string; label: string }> = {
  healthy:   { dot: "bg-emerald-500", badge: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", label: "Healthy" },
  degraded:  { dot: "bg-amber-500",   badge: "text-amber-500 bg-amber-500/10 border-amber-500/20",       label: "Degraded" },
  unhealthy: { dot: "bg-rose-500",    badge: "text-rose-500 bg-rose-500/10 border-rose-500/20",          label: "Down" },
};

export default function HealthWidget() {
  const { data: health, isLoading, isError } = useHealthStatus();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 animate-pulse space-y-3 h-full">
        <div className="h-4 w-36 bg-muted rounded" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError || !health) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive text-center h-full flex items-center justify-center">
        Failed to load cluster health.
      </div>
    );
  }

  const services = [
    { label: "AI model", sub: "Ollama LLM", data: health.aiService,  icon: Cpu },
    { label: "Queue",    sub: "Queue & cache", data: health.redis,    icon: RefreshCw },
    { label: "ChromaDB",        sub: "Vector store",  data: health.chromaDb, icon: HardDrive },
    { label: "Backend",        sub: "Backend core",  data: health.backendApi, icon: ShieldCheck },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 h-full">
      <div>
        <h3 className="text-sm font-bold text-foreground">Service Health</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Live cluster status</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {services.map((srv) => {
          const Icon = srv.icon;
          const status = (srv.data?.status ?? "unhealthy") as Status;
          const st = statusStyles[status];

          return (
            <div
              key={srv.label}
              className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3.5 py-3 hover:bg-secondary/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/80 border border-border">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground leading-none">{srv.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {srv.sub} · {srv.data?.latencyMs ?? "—"}ms
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${st.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full status-dot ${st.dot}`} />
                {st.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
