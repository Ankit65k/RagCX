"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboardApi";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: dashboardApi.getStats,
    refetchInterval: 15000, // auto refresh stats every 15 seconds
  });
}

export function useHealthStatus() {
  return useQuery({
    queryKey: ["dashboard", "health"],
    queryFn: dashboardApi.getHealth,
    refetchInterval: 10000, // health check polling every 10 seconds
  });
}

export function useRecentUploads() {
  return useQuery({
    queryKey: ["dashboard", "uploads"],
    queryFn: dashboardApi.getRecentUploads,
    staleTime: 1000 * 30, // 30 seconds stale
  });
}

export function useRecentConversations() {
  return useQuery({
    queryKey: ["dashboard", "conversations"],
    queryFn: dashboardApi.getRecentConversations,
    staleTime: 1000 * 30,
  });
}

export function useActivityTimeline() {
  return useQuery({
    queryKey: ["dashboard", "timeline"],
    queryFn: dashboardApi.getActivityTimeline,
    staleTime: 1000 * 45,
  });
}
