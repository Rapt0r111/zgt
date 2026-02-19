import axios, { type AxiosResponse } from "axios";
import { toast } from "sonner";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 10000,
});

let csrfToken: string | null = null;

export async function refreshCsrfToken(): Promise<void> {
  try {
    await apiClient.get("/api/auth/csrf-token");
  } catch {
    // User not authenticated — expected on /login
  }
}

export async function initCsrf(): Promise<void> {
  if (!csrfToken) await refreshCsrfToken();
}

function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const { detail } = data as Record<string, unknown>;
  if (Array.isArray(detail)) {
    return detail
      .map((d: unknown) => {
        if (!d || typeof d !== "object") return String(d ?? "");
        const msg = (d as Record<string, unknown>).msg;
        return (typeof msg === "string" ? msg : JSON.stringify(msg ?? d))
          .replace(/^Value error,\s*/i, "");
      })
      .filter(Boolean)
      .join(". ") || null;
  }
  return typeof detail === "string" ? detail : null;
}

const CSRF_EXEMPT = ["/api/auth/login", "/api/auth/logout", "/api/auth/csrf-token"];
const MUTATING = ["post", "put", "patch", "delete"];

apiClient.interceptors.request.use((config) => {
  const isMutating = MUTATING.includes(config.method?.toLowerCase() ?? "");
  const isExempt = CSRF_EXEMPT.some((ep) => config.url?.includes(ep));
  if (isMutating && !isExempt && csrfToken) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const newToken = response.headers["x-csrf-token"] as string | undefined;
    if (newToken) csrfToken = newToken;
    return response;
  },
  async (error) => {
    const status: number = error.response?.status;
    const isAuthRequest = (error.config?.url as string)?.includes("/api/auth/");

    if (status === 422) {
      toast.error(extractErrorMessage(error.response.data) ?? "Ошибка валидации данных");
    } else if (status === 401 && !isAuthRequest) {
      csrfToken = null;
      toast.error("Сессия истекла");
      window.location.href = "/login";
    } else if (status === 403) {
      const detail = error.response.data?.detail ?? "";
      if (typeof detail === "string" && /csrf/i.test(detail)) {
        csrfToken = null;
        showCsrfSecurityAlert();
      } else {
        toast.error("Недостаточно прав");
      }
    } else if (status === 429) {
      toast.error("Слишком много запросов. Попробуйте позже.");
    } else if (status >= 500) {
      toast.error("Ошибка сервера");
    }

    return Promise.reject(error);
  },
);

function showCsrfSecurityAlert(): void {
  const overlay = document.createElement("div");
  overlay.id = "zgt-csrf-alert";
  Object.assign(overlay.style, {
    position: "fixed", inset: "0", zIndex: "99999",
    background: "rgba(0,0,0,0.85)", display: "flex",
    alignItems: "center", justifyContent: "center",
    backdropFilter: "blur(8px)",
    fontFamily: "ui-monospace, 'Cascadia Code', monospace",
  });

  overlay.innerHTML = `
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b);border:1px solid rgba(239,68,68,0.4);border-radius:16px;padding:40px;max-width:480px;width:90%;box-shadow:0 0 60px rgba(239,68,68,0.2),0 25px 50px rgba(0,0,0,0.5);text-align:center">
      <div style="width:64px;height:64px;margin:0 auto 20px;border-radius:50%;background:rgba(239,68,68,0.1);border:2px solid rgba(239,68,68,0.4);display:flex;align-items:center;justify-content:center;font-size:28px">🔐</div>
      <div style="font-size:10px;letter-spacing:0.3em;color:rgba(239,68,68,0.8);font-weight:bold;margin-bottom:12px;text-transform:uppercase">СИСТЕМА БЕЗОПАСНОСТИ ЗГТ</div>
      <h2 style="color:#f1f5f9;font-size:18px;font-weight:700;margin:0 0 12px;line-height:1.4">Критическая ошибка безопасности</h2>
      <p style="color:rgba(148,163,184,0.9);font-size:13px;line-height:1.6;margin:0 0 28px">Сессия устарела. Требуется обновление ключей доступа.</p>
      <div style="display:flex;gap:12px;justify-content:center">
        <button id="zgt-csrf-refresh" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;border:none;border-radius:8px;padding:12px 24px;font-size:13px;font-weight:600;cursor:pointer">🔑 Обновить ключи доступа</button>
        <button id="zgt-csrf-dismiss" style="background:transparent;color:rgba(148,163,184,0.8);border:1px solid rgba(148,163,184,0.2);border-radius:8px;padding:12px 20px;font-size:13px;cursor:pointer">Отмена</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  document.getElementById("zgt-csrf-refresh")?.addEventListener("click", async () => {
    const btn = document.getElementById("zgt-csrf-refresh") as HTMLButtonElement;
    btn.textContent = "⏳ Обновление...";
    btn.disabled = true;
    await refreshCsrfToken();
    overlay.remove();
    if (csrfToken) {
      toast.success("Ключи доступа обновлены. Повторите действие.");
    } else {
      window.location.href = "/login?reason=session_expired";
    }
  });

  document.getElementById("zgt-csrf-dismiss")?.addEventListener("click", () => overlay.remove());
}

export default apiClient;