export function extractErrorMessage(data: unknown, fallback = "Произошла ошибка"): string {
  if (!data || typeof data !== "object") return fallback;
  const d = data as Record<string, unknown>;
  const detail = d.detail;

  // FastAPI default format: detail is an array of validation errors
  if (Array.isArray(detail)) {
    const msg = detail
      .map((item: unknown) => {
        if (!item || typeof item !== "object") return String(item ?? "");
        const m = (item as Record<string, unknown>).msg;
        const loc = (item as Record<string, unknown>).loc;
        const field = Array.isArray(loc)
          ? loc.filter((l) => l !== "body").join(".")
          : "";
        const text = (typeof m === "string" ? m : JSON.stringify(m ?? item))
          .replace(/^Value error,\s*/i, "")
          .replace(/^String should have at least (\d+) characters?/i, "Минимум $1 символов")
          .replace(/^String should have at most (\d+) characters?/i, "Максимум $1 символов");
        return field ? `${field}: ${text}` : text;
      })
      .filter(Boolean)
      .join(". ");
    return msg || fallback;
  }

  // Custom backend format: detail is a string, real errors live in "errors" array
  const errors = d.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const msg = errors
      .map((item: unknown) => {
        if (!item || typeof item !== "object") return String(item ?? "");
        const m = (item as Record<string, unknown>).msg;
        const loc = (item as Record<string, unknown>).loc;
        const field = Array.isArray(loc)
          ? loc.filter((l) => l !== "body").join(".")
          : "";
        const text = (typeof m === "string" ? m : JSON.stringify(m ?? item))
          .replace(/^Value error,\s*/i, "")
          .replace(/^String should have at least (\d+) characters?/i, "Минимум $1 символов")
          .replace(/^String should have at most (\d+) characters?/i, "Максимум $1 символов");
        return field ? `${field}: ${text}` : text;
      })
      .filter(Boolean)
      .join(". ");
    if (msg) return msg;
  }

  return typeof detail === "string" && detail !== "Validation error"
    ? detail
    : fallback;
}

export function getApiError(err: unknown, fallback = "Произошла ошибка"): string {
  if (!err || typeof err !== "object") return fallback;
  const response = (err as Record<string, unknown>).response;
  if (!response || typeof response !== "object") return fallback;
  return extractErrorMessage((response as Record<string, unknown>).data, fallback);
}