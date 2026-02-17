import axios from "axios";
import { toast } from "sonner";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 10000,
});

// CSRF-токен хранится только в памяти — не в sessionStorage
// XSS не может его украсть через storage API
let csrfToken: string | null = null;

apiClient.interceptors.response.use(
  (response) => {
    // Обновляем токен из заголовка ответа
    const newToken = response.headers["x-csrf-token"] as string | undefined;
    if (newToken) {
      csrfToken = newToken;
    }
    return response;
  },
  (error) => {
    const requestUrl = error.config?.url as string | undefined;
    const isAuthRequest =
      typeof requestUrl === "string" && requestUrl.includes("/api/auth/");

    if (error.response?.status === 422) {
      console.error("Validation Error:", JSON.stringify(error.response.data, null, 2));
    }

    if (error.response?.status === 401 && !isAuthRequest) {
		toast.error("Сессия истекла");
		window.location.href = "/login";
	}

    if (error.response?.status === 403) {
      if (error.response.data?.detail?.includes("CSRF")) {
        toast.error("Ошибка безопасности. Обновите страницу.");
      } else {
        toast.error("Недостаточно прав");
      }
    }

    if (error.response?.status === 429) {
      toast.error("Слишком много запросов. Попробуйте позже.");
    }

    if (error.response?.status >= 500) {
      toast.error("Ошибка сервера");
    }

    return Promise.reject(error);
  }
);

const CSRF_EXEMPT_ENDPOINTS = ["/api/auth/login", "/api/auth/logout"];

apiClient.interceptors.request.use((config) => {
  const mutatingMethods = ["post", "put", "patch", "delete"];
  const isMutating = mutatingMethods.includes(config.method?.toLowerCase() || "");
  const isExempt = CSRF_EXEMPT_ENDPOINTS.some((ep) => config.url?.includes(ep));

  if (isMutating && !isExempt && csrfToken) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }

  return config;
});

export default apiClient;