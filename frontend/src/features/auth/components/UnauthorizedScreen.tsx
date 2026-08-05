"use client";

import React from "react";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UnauthorizedScreen() {
  const router = useRouter();

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
      <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
        <LogIn className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-3">Authentication Required</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
        Your current session is not authenticated. Please log in to gain access to documents and chat components.
      </p>
      <button
        onClick={() => router.push("/login")}
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-lg shadow-primary/20"
      >
        Go to Login
      </button>
    </div>
  );
}
