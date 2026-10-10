"use client";

import React, { useRef, useEffect, useState } from "react";
import { ProtectedRoute } from "@/features/auth/guards/RouteGuard";
import ConversationSidebar from "@/features/chat/components/ConversationSidebar";
import MessageBubble from "@/features/chat/components/MessageBubble";
import MessageComposer from "@/features/chat/components/MessageComposer";
import DocumentSelector from "@/features/chat/components/DocumentSelector";
import { useChatRoom } from "@/features/chat/hooks/useChat";
import { ChatMessage } from "@/features/chat/api/chatApi";
import { useDocumentsQuery } from "@/features/documents/hooks/useDocuments";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, FileText, Compass, AlertTriangle, ShieldCheck } from "lucide-react";

export default function ChatRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params?.conversationId as string;
  const documentIdFromQuery = searchParams?.get("documentId");
  const questionFromQuery = searchParams?.get("question");

  const { messages, isLoading, sendMessage, isSending, isTyping, selectedDocumentIds, setSelectedDocumentIds } = useChatRoom(sessionId);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch user documents for document selector
  const { data: documentsResponse, isLoading: isLoadingDocuments } = useDocumentsQuery({
    page: 1,
    pageSize: 100,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const documents = documentsResponse?.items || [];
  
  // Track currently active highlighted assistant message for the right panel
  const [activeMessage, setActiveMessage] = useState<ChatMessage | null>(null);

  // Pre-select document from query parameter on initial load
  useEffect(() => {
    if (documentIdFromQuery && selectedDocumentIds.length === 0) {
      setSelectedDocumentIds([documentIdFromQuery]);
    }
  }, [documentIdFromQuery]);

  // Auto-send question from query parameter if session is new and has no messages
  useEffect(() => {
    if (sessionId === "new" && questionFromQuery && messages.length === 0 && selectedDocumentIds.length > 0) {
      // Use setTimeout to ensure everything is loaded before sending
      const timer = setTimeout(() => {
        sendMessage(questionFromQuery);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [sessionId, questionFromQuery, messages.length, selectedDocumentIds]);

  // Sync active message to be the last assistant response automatically
  useEffect(() => {
    const assistantMsgs = messages.filter((m) => m.role === "ASSISTANT");
    if (assistantMsgs.length > 0) {
      setActiveMessage(assistantMsgs[assistantMsgs.length - 1]);
    } else {
      setActiveMessage(null);
    }
  }, [messages]);

  // Auto-scroll to the bottom of the list when new messages or typing indicators arrive
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  return (
    <ProtectedRoute>
      <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-border bg-card overflow-hidden">
        {/* Column 1: Conversations List */}
        <ConversationSidebar />

        {/* Column 2: Message Flow & Composer */}
        <div className="flex-1 flex flex-col h-full bg-secondary/5 border-r border-border">
          {/* Document Selector Header */}
          <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
            <DocumentSelector
              documents={documents}
              selectedIds={selectedDocumentIds}
              onSelectionChange={setSelectedDocumentIds}
            />
          </div>

          {/* Scrollable Message stream */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto divide-y divide-border/25">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                Loading messages thread...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">Active conversation started.</p>
                <p>Submit a question in the composer below to query the documents repository.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => msg.role === "ASSISTANT" && setActiveMessage(msg)}
                  className={`cursor-pointer transition-all ${
                    activeMessage?.id === msg.id ? "ring-2 ring-primary/20 bg-primary/5" : ""
                  }`}
                >
                  <MessageBubble
                    message={msg}
                    onFollowUpClick={sendMessage}
                  />
                </div>
              ))
            )}

            {/* Ingestion typing indicator */}
            {isTyping && (
              <div className="flex gap-4 p-5 bg-secondary/25 border-y border-border/40 animate-pulse">
                <div className="h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="flex-1 space-y-2 py-1">
                  <p className="text-[10px] text-muted-foreground font-semibold">AI Ingestion Assistant is thinking...</p>
                  <div className="h-3 w-3/4 bg-muted rounded"></div>
                  <div className="h-3 w-1/2 bg-muted rounded"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input composer footer */}
          <MessageComposer onSend={sendMessage} disabled={isSending} />
        </div>

        {/* Column 3: Grounding & Sources Details Panel */}
        <aside className="w-80 bg-card/45 backdrop-blur-md flex flex-col h-full overflow-y-auto p-5 shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            RAG Grounding & Sources
          </h3>

          {!activeMessage ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-xs text-muted-foreground space-y-3">
              <Compass className="h-8 w-8 text-muted-foreground/60 animate-pulse" />
              <p className="font-medium text-foreground">No sources loaded</p>
              <p className="leading-relaxed">
                 Citing references, matching similarity scores, and LLM confidence stats will populate here when responses are generated.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Confidence Rating Block */}
              {activeMessage.confidence && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    Grounding Confidence
                  </p>
                  <div className="rounded-xl border border-border bg-secondary/20 p-3.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${
                        activeMessage.confidence === "HIGH"
                          ? "bg-emerald-500"
                          : activeMessage.confidence === "MEDIUM"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      } animate-pulse`}></span>
                      <span className="text-xs font-bold text-foreground capitalize">
                        {activeMessage.confidence} Rating
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {activeMessage.confidence === "HIGH"
                        ? "Answers are heavily backed by strong page-level matches inside ChromaDB. High factual accuracy."
                        : "Low similarity score detected. The answer might contain extrapolations."}
                    </p>
                  </div>
                </div>
              )}

              {/* Citations Grid list */}
              {activeMessage.citations && activeMessage.citations.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    Retrieved Documents ({activeMessage.citations.length})
                  </p>
                  
                  <div className="space-y-2.5">
                    {activeMessage.citations.map((cite, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-border bg-secondary/15 p-3 flex flex-col gap-2 hover:border-primary/20 transition-all"
                      >
                        <div className="flex items-start gap-2.5">
                          <FileText className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                          <div className="overflow-hidden">
                            <p className="text-xs font-semibold text-foreground truncate" title={cite.documentId}>
                              {cite.documentId}
                            </p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              Segment ID: {cite.chunkId}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[9px] font-bold">
                          <span className="text-muted-foreground">Page Number: {cite.page}</span>
                          {cite.similarity && (
                            <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                              {Math.round(cite.similarity * 100)}% Similarity
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </ProtectedRoute>
  );
}
