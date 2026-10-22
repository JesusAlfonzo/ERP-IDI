import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("erp_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (
    error: AxiosError<{
      message?: string;
      errors?: Array<{ field?: string; message: string }>;
    }>
  ) => {
    // Extraer mensaje detallado proporcionado por el backend
    const serverData = error.response?.data;
    if (serverData) {
      if (Array.isArray(serverData.errors) && serverData.errors.length > 0) {
        const details = serverData.errors
          .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
          .join(" | ");
        error.message = serverData.message
          ? `${serverData.message} (${details})`
          : details;
      } else if (serverData.message) {
        error.message = serverData.message;
      }
    }

    // Manejo de expiración de sesión (401), omitiendo la ruta de autenticación /login
    const isLoginRequest = error.config?.url?.includes("/auth/login");
    const isLoginPage =
      typeof window !== "undefined" && window.location.pathname.includes("/login");

    if (
      error.response?.status === 401 &&
      !isLoginRequest &&
      !isLoginPage &&
      typeof window !== "undefined"
    ) {
      localStorage.removeItem("erp_token");
      localStorage.removeItem("erp_user");
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);
