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

// CSRF-токен хранится только в памяти — не в sessionStorage/localStorage.
// XSS не может его украсть через storage API.
let csrfToken: string | null = null;

/**
 * Извлекает читаемое сообщение из ответа FastAPI / Pydantic v2.
 * Pydantic v2: { detail: [{loc, msg, input, ctx}, ...] }
 * FastAPI HTTPException: { detail: "строка" }
 */
function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;

  const detail = (data as Record<string, unknown>).detail;

  if (Array.isArray(detail)) {
    return detail
      .map((d: unknown) => {
        if (!d || typeof d !== "object") return String(d ?? "");
        const msg = (d as Record<string, unknown>).msg;
        const msgStr = typeof msg === "string" ? msg : JSON.stringify(msg ?? d);
        return msgStr.replace(/^Value error,\s*/i, "");
      })
      .filter(Boolean)
      .join(". ");
  }

  if (typeof detail === "string") return detail;
  if (typeof data === "string") return data;

  return null;
}

// ── Response interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    // Заголовок приходит только на /api/auth/login.
    // expose_headers в CORS должен включать "X-CSRF-Token".
    const newToken = response.headers["x-csrf-token"] as string | undefined;
    if (newToken) {
      csrfToken = newToken;
      console.debug("[CSRF] Token stored, length:", newToken.length);
    }
    return response;
  },
  (error) => {
    const requestUrl = error.config?.url as string | undefined;
    const isAuthRequest =
      typeof requestUrl === "string" && requestUrl.includes("/api/auth/");

    if (error.response?.status === 422) {
      const message =
        extractErrorMessage(error.response.data) ?? "Ошибка валидации данных";
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
        // Сбрасываем токен — после обновления страницы придёт новый при логине
        csrfToken = null;
        console.warn("[CSRF] Token rejected by server, cleared.");
      } else {
        toast.error("Недостаточно прав");
      }
    } else if (error.response?.status === 429) {
      toast.error("Слишком много запросов. Попробуйте позже.");
    } else if (error.response?.status >= 500) {
      toast.error("Ошибка сервера");
    }

    return Promise.reject(error);
  },
);

// ── Request interceptor ───────────────────────────────────────────────────────
const CSRF_EXEMPT_ENDPOINTS = ["/api/auth/login", "/api/auth/logout"];

apiClient.interceptors.request.use((config) => {
  const mutatingMethods = ["post", "put", "patch", "delete"];
  const isMutating = mutatingMethods.includes(
    config.method?.toLowerCase() ?? "",
  );
  const isExempt = CSRF_EXEMPT_ENDPOINTS.some((ep) =>
    config.url?.includes(ep),
  );

  if (isMutating && !isExempt) {
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
      console.debug("[CSRF] Token attached to", config.method?.toUpperCase(), config.url);
    } else {
      // Токена нет — значит пользователь не прошёл через /api/auth/login в этой сессии
      // (например, открыл вкладку без входа). Сервер вернёт 403.
      console.warn("[CSRF] No token available for", config.method?.toUpperCase(), config.url);
    }
  }

  return config;
});

export default apiClient;