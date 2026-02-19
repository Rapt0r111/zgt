export function extractErrorMessage(data: unknown, fallback = "Произошла ошибка"): string {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as Record<string, unknown>).detail;

  if (Array.isArray(detail)) {
    const msg = detail
      .map((d: unknown) => {
        if (!d || typeof d !== "object") return String(d ?? "");
        const m = (d as Record<string, unknown>).msg;
        return (typeof m === "string" ? m : JSON.stringify(m ?? d)).replace(/^Value error,\s*/i, "");
      })
      .filter(Boolean)
      .join(". ");
    return msg || fallback;
  }

  return typeof detail === "string" ? detail : fallback;
}

export function getApiError(err: unknown, fallback = "Произошла ошибка"): string {
  if (!err || typeof err !== "object") return fallback;
  const response = (err as Record<string, unknown>).response;
  if (!response || typeof response !== "object") return fallback;
  return extractErrorMessage((response as Record<string, unknown>).data, fallback);
}