export function cleanEmptyStrings<T extends Record<string, any>>(
  obj: T, 
  excludeFields: string[] = []
): Partial<T> {
  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Пропускаем поля из excludeFields
    if (excludeFields.includes(key) && value === '') {
      result[key] = value;
      continue;
    }
    
    if (value === '' || value === null) {
      continue;
    }
    result[key] = value;
  }
  
  return result;
}