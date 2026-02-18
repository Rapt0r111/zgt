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

// CSRF-токен хранится в памяти — недоступен XSS через storage API.
let csrfToken: string | null = null;

/**
 * Запрашивает свежий CSRF-токен у сервера.
 * Вызывается при инициализации, если токена нет в памяти,
 * но access_token cookie присутствует (F5 / новая вкладка).
 */
export async function refreshCsrfToken(): Promise<void> {
  try {
    // GET-запрос — CSRF не нужен, сервер проверит только access_token cookie
    await apiClient.get("/api/auth/csrf-token");
    // Токен придёт в response interceptor через заголовок X-CSRF-Token
  } catch {
    // Пользователь не авторизован — нормальная ситуация на /login
    console.debug("[CSRF] Could not refresh token (user not authenticated)");
  }
}

/**
 * Инициализация CSRF при старте приложения.
 * Вызвать один раз в корневом layout или Providers.
 */
export async function initCsrf(): Promise<void> {
  if (csrfToken) return; // Уже есть — не трогаем

  // Проверяем наличие access_token cookie (грубая проверка без httpOnly)
  // httpOnly куки JS не читает, но можно попробовать запрос — сервер сам проверит
  await refreshCsrfToken();
}

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
  return null;
}

// ── Response interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    const newToken = response.headers["x-csrf-token"] as string | undefined;
    if (newToken) {
      csrfToken = newToken;
      console.debug("[CSRF] Token stored, length:", newToken.length);
    }
    return response;
  },
  async (error) => {
    const requestUrl = error.config?.url as string | undefined;
    const isAuthRequest =
      typeof requestUrl === "string" && requestUrl.includes("/api/auth/");

    if (error.response?.status === 422) {
      const message =
        extractErrorMessage(error.response.data) ?? "Ошибка валидации данных";
      toast.error(message);
    } else if (error.response?.status === 401 && !isAuthRequest) {
      csrfToken = null;
      toast.error("Сессия истекла");
      window.location.href = "/login";
    } else if (error.response?.status === 403) {
      const detail = error.response.data?.detail;
      const detailStr = typeof detail === "string" ? detail : "";

      if (detailStr.includes("CSRF") || detailStr.includes("csrf")) {
        // Показываем Tactical Security Alert вместо простого toast
        csrfToken = null;
        showCsrfSecurityAlert();
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
const CSRF_EXEMPT_ENDPOINTS = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/csrf-token",
];

apiClient.interceptors.request.use((config) => {
  const mutatingMethods = ["post", "put", "patch", "delete"];
  const isMutating = mutatingMethods.includes(config.method?.toLowerCase() ?? "");
  const isExempt = CSRF_EXEMPT_ENDPOINTS.some((ep) => config.url?.includes(ep));

  if (isMutating && !isExempt) {
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    } else {
      console.warn(
        "[CSRF] No token for",
        config.method?.toUpperCase(),
        config.url,
        "— will attempt refresh",
      );
    }
  }

  return config;
});

/**
 * Tactical Security Alert — отображается вместо стандартного 403.
 * Сохраняет данные формы в sessionStorage и предлагает обновить ключи.
 */
function showCsrfSecurityAlert(): void {
  // Сохраняем активные данные форм перед перезагрузкой
  saveFormDataToSession();

  // Создаём оверлей
  const overlay = document.createElement("div");
  overlay.id = "zgt-csrf-alert";
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(0,0,0,0.85);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(8px);
    font-family: ui-monospace, 'Cascadia Code', monospace;
  `;

  overlay.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border: 1px solid rgba(239,68,68,0.4);
      border-radius: 16px;
      padding: 40px;
      max-width: 480px;
      width: 90%;
      box-shadow: 0 0 60px rgba(239,68,68,0.2), 0 25px 50px rgba(0,0,0,0.5);
      text-align: center;
    ">
      <div style="
        width: 64px; height: 64px; margin: 0 auto 20px;
        border-radius: 50%;
        background: rgba(239,68,68,0.1);
        border: 2px solid rgba(239,68,68,0.4);
        display: flex; align-items: center; justify-content: center;
        font-size: 28px;
      ">🔐</div>

      <div style="
        font-size: 10px; letter-spacing: 0.3em;
        color: rgba(239,68,68,0.8); font-weight: bold;
        margin-bottom: 12px; text-transform: uppercase;
      ">СИСТЕМА БЕЗОПАСНОСТИ ЗГТ</div>

      <h2 style="
        color: #f1f5f9; font-size: 18px; font-weight: 700;
        margin: 0 0 12px; line-height: 1.4;
      ">Критическая ошибка безопасности</h2>

      <p style="
        color: rgba(148,163,184,0.9); font-size: 13px;
        line-height: 1.6; margin: 0 0 8px;
      ">Сессия устарела. Требуется обновление ключей доступа.</p>

      <p style="
        color: rgba(100,116,139,0.8); font-size: 11px;
        margin: 0 0 28px;
      ">Введённые данные сохранены и будут восстановлены после обновления.</p>

      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="zgt-csrf-refresh" style="
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white; border: none; border-radius: 8px;
          padding: 12px 24px; font-size: 13px; font-weight: 600;
          cursor: pointer; letter-spacing: 0.05em;
          transition: opacity 0.2s;
        ">🔑 Обновить ключи доступа</button>

        <button id="zgt-csrf-dismiss" style="
          background: transparent;
          color: rgba(148,163,184,0.8);
          border: 1px solid rgba(148,163,184,0.2);
          border-radius: 8px; padding: 12px 20px;
          font-size: 13px; cursor: pointer;
        ">Отмена</button>
      </div>

      <div style="
        margin-top: 20px; padding-top: 16px;
        border-top: 1px solid rgba(255,255,255,0.05);
        font-size: 10px; color: rgba(100,116,139,0.6);
        letter-spacing: 0.15em;
      ">CSRF-PROTECTION ACTIVE • SESSION EXPIRED</div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("zgt-csrf-refresh")?.addEventListener("click", async () => {
    const btn = document.getElementById("zgt-csrf-refresh") as HTMLButtonElement;
    btn.textContent = "⏳ Обновление...";
    btn.disabled = true;

    // Фоновое обновление токена без полной перезагрузки
    await refreshCsrfToken();

    if (csrfToken) {
      overlay.remove();
      // Восстанавливаем данные форм
      restoreFormDataFromSession();
      toast.success("Ключи доступа обновлены. Повторите действие.");
    } else {
      // Токен не получен — сессия истекла полностью, нужен логин
      window.location.href = "/login?reason=session_expired";
    }
  });

  document.getElementById("zgt-csrf-dismiss")?.addEventListener("click", () => {
    overlay.remove();
  });
}

/**
 * Сохраняет данные активных форм в sessionStorage перед обновлением токена.
 */
function saveFormDataToSession(): void {
  try {
    const forms = document.querySelectorAll("form");
    const savedForms: Record<string, Record<string, string>> = {};

    forms.forEach((form, i) => {
      const formData: Record<string, string> = {};
      const inputs = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "input:not([type=password]):not([type=file]), textarea",
      );
      inputs.forEach((input) => {
        if (input.name || input.id) {
          formData[input.name || input.id] = input.value;
        }
      });
      if (Object.keys(formData).length > 0) {
        savedForms[`form_${i}`] = formData;
      }
    });

    if (Object.keys(savedForms).length > 0) {
      sessionStorage.setItem("zgt_form_backup", JSON.stringify(savedForms));
    }
  } catch {
    // sessionStorage недоступен — не критично
  }
}

/**
 * Восстанавливает данные форм из sessionStorage после обновления токена.
 */
function restoreFormDataFromSession(): void {
  try {
    const saved = sessionStorage.getItem("zgt_form_backup");
    if (!saved) return;

    const savedForms = JSON.parse(saved) as Record<string, Record<string, string>>;
    const forms = document.querySelectorAll("form");

    forms.forEach((form, i) => {
      const formData = savedForms[`form_${i}`];
      if (!formData) return;

      Object.entries(formData).forEach(([key, value]) => {
        const input = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          `[name="${key}"], [id="${key}"]`,
        );
        if (input) {
          input.value = value;
          // Тригерим событие для React
          const event = new Event("input", { bubbles: true });
          input.dispatchEvent(event);
        }
      });
    });

    sessionStorage.removeItem("zgt_form_backup");
  } catch {
    // Игнорируем
  }
}

export default apiClient;