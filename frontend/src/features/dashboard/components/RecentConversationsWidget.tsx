"use client";

import React from "react";
import { useRecentConversations } from "../hooks/useDashboard";
import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RecentConversationsWidget() {
  const { data: conversations, isLoading, isError } = useRecentConversations();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-6 animate-pulse space-y-3 h-full">
        <div className="h-4 w-44 bg-muted rounded" />
        {[...Array(4)].map((_, i) => <div key={i} className="h-11 bg-muted rounded-xl" />)}
      </div>
    );
  }

  if (isError || !conversations) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive text-center h-full flex items-center justify-center">
        Failed to load conversations.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl glass p-6 h-full">
      <div>
        <h3 className="text-sm font-bold text-foreground tracking-tight">Recent Chats</h3>
        <p className="text-xs text-muted-foreground/80 mt-0.5">Your latest AI conversations</p>
      </div>

      <div className="flex flex-col gap-2">
        {conversations.length === 0 && (
          <p className="text-sm text-muted-foreground/80 text-center py-6">No conversations yet.</p>
        )}
        {conversations.map((chat) => (
          <button
            key={chat.id}
            onClick={() => router.push("/chat")}
            className="flex items-center gap-3 rounded-xl bg-secondary/25 px-3 py-2.5 text-left hover:bg-secondary/55 hover:shadow-sm hover:shadow-black/10 transition-all group"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{chat.title}</p>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                {new Date(chat.lastUpdated).toLocaleDateString(undefined, {
                  month: "short", day: "numeric",
                })}
              </p>
            </div>
            <span className="shrink-0 rounded-lg bg-secondary/50 px-2 py-0.5 text-[10px] font-bold text-primary">
              {chat.messageCount}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
