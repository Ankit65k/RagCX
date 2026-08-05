"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/core/store/authStore";
import { authApi } from "../api/authApi";
import { toast } from "sonner";

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setAuth, clearAuth } = useAuthStore();

  // 1. Login Mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      console.log("[DEBUG] LOGIN SUCCESS");
      console.log("[DEBUG] TOKEN RECEIVED");
      console.log("[DEBUG] CURRENT USER LOADED");
      
      // zustand/persist automatically syncs to localStorage when setAuth is called
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);

      toast.success("Login Successful", {
        description: `Welcome back, ${data.user.name || data.user.email}!`,
      });

      console.log("[AuthHook]: Login successful. Redirecting to dashboard.");
      router.push("/");
    },
    onError: (error: any) => {
      console.log("[DEBUG] CURRENT USER FAILED");
      const errMsg = error?.response?.data?.message || "Invalid credentials provided.";
      toast.error("Login Failed", { description: errMsg });
      console.warn("[AuthHook]: Login request failed:", errMsg);
    },
  });

  // 2. Logout Mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      // clearAuth() triggers zustand/persist which wipes the localStorage entry
      clearAuth();

      // Reset query cache
      queryClient.clear();

      toast.info("Logged Out", {
        description: "Your session has been terminated securely.",
      });

      console.log("[AuthHook]: Terminated session. Redirecting to /login.");
      router.push("/login");
    },
  });

  // 3. Register Mutation
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (user) => {
      toast.success("Registration Successful", {
        description: `Your account (${user.email}) has been created. Please sign in.`,
      });
      router.push("/login");
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.message || "Registration failed. Please try again.";
      toast.error("Registration Failed", { description: errMsg });
    },
  });

  return {
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
  };
}
