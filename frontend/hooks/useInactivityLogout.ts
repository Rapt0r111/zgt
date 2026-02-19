import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";

const TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_BEFORE_MS = 2 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click", "wheel"] as const;

export function useInactivityLogout() {
  const router = useRouter();
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warningToastId = useRef<string | number | undefined>(undefined);

  const performLogout = useCallback(async () => {
    toast.dismiss(warningToastId.current);
    try { await apiClient.post("/api/auth/logout"); } catch { /* ignore */ }
    router.push("/login?reason=inactivity");
  }, [router]);

  const resetTimer = useCallback(() => {
    clearTimeout(logoutTimer.current);
    clearTimeout(warningTimer.current);
    toast.dismiss(warningToastId.current);

    warningTimer.current = setTimeout(() => {
      warningToastId.current = toast.warning("⚠️ Автовыход через 2 минуты из-за неактивности", {
        duration: WARNING_BEFORE_MS,
      });
    }, TIMEOUT_MS - WARNING_BEFORE_MS);

    logoutTimer.current = setTimeout(performLogout, TIMEOUT_MS);
  }, [performLogout]);

  useEffect(() => {
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
      clearTimeout(logoutTimer.current);
      clearTimeout(warningTimer.current);
      toast.dismiss(warningToastId.current);
    };
  }, [resetTimer]);
}