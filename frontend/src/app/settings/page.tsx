"use client";

import React, { useState } from "react";
import { ProtectedRoute } from "@/features/auth/guards/RouteGuard";
import GeneralSettingsForm from "@/features/settings/components/GeneralSettingsForm";
import AiSettingsForm from "@/features/settings/components/AiSettingsForm";
import RetrievalSettingsForm from "@/features/settings/components/RetrievalSettingsForm";
import DocumentSettingsForm from "@/features/settings/components/DocumentSettingsForm";
import PreferencesForm from "@/features/settings/components/PreferencesForm";
import { useSettingsQuery, useUpdateSettings } from "@/features/settings/hooks/useSettings";
import { useAuthStore } from "@/core/store/authStore";
import { SystemSettings } from "@/features/settings/types";
import { Settings, Cpu, Compass, FileUp, Sliders, LayoutDashboard } from "lucide-react";

type SettingsSection = "general" | "ai" | "retrieval" | "documentProcessing" | "preferences";

export default function SettingsWorkspacePage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  const [activeSection, setActiveSection] = useState<SettingsSection>("general");

  const { data: settings, isLoading, isError } = useSettingsQuery();
  const { updateSettings } = useUpdateSettings();

  const handleSave = (section: SettingsSection, data: any) => {
    if (!settings) return;
    
    const updated: SystemSettings = {
      ...settings,
      [section]: data,
    };
    updateSettings(updated);
  };

  const navItems = [
    { id: "general", label: "General", icon: Settings },
    { id: "ai", label: "AI Configuration", icon: Cpu },
    { id: "retrieval", label: "Retrieval Thresholds", icon: Compass },
    { id: "documentProcessing", label: "Document Processing", icon: FileUp },
    { id: "preferences", label: "Preferences", icon: Sliders },
  ];

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-300 pb-16">
        {/* Title Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">
              Settings
            </h1>
            <p className="text-sm text-ink-subtle mt-0.5">
              Application preferences.
            </p>
          </div>
        </div>

        {/* Settings Navigation Layout Grid */}
        <div className="grid gap-6 md:grid-cols-4 items-start">

          {/* Navigation Sidebar Panel (Column 1) */}
          <div className="md:col-span-1 rounded-lg border border-hairline bg-surface-1 p-2.5 space-y-1">
            <div className="px-3 py-2 text-xs font-medium text-ink-subtle">
              Sections
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as SettingsSection)}
                  className={`w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-ink-subtle hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form Content Panel (Column 2) */}
          <div className="md:col-span-3 rounded-lg border border-hairline bg-surface-1 p-6 min-h-[300px]">
            {isLoading ? (
              <div className="h-48 flex items-center justify-center text-xs text-ink-subtle animate-pulse">
                Loading configuration data...
              </div>
            ) : isError || !settings ? (
              <div className="h-48 flex items-center justify-center text-sm text-destructive bg-surface-2 border border-hairline rounded-lg">
                Failed to retrieve cluster configuration.
              </div>
            ) : (
              <div className="animate-in fade-in duration-200">
                {activeSection === "general" && (
                  <GeneralSettingsForm
                    initialValues={settings.general}
                    onSubmit={(data) => handleSave("general", data)}
                  />
                )}

                {activeSection === "ai" && (
                  <AiSettingsForm
                    initialValues={settings.ai}
                    onSubmit={(data) => handleSave("ai", data)}
                    isAdmin={isAdmin}
                  />
                )}

                {activeSection === "retrieval" && (
                  <RetrievalSettingsForm
                    initialValues={settings.retrieval}
                    onSubmit={(data) => handleSave("retrieval", data)}
                    isAdmin={isAdmin}
                  />
                )}

                {activeSection === "documentProcessing" && (
                  <DocumentSettingsForm
                    initialValues={settings.documentProcessing}
                    onSubmit={(data) => handleSave("documentProcessing", data)}
                    isAdmin={isAdmin}
                  />
                )}

                {activeSection === "preferences" && (
                  <PreferencesForm
                    initialValues={settings.preferences}
                    onSubmit={(data) => handleSave("preferences", data)}
                  />
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
