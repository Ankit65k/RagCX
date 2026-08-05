"use client";

import React from "react";
import { MessageSquare, UploadCloud, FileText, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

const actions = [
  {
    label: "New Chat",
    desc: "Start an AI conversation",
    icon: MessageSquare,
    path: "/chat",
    gradient: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/30",
  },
  {
    label: "Upload PDF",
    desc: "Ingest a document",
    icon: UploadCloud,
    path: "/documents/upload",
    gradient: "from-blue-500 to-cyan-600",
    glow: "shadow-blue-500/30",
  },
  {
    label: "My Library",
    desc: "Manage documents",
    icon: FileText,
    path: "/documents",
    gradient: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/30",
  },
  {
    label: "Settings",
    desc: "Configure the system",
    icon: Settings,
    path: "/settings",
    gradient: "from-slate-500 to-gray-600",
    glow: "shadow-slate-500/30",
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
            className="group card-glow relative overflow-hidden flex items-center gap-4 rounded-2xl glass px-5 py-4.5 text-left"
          >
            {/* Icon with gradient */}
            <div
              className={`flex h-10 w-10 shrink-0 items-center  justify-center rounded-xl bg-gradient-to-br ${act.gradient} shadow-lg ${act.glow} transition-transform group-hover:scale-105`}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 p-4">
              <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors duration-150 truncate">{act.label}</p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">{act.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
