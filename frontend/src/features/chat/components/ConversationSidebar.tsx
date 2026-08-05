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
    <aside className="w-80 border-r border-border bg-card/45 backdrop-blur-md flex flex-col h-full shrink-0">
      
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border space-y-3">
        <button
          onClick={handleCreate}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </button>
        
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search threads..."
            className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">
            Loading conversations...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No conversations found.
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.sessionId === activeSessionId;
            return (
              <div
                key={session.sessionId}
                onClick={() => router.push(`/chat/${session.sessionId}`)}
                className={`group flex items-center justify-between rounded-xl p-3 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/15"
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <div className="overflow-hidden text-left">
                    <p className="truncate font-medium">{session.title}</p>
                    <p className={`text-[9px] mt-0.5 flex items-center gap-1 ${isActive ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
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
                  className={`rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive shrink-0 transition-opacity ${
                    isActive ? "group-hover:text-primary-foreground hover:bg-primary-foreground/10" : ""
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
