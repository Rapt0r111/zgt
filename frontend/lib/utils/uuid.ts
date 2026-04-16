/**
 * Безопасная замена crypto.randomUUID().
 *
 * crypto.randomUUID() требует Secure Context (HTTPS).
 * В локальных сетях приложение часто открывается по HTTP,
 * поэтому используем fallback на основе crypto.getRandomValues(),
 * который работает и в HTTP-контексте.
 */
export function generateUUID(): string {
  // Предпочитаем нативный метод, если доступен (HTTPS / localhost)
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  // Fallback: генерируем UUID v4 вручную через crypto.getRandomValues
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Устанавливаем версию (4) и вариант (RFC 4122)
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map((b) =>
      b.toString(16).padStart(2, "0"),
    );
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }

  // Last resort: Math.random (не криптографически стойкий, но не вызовет ошибку)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}