/**
 * Удаляет пустые строки из объекта перед отправкой на сервер.
 * Null/undefined пропускаются — Pydantic Optional корректно обрабатывает null.
 *
 * @example
 * cleanEmptyStrings({ name: "Иван", notes: "", age: null })
 * // → { name: "Иван", age: null }
 */
export function cleanEmptyStrings<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== ""),
  ) as Partial<T>;
}

/**
 * Рекурсивная версия — очищает вложенные объекты.
 * Используй только когда payload многоуровневый.
 */
export function cleanEmptyStringsDeep<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== "")
      .map(([k, v]) => [
        k,
        v && typeof v === "object" && !Array.isArray(v)
          ? cleanEmptyStringsDeep(v as Record<string, unknown>)
          : v,
      ]),
  ) as Partial<T>;
}

/**
 * Нормализует строку: trim + пустую → null.
 * Полезно для необязательных текстовых полей формы.
 */
export function normalizeOptionalString(
  value: string | null | undefined,
): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}