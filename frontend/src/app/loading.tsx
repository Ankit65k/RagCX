import React from "react";

export default function Loading() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 z-50">
      <div className="relative">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl animate-pulse" />
        {/* Logo mark */}
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-xl shadow-xl shadow-primary/40">
          R
        </div>
      </div>
      <div className="mt-5 space-y-1.5 text-center">
        <p className="text-sm font-semibold text-foreground">RagCX</p>
        <p className="text-xs text-muted-foreground animate-pulse">Loading workspace…</p>
      </div>
      {/* Progress bar */}
      <div className="mt-6 h-0.5 w-40 rounded-full bg-border overflow-hidden">
        <div className="h-full w-1/2 rounded-full bg-primary animate-[pulse_1.5s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}
