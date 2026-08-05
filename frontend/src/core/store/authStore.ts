import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER" | "MANAGER";
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;
  setAuth: (user: UserProfile, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set((state) => {
          const finalUser = user || state.user;
          console.log("[DEBUG] TOKEN STORED");
          console.log("[DEBUG] AUTH STATE", {
            isAuthenticated: true,
            hasUser: !!finalUser,
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
          });
          return {
            user: finalUser,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          };
        }),
      clearAuth: () =>
        set(() => {
          console.log("[DEBUG] AUTH STATE", {
            isAuthenticated: false,
            hasUser: false,
            hasAccessToken: false,
            hasRefreshToken: false,
          });
          return {
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          };
        }),
      setLoading: (isLoading) => set({ isLoading }),
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
    }),
    {
      name: "ragcx-auth",
      storage: createJSONStorage(() => localStorage),
      // Only persist the auth data – not transient UI state
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      // Signal when rehydration from localStorage is complete
      onRehydrateStorage: () => (state) => {
        console.log("[DEBUG] TOKEN RESTORED");
        state?.setHasHydrated(true);
        console.log("[DEBUG] AUTH STATE", {
          isAuthenticated: state?.isAuthenticated || false,
          hasUser: !!state?.user,
          hasAccessToken: !!state?.accessToken,
          hasRefreshToken: !!state?.refreshToken,
        });
      },
    }
  )
);
