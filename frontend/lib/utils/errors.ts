/**
 * Извлекает читаемое сообщение об ошибке из ответа FastAPI / Pydantic v2.
 *
 * Pydantic v2: { detail: [{loc, msg, input, ctx}, ...] }
 * FastAPI HTTPException: { detail: "строка" }
 */
export function extractErrorMessage(data: unknown, fallback = "Произошла ошибка"): string {
  if (!data || typeof data !== "object") return fallback;

  const detail = (data as Record<string, unknown>).detail;

  if (Array.isArray(detail)) {
    const msg = detail
      .map((d: unknown) => {
        if (!d || typeof d !== "object") return String(d ?? "");
        const m = (d as Record<string, unknown>).msg;
        const mStr = typeof m === "string" ? m : JSON.stringify(m ?? d);
        return mStr.replace(/^Value error,\s*/i, "");
      })
      .filter(Boolean)
      .join(". ");
    return msg || fallback;
  }

  if (typeof detail === "string") return detail;

  return fallback;
}

/**
 * Хелпер для onError колбэков — вытаскивает сообщение из axios-ошибки.
 * Использование: toast.error(getApiError(err, "Ошибка при создании"))
 */
export function getApiError(err: unknown, fallback = "Произошла ошибка"): string {
  if (!err || typeof err !== "object") return fallback;
  const response = (err as Record<string, unknown>).response;
  if (!response || typeof response !== "object") return fallback;
  const data = (response as Record<string, unknown>).data;
  return extractErrorMessage(data, fallback);
}