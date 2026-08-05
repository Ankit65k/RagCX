import { axiosClient } from "@/core/api/axiosClient";
import { UserProfile } from "@/core/store/authStore";

export interface LoginResponse {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  user: UserProfile;
}

export const authApi = {
  register: async (credentials: Record<string, string>): Promise<UserProfile> => {
    const res = await axiosClient.post("/auth/register", credentials);
    return res.data;
  },
  login: async (credentials: Record<string, string>): Promise<LoginResponse> => {
    const res = await axiosClient.post("/auth/login", credentials);
    return res.data;
  },
  logout: async (): Promise<void> => {
    await axiosClient.post("/auth/logout");
  },
  getMe: async (): Promise<UserProfile> => {
    const res = await axiosClient.get("/auth/me");
    return res.data;
  },
  refresh: async (refreshToken: string): Promise<LoginResponse> => {
    const res = await axiosClient.post("/auth/refresh", { refreshToken });
    return res.data;
  },
};
