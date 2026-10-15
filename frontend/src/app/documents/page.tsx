"use client";

import React, { useState } from "react";
import { ProtectedRoute } from "@/features/auth/guards/RouteGuard";
import FilterBar from "@/features/documents/components/FilterBar";
import DocumentTable from "@/features/documents/components/DocumentTable";
import DocumentDrawer from "@/features/documents/components/DocumentDrawer";
import BulkActions from "@/features/documents/components/BulkActions";
import { useDocumentsQuery, useDocumentMutations } from "@/features/documents/hooks/useDocuments";
import { useAuthStore } from "@/core/store/authStore";
import { DocumentItem } from "@/features/documents/api/documentsApi";
import { FolderGit2, Plus, ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function DocumentsWorkspacePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  // State parameters for pagination, sorting, search, filtering
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("uploadedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drawerDoc, setDrawerDoc] = useState<DocumentItem | null>(null);

  // TanStack Queries & Mutations
  const { data: documentResponse, isLoading, isError } = useDocumentsQuery({
    page,
    pageSize,
    search,
    status,
    sortBy,
    sortOrder,
  });

  const { deleteDoc, reprocessDoc, restoreDoc } = useDocumentMutations();

  // Selection Action handlers
  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && documentResponse?.items) {
      setSelectedIds(documentResponse.items.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // Bulk Actions triggers
  const handleBulkDelete = () => {
    selectedIds.forEach((id) => deleteDoc(id));
    toast.success(`Bulk Delete Triggered`, {
      description: `Dispatched soft-delete requests for ${selectedIds.length} documents.`,
    });
    setSelectedIds([]);
  };

  const handleBulkReprocess = () => {
    selectedIds.forEach((id) => reprocessDoc(id));
    toast.success(`Bulk Reprocess Triggered`, {
      description: `Dispatched reprocessing requests for ${selectedIds.length} documents.`,
    });
    setSelectedIds([]);
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-300 pb-16">
        
        {/* Title Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FolderGit2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Documents
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Search and manage your PDFs.
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => router.push("/documents/upload")}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Upload PDF
            </button>
          )}
        </div>

        {/* 1. Filter, Search, Sort Bar */}
        <FilterBar
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          onStatusChange={(val) => {
            setStatus(val);
            setPage(1);
          }}
          onReset={() => {
            setSearch("");
            setStatus("");
            setPage(1);
          }}
        />

        {/* 2. Document Data Grid */}
        {isLoading ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center animate-pulse space-y-4">
            <div className="h-6 w-1/4 bg-muted rounded mx-auto"></div>
            <div className="space-y-2">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="h-10 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        ) : isError || !documentResponse ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center text-sm text-destructive">
            Failed to load documents catalog.
          </div>
        ) : (
          <div className="space-y-4">
            <DocumentTable
              documents={documentResponse.items}
              selectedIds={selectedIds}
              onSelectRow={handleSelectRow}
              onSelectAll={handleSelectAll}
              onViewDetails={setDrawerDoc}
              onReprocess={reprocessDoc}
              onDelete={deleteDoc}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              isAdmin={isAdmin}
            />

            {/* Pagination Controls */}
            <div className="flex items-center justify-between py-2 text-xs">
              <span className="text-muted-foreground font-medium">
                Showing {documentResponse.items.length} of {documentResponse.total} items
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-secondary px-3 py-1.5 font-semibold text-foreground transition-all disabled:opacity-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <span className="font-bold text-foreground px-1">Page {page}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * pageSize >= documentResponse.total}
                  className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-secondary px-3 py-1.5 font-semibold text-foreground transition-all disabled:opacity-50"
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Floating Bulk Operations Bar */}
        {isAdmin && (
          <BulkActions
            selectedIds={selectedIds}
            onClearSelection={() => setSelectedIds([])}
            onBulkDelete={handleBulkDelete}
            onBulkReprocess={handleBulkReprocess}
          />
        )}

        {/* 4. Details Info Drawer overlay */}
        <DocumentDrawer
          document={drawerDoc}
          isOpen={!!drawerDoc}
          onClose={() => setDrawerDoc(null)}
        />

      </div>
    </ProtectedRoute>
  );
}
