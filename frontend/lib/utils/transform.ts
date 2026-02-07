/**
 * Преобразует пустые строки в undefined для корректной отправки на backend
 */
export function cleanEmptyStrings<T extends Record<string, any>>(obj: T): Partial<T> {
    const result: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === '' || value === null) {
        continue;
      }
      result[key] = value;
    }
    
    return result;
  }