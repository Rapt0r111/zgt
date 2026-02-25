
export type ActType = "sdacha" | "vydacha";

export const CONDITION_VALUES = ["ok", "defective", "absent", "cosmetic"] as const;
export type Condition = (typeof CONDITION_VALUES)[number];

export interface KitItem {
  id: string;
  name: string;
  condition: Condition;
  defectNote: string;
}

export interface UploadedPhoto {
  id: string;
  file?: File; // только на клиенте
  dataUrl: string;
  caption: string;
}

// ─── Лейблы и цвета ──────────────────────────────────────────────────────────

export const CONDITION_LABEL: Record<Condition, string> = {
  ok: "Исправно",
  defective: "Неисправно",
  absent: "Отсутствует",
  cosmetic: "Косм. дефекты",
};

export const CONDITION_COLOR: Record<Condition, string> = {
  ok: "bg-emerald-600/20 border-emerald-500/50 text-emerald-300",
  defective: "bg-red-600/20 border-red-500/50 text-red-300",
  absent: "bg-slate-600/20 border-slate-500/50 text-slate-400",
  cosmetic: "bg-amber-600/20 border-amber-500/50 text-amber-300",
};

// ─── Грамматика ───────────────────────────────────────────────────────────────

const ITEM_GENDER: Record<string, "m" | "f" | "n"> = {
  "ноутбук": "m",
  "зарядное устройство": "n",
  "компьютерная мышь": "f",
  "мышь": "f",
  "сумка для ноутбука": "f",
  "сумка": "f",
  "usb-концентратор": "m",
  "usb концентратор": "m",
  "кабель питания": "m",
  "кабель": "m",
  "адаптер питания": "m",
  "адаптер": "m",
  "блок питания": "m",
};

export function getItemGender(name: string): "m" | "f" | "n" {
  return ITEM_GENDER[name.toLowerCase().trim()] ?? "n";
}

export const CONDITION_ADJECTIVE: Record<Condition, Record<"m" | "f" | "n", string>> = {
  ok: { m: "исправен", f: "исправна", n: "исправно" },
  defective: { m: "неисправен", f: "неисправна", n: "неисправно" },
  absent: { m: "отсутствует", f: "отсутствует", n: "отсутствует" },
  cosmetic: {
    m: "имеет косметические дефекты",
    f: "имеет косметические дефекты",
    n: "имеет косметические дефекты",
  },
};

export function conditionPhrase(c: Condition, name: string): string {
  if (c === "ok") return "";
  const gender = getItemGender(name);
  return noWidows(` (${CONDITION_ADJECTIVE[c][gender]})`);
}

export function itemGoesToAppendix(c: Condition): boolean {
  return c === "defective" || c === "absent" || c === "cosmetic";
}

// ─── Вычисление итогового состояния ──────────────────────────────────────────

export interface OverallStateResult {
  text: string;
  hasAppendix: boolean;
}

export function computeOverallState(
  kitItems: Pick<KitItem, "name" | "condition">[],
  hasCustomDefects: boolean,
): OverallStateResult {
  const laptopItem = kitItems.find((i) => i.name.toLowerCase().trim() === "ноутбук");
  const hasLaptopDefect = laptopItem && laptopItem.condition !== "ok";
  const periphery = kitItems.filter((i) => i.name.toLowerCase().trim() !== "ноутбук");
  const hasPeripheryDefect = periphery.some((i) => i.condition === "defective");
  const hasPeripheryAbsent = periphery.some((i) => i.condition === "absent");
  const hasPeripheryCosmetic = periphery.some((i) => i.condition === "cosmetic");
  const hasAppendixItems = kitItems.some((i) => itemGoesToAppendix(i.condition));
  const hasAppendix = hasAppendixItems || hasCustomDefects;

  let text: string;
  if (hasLaptopDefect || hasCustomDefects) {
    text = " – в неисправном состоянии (см. Приложение)";
  } else if (hasPeripheryDefect) {
    text = " – ноутбук в исправном состоянии; дефекты периферии указаны в Приложении";
  } else if (hasPeripheryAbsent) {
    text = " – ноутбук в исправном состоянии; передаётся в неполном комплекте";
  } else if (hasPeripheryCosmetic) {
    text = " – ноутбук в исправном состоянии; отдельные позиции имеют косметические дефекты";
  } else {
    text = " – в исправном состоянии";
  }

  return { text: noWidows(text), hasAppendix };
}

