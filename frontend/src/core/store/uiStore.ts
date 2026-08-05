import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  activeChatSessionId: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveChatSessionId: (sessionId: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeChatSessionId: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveChatSessionId: (sessionId) => set({ activeChatSessionId: sessionId }),
}));
