// frontend/hooks/useInactivityLogout.ts
import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_BEFORE_MS = 2 * 60 * 1000;

export function useInactivityLogout() {
  const router = useRouter();
  
  // Добавляем undefined как начальное значение
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toastIdRef = useRef<string | number | undefined>(undefined);

  const performLogout = useCallback(async () => {
    toast.dismiss(toastIdRef.current);
    try {
      await apiClient.post("/api/auth/logout");
    } catch {
      // Игнорируем ошибку
    } finally {
      router.push("/login?reason=inactivity");
    }
  }, [router]);

  const resetTimer = useCallback(() => {
    // Используем опциональную цепочку или проверку на существование
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (toastIdRef.current) toast.dismiss(toastIdRef.current);

    warningTimerRef.current = setTimeout(() => {
      toastIdRef.current = toast.warning(
        "⚠️ Автовыход через 2 минуты из-за неактивности",
        { duration: WARNING_BEFORE_MS }
      );
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);

    logoutTimerRef.current = setTimeout(performLogout, INACTIVITY_TIMEOUT_MS);
  }, [performLogout]);

  useEffect(() => {
    const EVENTS = [
      "mousemove", "mousedown", "keydown",
      "touchstart", "scroll", "click", "wheel",
    ] as const;

    // Оптимизация: можно добавить throttle, чтобы не вызывать resetTimer слишком часто
    EVENTS.forEach((e) =>
      window.addEventListener(e, resetTimer, { passive: true })
    );
    resetTimer();

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
    };
  }, [resetTimer]);
}