// ─── Дата ─────────────────────────────────────────────────────────────────────

export const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
] as const;

export function formatFullDate(day: string, month: string, year: string): string {
  const d = parseInt(day);
  const m = parseInt(month);
  if (!d || !m || m < 1 || m > 12) return `«___» ___________ ${year} г.`;
  return `«${String(d).padStart(2, "0")}»\u00A0${MONTHS_GEN[m - 1]}\u00A0${year}\u00A0г.`;
}

/**
 * Разбирает строку даты вида «01» января 2026 г.
 * Возвращает { day, month, rest } или null если не распознана.
 */
export function parseDateString(dateStr: string): { day: string; month: string; rest: string } | null {
  const regex = /«([^»]+)»\s+([^\s]+)\s+(.*)/;
  const match = dateStr.trim().match(regex);
  if (!match) return null;
  return { day: match[1], month: match[2], rest: match[3] };
}

// ─── Строки комплекта ─────────────────────────────────────────────────────────

export function buildKitString(kitItems: Pick<KitItem, "name" | "condition">[]): string {
  return kitItems
    .map((it) => `${it.name}${conditionPhrase(it.condition, it.name)}`)
    .join(", ");
}

// ─── Пресеты ──────────────────────────────────────────────────────────────────

export const KIT_PRESETS = [
  "ноутбук",
  "зарядное устройство",
  "компьютерная мышь",
  "сумка для ноутбука",
  "USB-концентратор",
  "кабель питания",
] as const;

export const COMMANDER = { rank: "капитан", sign: "С. Тарасенко" } as const;

// ─── Склонение ────────────────────────────────────────────────────────────────

export function lcFirst(s: string): string {
  if (!s) return s;
  return /[А-ЯЁ]/.test(s[0]) ? s[0].toLowerCase() + s.slice(1) : s;
}

function toGenitiveLastName(lastName: string): string {
  if (/[кнлтрвхжшщзсдбпмф]о$/iu.test(lastName)) return lastName;
  if (/[еэ]$/iu.test(lastName)) return lastName;
  if (/[оеё]в$/iu.test(lastName)) return lastName + "а";
  if (/[иы]н$/iu.test(lastName)) return lastName + "а";
  if (/ский$/iu.test(lastName)) return lastName.replace(/ский$/iu, "ского");
  if (/цкий$/iu.test(lastName)) return lastName.replace(/цкий$/iu, "цкого");
  if (/жий$/iu.test(lastName)) return lastName.replace(/жий$/iu, "жего");
  if (/ный$/iu.test(lastName)) return lastName.replace(/ный$/iu, "ного");
  if (/ой$/iu.test(lastName)) return lastName.replace(/ой$/iu, "ого");
  if (/ий$/iu.test(lastName)) return lastName.replace(/ий$/iu, "его");
  if (/[жшщч]а$/iu.test(lastName)) return lastName.replace(/а$/u, "и");
  if (/[бвгджзклмнпрстфхцчшщ]а$/iu.test(lastName)) return lastName.replace(/а$/u, "ы");
  if (/[бвгджзклмнпрстфхцчшщ]$/iu.test(lastName)) return lastName + "а";
  return lastName;
}

