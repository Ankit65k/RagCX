"use client";

import React, { useState } from "react";
import { useChatSessions } from "../hooks/useChat";
import { MessageSquare, Plus, Trash2, Search, Calendar } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function ConversationSidebar() {
  const router = useRouter();
  const params = useParams();
  const activeSessionId = params?.conversationId as string;

  const { sessions, createSession, deleteSession, isLoading } = useChatSessions();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    createSession(`Session ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`);
  };

  return (
    <aside className="w-80 border-r border-hairline bg-surface-1 flex flex-col h-full shrink-0">

      {/* Sidebar Header */}
      <div className="p-4 border-b border-hairline space-y-3">
        <button
          onClick={handleCreate}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </button>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-subtle" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search threads..."
            className="w-full rounded-md border border-hairline bg-surface-2 pl-9 pr-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-ink-subtle animate-pulse">
            Loading conversations...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-ink-subtle">
            No conversations found.
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.sessionId === activeSessionId;
            return (
              <div
                key={session.sessionId}
                onClick={() => router.push(`/chat/${session.sessionId}`)}
                className={`group flex items-center justify-between rounded-md p-3 text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-surface-3 text-ink border-l-2 border-primary"
                    : "text-ink hover:bg-surface-2"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <MessageSquare className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-ink-subtle"}`} />
                  <div className="overflow-hidden text-left">
                    <p className="truncate font-medium">{session.title}</p>
                    <p className={`text-xs mt-0.5 flex items-center gap-1 ${isActive ? "text-ink-subtle" : "text-ink-subtle"}`}>
                      <Calendar className="h-2.5 w-2.5" />
                      {new Date(session.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.sessionId);
                  }}
                  className={`rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-opacity shrink-0 ${
                    isActive ? "group-hover:text-primary hover:bg-primary/10" : "group-hover:text-ink"
                  }`}
                  title="Delete Conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}