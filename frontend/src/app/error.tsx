"use client";

import React, { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log exception to console/telemetry service
    console.error("App boundary caught unhandled error:", error);
  }, [error]);

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
      <div className="h-16 w-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-6">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold text-ink mb-3">Something went wrong!</h2>
      <p className="text-sm text-ink-subtle max-w-md mb-6 leading-relaxed">
        {error.message || "An unexpected error occurred while loading this section of the portal."}
      </p>
      <button
        onClick={() => reset()}
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all"
      >
        <RotateCcw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}
