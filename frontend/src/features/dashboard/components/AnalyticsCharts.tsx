"use client";

import React from "react";
import { Sparkles, TrendingUp } from "lucide-react";

export default function AnalyticsCharts() {
  // SVG Area Chart points (Normalized 0-100 coordinates for scalability)
  // Maps 6 months: Jan (20), Feb (45), Mar (30), Apr (80), May (65), Jun (95)
  const areaPoints = "0,80 20,65 40,75 60,35 80,45 100,10 100,100 0,100";
  const areaStrokePoints = "0,80 20,65 40,75 60,35 80,45 100,10";

  // SVG Bar Chart heights (0-80 scale)
  const barData = [35, 55, 42, 70, 58, 80];
  const barLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {/* 1. Document Ingestion Trend (SVG Area Chart) */}
      <div className="bg-surface-1 border border-hairline rounded-lg p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-ink font-medium text-sm mb-1">
            <TrendingUp className="h-4 w-4 text-ink-subtle" />
            <span>Document Ingestion Trend</span>
          </div>
          <p className="text-xs text-ink-subtle">Monthly count of processed chunks ingested</p>
        </div>

        {/* Custom SVG Area Visualization */}
        <div className="h-32 w-full mt-6 relative">
          <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline
              fill="hsl(var(--primary) / 0.15)"
              points={areaPoints}
            />
            <polyline
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              points={areaStrokePoints}
            />
          </svg>

          {/* Y-Axis labels */}
          <div className="absolute inset-0 flex justify-between pointer-events-none text-xs select-none" style={{ color: "hsl(var(--ink-subtle))" }}>
            <div className="flex flex-col justify-between h-full pr-1.5">
              <span>100</span>
              <span>50</span>
              <span>0</span>
            </div>
            <div className="flex-1"></div>
          </div>
        </div>

        {/* X-Axis labels */}
        <div className="flex justify-between text-xs text-ink-subtle font-medium px-2 mt-2">
          <span>Jan</span>
          <span>Feb</span>
          <span>Mar</span>
          <span>Apr</span>
          <span>May</span>
          <span>Jun</span>
        </div>
      </div>

      {/* 2. Conversation Trends (SVG Bar Chart) */}
      <div className="bg-surface-1 border border-hairline rounded-lg p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-ink font-medium text-sm mb-1">
            <Sparkles className="h-4 w-4 text-ink-subtle" />
            <span>Conversational Activity Volume</span>
          </div>
          <p className="text-xs text-ink-subtle">Total messages answered by model instance</p>
        </div>

        {/* Custom SVG Bar Chart */}
        <div className="h-32 w-full mt-6 flex items-end justify-between px-2 gap-4">
          {barData.map((val, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full rounded-t-sm transition-all origin-bottom hover:opacity-80"
                style={{
                  height: `${val}px`,
                  backgroundColor: "hsl(var(--primary))"
                }}
              ></div>
              <span className="text-xs text-ink-subtle font-medium">{barLabels[idx]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
