"use client";

import React from "react";
import { MessageSquare, UploadCloud, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

const actions = [
  {
    label: "New Chat",
    desc: "Start an AI conversation",
    icon: MessageSquare,
    path: "/chat",
    isPrimary: true,
  },
  {
    label: "Upload PDF",
    desc: "Ingest a document",
    icon: UploadCloud,
    path: "/documents/upload",
    isPrimary: false,
  },
  {
    label: "My Library",
    desc: "Manage documents",
    icon: FileText,
    path: "/documents",
    isPrimary: false,
  },
];

export default function QuickActions() {
  const router = useRouter();

  return (
    <div className="grid gap-4 sm:grid-cols-4">
      {actions.map((act) => {
        const Icon = act.icon;
        return (
          <button
            key={act.path}
            onClick={() => router.push(act.path)}
            className="group flex items-center gap-3.5 bg-surface-1 border border-hairline rounded-lg px-4 py-3.5 text-left transition-colors hover:bg-surface-2 hover:border-hairline-strong"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                act.isPrimary
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-2 text-ink-subtle"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate transition-colors">
                {act.label}
              </p>
              <p className="text-xs text-ink-subtle truncate">{act.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}