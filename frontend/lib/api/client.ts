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

/**
 * Извлекает читаемое сообщение об ошибке из ответа FastAPI / Pydantic v2.
 *
 * Pydantic v2 возвращает: { detail: [{loc, msg, input, ctx}, ...] }
 * msg всегда строка, но может содержать префикс "Value error, " из @field_validator.
 */
function extractErrorMessage(data: any): string | null {
  if (!data) return null;

  const detail = data.detail;

  // Pydantic v2: массив объектов с полем msg
  if (Array.isArray(detail)) {
    return detail
      .map((d: any) => {
        // d.msg гарантированно строка в Pydantic v2, но на всякий случай
        const msg = typeof d?.msg === "string" ? d.msg : JSON.stringify(d?.msg ?? d);
        // Убираем технический префикс который Pydantic добавляет к @field_validator ошибкам
        return msg.replace(/^Value error,\s*/i, "");
      })
      .filter(Boolean)
      .join(". ");
  }

  // FastAPI HTTPException: { detail: "строка" }
  if (typeof detail === "string") return detail;

  // Просто строка на верхнем уровне
  if (typeof data === "string") return data;

  return null;
}

apiClient.interceptors.response.use(
  (response) => {
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
      const message = extractErrorMessage(error.response.data) ?? "Ошибка валидации данных";
      toast.error(message);
      console.error("Validation Error:", message);
    } else if (error.response?.status === 401 && !isAuthRequest) {
      toast.error("Сессия истекла");
      window.location.href = "/login";
    } else if (error.response?.status === 403) {
      const detail = error.response.data?.detail;
      const detailStr = typeof detail === "string" ? detail : "";
      if (detailStr.includes("CSRF")) {
        toast.error("Ошибка безопасности. Обновите страницу.");
      } else {
        toast.error("Недостаточно прав");
      }
    } else if (error.response?.status === 429) {
      toast.error("Слишком много запросов. Попробуйте позже.");
    } else if (error.response?.status >= 500) {
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