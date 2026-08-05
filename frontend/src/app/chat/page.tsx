"use client";

import React from "react";
import { ProtectedRoute } from "@/features/auth/guards/RouteGuard";
import ConversationSidebar from "@/features/chat/components/ConversationSidebar";
import { MessageSquare, Sparkles } from "lucide-react";

export default function ChatLandingPage() {
  return (
    <ProtectedRoute>
      <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-border bg-card overflow-hidden">
        {/* Sidebar */}
        <ConversationSidebar />

        {/* Empty state details dashboard */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-secondary/5">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
            <MessageSquare className="h-8 w-8" />
          </div>
          
          <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
            AI Grounded Assistant <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" />
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mb-6">
            Select an existing conversation thread from the sidebar or click "New Conversation" to start prompting over your document library index.
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
