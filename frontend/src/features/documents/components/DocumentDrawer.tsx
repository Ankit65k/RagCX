"use client";

import React from "react";
import { DocumentItem } from "../api/documentsApi";
import { X, Calendar, FileText, User, ShieldCheck, Database, HelpCircle } from "lucide-react";

import SuggestedQuestionsList from "@/features/suggested-questions/components/SuggestedQuestionsList";

interface DocumentDrawerProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentDrawer({ document, isOpen, onClose }: DocumentDrawerProps) {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="w-full max-w-lg bg-card border-l border-border h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 id="drawer-title" className="text-sm font-bold text-foreground truncate max-w-[280px]">
                {document.filename}
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">ID: {document.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Close Drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body segments */}
        <div className="flex-1 space-y-6">
          {/* Metadata Block */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Document Metadata</h3>
            
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Uploader
                </span>
                <span className="font-semibold text-foreground">{document.uploadedBy || "Unknown"}</span>
              </div>
              
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Upload Time
                </span>
                <span className="font-semibold text-foreground">
                  {new Date(document.uploadedAt).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5" /> File Size
                </span>
                <span className="font-semibold text-foreground">
                  {document.fileSize ? `${Math.round(document.fileSize / 1024)} KB` : "N/A"}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> SHA256 Checksum
                </span>
                <span className="font-mono text-[10px] text-foreground truncate max-w-[200px]" title={document.checksum}>
                  {document.checksum || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Chroma Ingestion Stats */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vector Database Ingestion</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-secondary/15 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Pages</p>
                <p className="text-sm font-bold text-foreground mt-1">{document.pageCount || 0}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/15 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Chunks</p>
                <p className="text-sm font-bold text-foreground mt-1">{document.chunkCount || 0}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/15 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Embeddings</p>
                <p className="text-sm font-bold text-foreground mt-1">{document.embeddingCount || 0}</p>
              </div>
            </div>
          </div>

          {/* Processing Timeline */}
          {document.processingTimeline && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Processing Timeline</h3>
              <div className="relative border-l border-border pl-4 space-y-4">
                {document.processingTimeline.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary ring-4 ring-background"></div>
                    <p className="text-xs font-semibold text-foreground">{item.event}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Questions */}
          <div className="pt-4 border-t border-border/50">
            <SuggestedQuestionsList
              documentId={document.id}
              onQuestionClick={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
