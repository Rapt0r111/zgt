/**
 * Типы оборудования: разделены на «сложные» (требуют CPU/RAM/накопитель)
 * и «простые» (достаточно модели и серийного номера).
 */

/** Вычислительная техника — полная форма с процессором, памятью, ОС и т.д. */
export const COMPLEX_EQUIPMENT_TYPES = [
  "АРМ",
  "ПЭВМ",
  "Ноутбук",
  "Сервер",
] as const;

/** Общая электроника — упрощённая форма: название + серийный номер */
export const SIMPLE_EQUIPMENT_TYPES = [
  "Телевизор",
  "Интерактивная доска",
  "Проектор",
  "МФУ",
  "Монитор",
  "Принтер",
  "Сканер",
  "ИБП",
  "Сетевое оборудование",
  "Другое",
] as const;

export type ComplexEquipmentType = (typeof COMPLEX_EQUIPMENT_TYPES)[number];
export type SimpleEquipmentType = (typeof SIMPLE_EQUIPMENT_TYPES)[number];
export type EquipmentType = ComplexEquipmentType | SimpleEquipmentType;

export const ALL_EQUIPMENT_TYPES: readonly EquipmentType[] = [
  ...COMPLEX_EQUIPMENT_TYPES,
  ...SIMPLE_EQUIPMENT_TYPES,
];

const SIMPLE_TYPES_SET = new Set<string>(SIMPLE_EQUIPMENT_TYPES);

/** Возвращает true если тип не требует полной технической формы */
export function isSimpleEquipmentType(type: string): boolean {
  return SIMPLE_TYPES_SET.has(type);
}

/** Набор типов, требующих хотя бы один идентификатор (s/n или инв. номер) */
export const STATUSES = ["В работе", "На складе", "В ремонте", "Сломан"] as const;
export type EquipmentStatus = (typeof STATUSES)[number];

export const STORAGE_TYPES = ["HDD", "SSD", "NVMe", "Другое"] as const;