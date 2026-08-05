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
      <div className="rounded-2xl glass p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>Document Ingestion Trend</span>
          </div>
          <p className="text-[10px] text-muted-foreground/80">Monthly count of processed chunks ingested</p>
        </div>
 
        {/* Custom SVG Area Visualization */}
        <div className="h-32 w-full mt-6 relative">
          <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <polyline fill="url(#areaGrad)" points={areaPoints} />
            <polyline fill="none" stroke="rgb(59, 130, 246)" strokeWidth="2.5" points={areaStrokePoints} />
          </svg>
          
          {/* Legend Coordinates */}
          <div className="absolute inset-0 flex justify-between pointer-events-none text-[8px] text-muted-foreground/60 select-none">
            <div className="flex flex-col justify-between h-full border-r border-dashed pr-1">
              <span>100</span>
              <span>50</span>
              <span>0</span>
            </div>
            <div className="flex-1"></div>
          </div>
        </div>
 
        {/* X-Axis labels */}
        <div className="flex justify-between text-[9px] text-muted-foreground font-semibold px-2 mt-2">
          <span>Jan</span>
          <span>Feb</span>
          <span>Mar</span>
          <span>Apr</span>
          <span>May</span>
          <span>Jun</span>
        </div>
      </div>
 
      {/* 2. Conversation Trends (SVG Bar Chart) */}
      <div className="rounded-2xl glass p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm mb-1">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span>Conversational Activity Volume</span>
          </div>
          <p className="text-[10px] text-muted-foreground/80">Total messages answered by model instance</p>
        </div>

        {/* Custom SVG Bar Chart */}
        <div className="h-32 w-full mt-6 flex items-end justify-between px-2 gap-4">
          {barData.map((val, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
              {/* Dynamic animated bar with premium gradient fill */}
              <div
                className="w-full rounded-t bg-gradient-to-t from-primary/80 to-primary shadow-lg shadow-primary/10 group-hover:scale-y-105 transition-all origin-bottom"
                style={{ height: `${val}px` }}
              ></div>
              <span className="text-[9px] text-muted-foreground font-semibold">{barLabels[idx]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
