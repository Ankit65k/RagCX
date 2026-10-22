"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

// --- Global Modal Context definition ---
interface ModalContextType {
  isOpen: boolean;
  title: string;
  content: ReactNode | null;
  openModal: (title: string, content: ReactNode) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};

// Instantiate QueryClient with robust default caching and retry policies
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Do not retry on 401/403/404 responses
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes stale time
    },
  },
});

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    content: ReactNode | null;
  }>({
    isOpen: false,
    title: "",
    content: null,
  });

  const openModal = (title: string, content: ReactNode) => {
    setModalState({ isOpen: true, title, content });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
        <ModalContext.Provider
          value={{
            isOpen: modalState.isOpen,
            title: modalState.title,
            content: modalState.content,
            openModal,
            closeModal,
          }}
        >
          {children}
          
          {/* Sonner Toast Provider */}
          <Toaster position="top-right" richColors theme="dark" />
          
          {/* Simple reusable global modal container */}
          {modalState.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
              <div className="w-full max-w-lg rounded-lg bg-surface-1 border border-hairline p-7 shadow-premium animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-3 mb-4">
                  <h3 className="text-lg font-semibold text-foreground tracking-tight">{modalState.title}</h3>
                  <button
                    onClick={closeModal}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                  >
                    ✕
                  </button>
                </div>
                <div className="text-sm text-foreground/90 mb-6 leading-relaxed">{modalState.content}</div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    className="rounded-xl px-5 py-2.5 bg-secondary text-foreground hover:bg-secondary/80 hover:shadow-md hover:shadow-black/20 transition-all text-sm font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </ModalContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
