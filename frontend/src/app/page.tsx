"use client";

import React from "react";
import { ProtectedRoute } from "@/features/auth/guards/RouteGuard";
import StatsWidget from "@/features/dashboard/components/StatsWidget";
import HealthWidget from "@/features/dashboard/components/HealthWidget";
import RecentUploadsWidget from "@/features/dashboard/components/RecentUploadsWidget";
import RecentConversationsWidget from "@/features/dashboard/components/RecentConversationsWidget";
import ActivityTimeline from "@/features/dashboard/components/ActivityTimeline";
import QuickActions from "@/features/dashboard/components/QuickActions";
import AnalyticsCharts from "@/features/dashboard/components/AnalyticsCharts";
import { useAuthStore } from "@/core/store/authStore";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = user?.name || user?.email?.split("@")[0] || "there";

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, <span className="gradient-text">{name}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your documents at a glance.
          </p>
        </div>

        {/* Row 1 — KPI stats */}
        <StatsWidget />

        {/* Row 2 — Quick actions */}
        <QuickActions />

        {/* Row 3 — Health + Charts */}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <HealthWidget />
          </div>
          <div className="lg:col-span-3">
            <AnalyticsCharts />
          </div>
        </div>

        {/* Row 4 — Tables + Timeline */}
        <div className="grid gap-6 lg:grid-cols-3">
          <RecentUploadsWidget />
          <RecentConversationsWidget />
          <ActivityTimeline />
        </div>

      </div>
    </ProtectedRoute>
  );
}
