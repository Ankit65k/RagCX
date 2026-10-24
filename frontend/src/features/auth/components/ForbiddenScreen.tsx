"use client";

import React from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ForbiddenScreen() {
  const router = useRouter();

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
      <div className="h-16 w-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-6">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold text-ink mb-3">Access Forbidden</h2>
      <p className="text-sm text-ink-subtle max-w-md mb-6 leading-relaxed">
        You do not have the required administrative permissions to access this feature resource. Please contact your system administrator.
      </p>
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 rounded-lg border border-hairline px-5 py-3 text-sm font-semibold text-ink hover:bg-surface-2 transition-all"
      >
        <ArrowLeft className="h-4 w-4" />
        Return to Home
      </button>
    </div>
  );
}
