"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, RefreshCw } from "lucide-react";

interface FilterBarProps {
  onSearchChange: (search: string) => void;
  onStatusChange: (status: string) => void;
  onReset: () => void;
}

export default function FilterBar({ onSearchChange, onStatusChange, onReset }: FilterBarProps) {
  const [searchInput, setSearchInput] = useState("");

  // Debounced Search Handler
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearchChange(searchInput);
    }, 400); // 400ms debounce interval

    return () => clearTimeout(handler);
  }, [searchInput, onSearchChange]);

  const handleReset = () => {
    setSearchInput("");
    onReset();
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between rounded-lg border border-hairline bg-surface-1 p-4">
      {/* Search Input */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search document filenames..."
          className="w-full rounded-md border border-hairline bg-surface-2 pl-10 pr-4 py-2.5 text-xs text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      {/* Filter Options & Clear Buttons */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <div className="flex items-center gap-1.5 text-xs text-ink-subtle">
          <Filter className="h-4 w-4" />
          <span>Status:</span>
        </div>

        <select
          onChange={(e) => onStatusChange(e.target.value)}
          className="rounded-md border border-hairline bg-surface-2 px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        >
          <option value="">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="PROCESSING">Processing</option>
          <option value="FAILED">Failed</option>
          <option value="DELETED">Deleted</option>
        </select>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-md border border-hairline hover:bg-surface-2 px-3.5 py-2 text-xs font-medium text-ink transition-all shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>
    </div>
  );
}
