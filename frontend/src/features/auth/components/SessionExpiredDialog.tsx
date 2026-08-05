"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface SessionExpiredDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SessionExpiredDialog({ isOpen, onClose }: SessionExpiredDialogProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleRedirect = () => {
    onClose();
    router.push("/login");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl text-center animate-in zoom-in-95 duration-200"
      >
        <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 id="session-expired-title" className="text-lg font-bold text-foreground mb-2">
          Session Expired
        </h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Your active login session has expired or was revoked. Please log in again to continue using the portal.
        </p>
        <button
          onClick={handleRedirect}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-lg shadow-primary/20"
        >
          Sign In Again
        </button>
      </div>
    </div>
  );
}
