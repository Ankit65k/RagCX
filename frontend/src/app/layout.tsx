import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import AppProviders from "@/providers/AppProviders";
import AuthProvider from "@/features/auth/providers/AuthProvider";
import SidebarLayout from "@/components/SidebarLayout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body suppressHydrationWarning className="min-h-screen bg-background font-sans antialiased">
        <AppProviders>
          <AuthProvider>
            <SidebarLayout>{children}</SidebarLayout>
          </AuthProvider>
        </AppProviders>
      </body>
    </html>
  );
}
