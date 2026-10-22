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
      <div className="bg-surface-1 border border-hairline rounded-lg p-4 animate-pulse space-y-3 h-full">
        <div className="h-4 w-44 bg-surface-2 rounded" />
        {[...Array(4)].map((_, i) => <div key={i} className="h-11 bg-surface-2 rounded" />)}
      </div>
    );
  }

  if (isError || !conversations) {
    return (
      <div className="rounded-lg border border-hairline bg-surface-1 p-4 text-xs text-ink-subtle text-center h-full flex items-center justify-center">
        Failed to load conversations.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 bg-surface-1 border border-hairline rounded-lg p-4 h-full">
      <div>
        <h3 className="text-sm font-semibold text-ink tracking-tight">Recent Chats</h3>
        <p className="text-xs text-ink-subtle mt-0.5">Your latest AI conversations</p>
      </div>

      <div className="flex flex-col divide-y divide-hairline">
        {conversations.length === 0 && (
          <p className="text-xs text-ink-subtle text-center py-4">No conversations yet.</p>
        )}
        {conversations.map((chat) => (
          <button
            key={chat.id}
            onClick={() => router.push("/chat")}
            className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 text-left hover:bg-surface-2 px-2 -mx-2 rounded transition-colors"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2">
              <MessageSquare className="h-4 w-4 text-ink-subtle" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink truncate">{chat.title}</p>
              <p className="text-xs text-ink-subtle mt-0.5">
                {new Date(chat.lastUpdated).toLocaleDateString(undefined, {
                  month: "short", day: "numeric",
                })}
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-muted">
              {chat.messageCount}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
