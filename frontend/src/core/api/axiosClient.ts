import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to track token refreshing state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 1. Request Interceptor: Inject Access Token from Zustand store
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Unwrap API envelope + automatic token refresh on 401
axiosClient.interceptors.response.use(
  (response) => {
    // Unwrap standard API envelope { success: true, data: ... }
    if (response.data && response.data.success === true && "data" in response.data) {
      return {
        ...response,
        data: response.data.data,
      };
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const authStore = useAuthStore.getState();
    const isRetry = (originalRequest as { _retry?: boolean })._retry;

    if (error.response?.status === 401 && !isRetry) {
      console.log("[DEBUG] 401 RECEIVED");
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      (originalRequest as { _retry?: boolean })._retry = true;
      isRefreshing = true;
      console.log("[DEBUG] REFRESH START");

      try {
        const refresh_token = authStore.refreshToken;
        if (!refresh_token) throw new Error("No refresh token available");

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: refresh_token,
        });

        const envelope = response.data;
        const { accessToken, refreshToken, user } = envelope.data || envelope;

        console.log("[DEBUG] REFRESH SUCCESS");
        console.log("[DEBUG] TOKEN RECEIVED");
        // setAuth triggers zustand/persist which syncs new tokens to localStorage
        authStore.setAuth(user || authStore.user, accessToken, refreshToken);

        processQueue(null, accessToken);
        isRefreshing = false;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        isRefreshing = false;
        // clearAuth triggers zustand/persist which wipes localStorage
        authStore.clearAuth();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
