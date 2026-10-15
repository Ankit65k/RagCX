import React from "react";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";
import AppProviders from "@/providers/AppProviders";
import AuthProvider from "@/features/auth/providers/AuthProvider";
import SidebarLayout from "@/components/SidebarLayout";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RagCX — AI Document Intelligence",
  description: "RAG platform for document Q&A and semantic search.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={plusJakarta.variable}>
      <body suppressHydrationWarning className="min-h-screen bg-background font-sans antialiased gradient-animate">
        <AppProviders>
          <AuthProvider>
            <SidebarLayout>{children}</SidebarLayout>
          </AuthProvider>
        </AppProviders>
      </body>
    </html>
  );
}