function toGenitiveWord(word: string): string {
  const w = word.trim();
  const wl = w.toLowerCase();
  const DICT: Record<string, string> = {
    маршал: "маршала", генерал: "генерала", полковник: "полковника",
    подполковник: "подполковника", майор: "майора", капитан: "капитана",
    лейтенант: "лейтенанта", прапорщик: "прапорщика", старшина: "старшины",
    сержант: "сержанта", ефрейтор: "ефрейтора", рядовой: "рядового",
    курсант: "курсанта", старший: "старшего", младший: "младшего",
    оператор: "оператора", командир: "командира", начальник: "начальника",
    заместитель: "заместителя", офицер: "офицера", специалист: "специалиста",
    инженер: "инженера", техник: "техника", связист: "связиста",
    программист: "программиста", аналитик: "аналитика", водитель: "водителя",
    механик: "механика", переводчик: "переводчика",
    первого: "первого", первый: "первого", второго: "второго", второй: "второго",
    третьего: "третьего", третий: "третьего", "четвёртого": "четвёртого",
    роты: "роты", рота: "роты", взвода: "взвода", взвод: "взвода",
    батальона: "батальона", батальон: "батальона", полка: "полка", полк: "полка",
    дивизии: "дивизии", бригады: "бригады",
  };
  if (DICT[wl]) {
    const gen = DICT[wl];
    return w[0] === w[0].toUpperCase() ? gen[0].toUpperCase() + gen.slice(1) : gen;
  }
  if (/[ыи]й$/iu.test(w)) return w.replace(/[ыи]й$/iu, (m) => (m[0] === "ы" ? "ого" : "его"));
  if (/ник$/iu.test(w)) return w + "а";
  if (/ист$/iu.test(w)) return w + "а";
  if (/ор$/iu.test(w)) return w + "а";
  return w;
}

export function toGenitivePhrase(phrase: string): string {
  const res = phrase
    .split(/\s+/)
    .map((t) => (/^\(/.test(t) ? t : toGenitiveWord(t)))
    .join(" ");
  return noWidows(res);
}


// ─── Форматирование персон ────────────────────────────────────────────────────

export interface PersonLike {
  full_name: string;
  rank?: string;
  position?: string;
}

export function getPersonInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 3) return `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`;
  if (parts.length === 2) return `${parts[0]} ${parts[1][0]}.`;
  return fullName;
}

/** «Фамилия И.О.» — для строк подписей */
export function getPersonLastNameInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 3) return `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`;
  if (parts.length === 2) return `${parts[0]} ${parts[1][0]}.`;
  return fullName;
}

/** Именительный: «командир первого взвода лейтенант Халупа А.И.» */
export function formatPersonNominative(p: PersonLike): string {
  const parts: string[] = [];
  if (p.position) parts.push(lcFirst(p.position));
  if (p.rank) parts.push(lcFirst(p.rank));
  parts.push(getPersonInitials(p.full_name));
  return noWidows(parts.join(" "));
}

/** Родительный: «командира первого взвода лейтенанта Халупы А.И.» */
export function formatPersonGenitive(p: PersonLike): string {
  const parts: string[] = [];
  if (p.position) parts.push(toGenitivePhrase(lcFirst(p.position)));
  if (p.rank) parts.push(toGenitivePhrase(lcFirst(p.rank)));
  const nameParts = p.full_name.trim().split(/\s+/);
  const lastNameGen = toGenitiveLastName(nameParts[0] ?? "");
  const initialsStr =
    nameParts.length >= 3
      ? `${lastNameGen} ${nameParts[1][0]}.${nameParts[2][0]}.`
      : nameParts.length === 2
        ? `${lastNameGen} ${nameParts[1][0]}.`
        : lastNameGen;
  parts.push(initialsStr);
  return noWidows(parts.join(" "));
}

// ─── Неразрывные пробелы (anti-widows) ───────────────────────────────────────

export const noWidows = (t: string): string => {
  if (!t) return t;
  // Находит слова от 1 до 3 букв и заменяет следующий за ними пробел на неразрывный
  return t.replace(
    /(^|\s|&nbsp;)([а-яА-ЯёЁ]{1,3})\s+/g,
    (_, prefix, word) => `${prefix}${word}\u00A0`
  );
};