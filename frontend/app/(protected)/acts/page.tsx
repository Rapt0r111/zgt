"use client";

import { useTransition, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, Download, ArrowUpFromLine, ArrowDownToLine, ArrowLeft,
  ChevronDown, ChevronUp, RefreshCw, Shield, User, Cpu, CalendarDays,
  Package, AlertCircle, Database, PenLine, HardDrive, CreditCard,
  Plus, Trash2,
} from "lucide-react";
import Link from "next/link";
import { personnelApi } from "@/lib/api/personnel";
import { equipmentApi } from "@/lib/api/equipment";
import { storageAndPassesApi } from "@/lib/api/storage-and-passes";
import type { Personnel } from "@/types/personnel";
import type { ActType } from "@/types/acts";
import { Button } from "@/components/ui/button";
import { PersonnelSelect } from "@/components/shared/personnel-select";
import { EquipmentSelect } from "@/components/shared/equipment-select";
import { StorageAndPassSelect } from "@/components/shared/storage-and-pass-select";

// ─── Матрица состояний ────────────────────────────────────────────────────────

const CONDITION_VALUES = ["ok", "defective", "absent", "cosmetic"] as const;
type Condition = (typeof CONDITION_VALUES)[number];

const CONDITION_LABEL: Record<Condition, string> = {
  ok:        "Исправно",
  defective: "Неисправно",
  absent:    "Отсутствует",
  cosmetic:  "Косм. дефекты",
};

const CONDITION_COLOR: Record<Condition, string> = {
  ok:        "bg-emerald-600/20 border-emerald-500/50 text-emerald-300",
  defective: "bg-red-600/20 border-red-500/50 text-red-300",
  absent:    "bg-slate-600/20 border-slate-500/50 text-slate-400",
  cosmetic:  "bg-amber-600/20 border-amber-500/50 text-amber-300",
};

/**
 * Таблица грамматического рода часто встречающихся позиций.
 * Используется для правильного согласования состояний в предпросмотре.
 */
const ITEM_GENDER: Record<string, "m" | "f" | "n"> = {
  "ноутбук":               "m",
  "зарядное устройство":   "n",
  "компьютерная мышь":     "f",
  "мышь":                  "f",
  "сумка для ноутбука":    "f",
  "сумка":                 "f",
  "usb-концентратор":      "m",
  "кабель питания":        "m",
  "кабель":                "m",
  "адаптер питания":       "m",
  "адаптер":               "m",
  "блок питания":          "m",
};

function getItemGender(name: string): "m" | "f" | "n" {
  return ITEM_GENDER[name.toLowerCase().trim()] ?? "n";
}

const CONDITION_ADJECTIVE: Record<Condition, Record<"m" | "f" | "n", string>> = {
  ok:        { m: "исправен",   f: "исправна",   n: "исправно"   },
  defective: { m: "неисправен", f: "неисправна", n: "неисправно" },
  absent:    { m: "отсутствует", f: "отсутствует", n: "отсутствует" },
  cosmetic:  { m: "имеет косметические дефекты", f: "имеет косметические дефекты", n: "имеет косметические дефекты" },
};

function conditionPhrase(c: Condition, name: string): string {
  if (c === "ok") return "";
  const gender = getItemGender(name);
  return ` (${CONDITION_ADJECTIVE[c][gender]})`;
}

// ─── Константы ────────────────────────────────────────────────────────────────

const COMMANDER = { rank: "капитан", sign: "С. Тарасенко" } as const;

const DEFAULT_KIT_ITEMS: KitItem[] = [
  { id: crypto.randomUUID(), name: "ноутбук",               condition: "ok", defectNote: "" },
  { id: crypto.randomUUID(), name: "компьютерная мышь",     condition: "ok", defectNote: "" },
  { id: crypto.randomUUID(), name: "сумка для ноутбука",    condition: "ok", defectNote: "" },
];

const KIT_PRESETS = [
  "ноутбук",
  "зарядное устройство",
  "компьютерная мышь",
  "сумка для ноутбука",
  "USB-концентратор",
  "кабель питания",
] as const;

// ─── Типы ─────────────────────────────────────────────────────────────────────

interface KitItem {
  id: string;
  name: string;
  condition: Condition;
  defectNote: string;
}

interface FormState {
  actType:           ActType;
  surrenderPersonId: number | undefined;
  receiverPersonId:  number | undefined;
  issuerPersonId:    number | undefined;
  equipmentId:       number | undefined;
  customSerial:      string;
  customModel:       string;
  kitItems:          KitItem[];
  defects:           string;
  flashDriveIds:     number[];
  passIds:           number[];
  year:              string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lcFirst(s: string): string {
  if (!s) return s;
  return /[А-ЯЁ]/.test(s[0]) ? s[0].toLowerCase() + s.slice(1) : s;
}

function getPersonInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 3) return `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`;
  if (parts.length === 2) return `${parts[0]} ${parts[1][0]}.`;
  return fullName;
}

function getPersonLastNameInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length >= 2 ? `${parts[1]?.[0] ?? ""}. ${parts[0]}` : fullName;
}

/**
 * Именительный падеж: «оператор роты (научной) рядовой Галданов Г.Ж.»
 * Формат: [должность] [звание] Фамилия И.О.
 * Используется в строках подписей.
 */
function formatPersonNominative(p: Personnel): string {
  const position = p.position ? lcFirst(p.position) : "";
  const rank     = p.rank     ? lcFirst(p.rank)     : "";
  const initials = getPersonInitials(p.full_name);
  const prefix   = [position, rank].filter(Boolean).join(" ");
  return prefix ? `${prefix} ${initials}` : initials;
}

/**
 * Родительный падеж: «оператора роты (научной) рядового Галданова Г.Ж.»
 * Формат: [должность_род] [звание_род] Фамилия_род И.О.
 *
 * Для должности и звания применяем эвристику склонения окончаний.
 * Фамилия склоняется отдельной функцией.
 */

/** Склоняет мужскую фамилию в родительный падеж. */
/**
 * Склоняет мужскую фамилию в родительный падеж.
 *
 * Несклоняемые случаи (возвращаем без изменений):
 *   — фамилии на -о/-е/-э (украинские/белорусские): Тарасенко, Шевченко, Коваленко
 *   — фамилии на -а с предшествующей гласной: Халупа, Голуба — не склоняются как мужские
 *     (их склонение совпадает с женским, и для акта приёма-передачи мужчин оставляем неизменными)
 *   — короткие фамилии-аббревиатуры, иностранные
 */
function toGenitiveLastName(lastName: string): string {
  // Украинские/белорусские несклоняемые окончания: -ко, -ло, -но, -то, -ро, -во, -хо, -жо и т.д.
  if (/[кнлтрвхжшщзсдбпмф]о$/iu.test(lastName)) return lastName;
  // Окончания на -е/-э (типа Гёте, Белье)
  if (/[еэ]$/iu.test(lastName)) return lastName;

  // Стандартные русские окончания
  if (/[оеё]в$/iu.test(lastName))  return lastName + "а";
  if (/[оеё]вич$/iu.test(lastName)) return lastName + "а";
  if (/[иы]н$/iu.test(lastName))   return lastName + "а";
  if (/ский$/iu.test(lastName))    return lastName.replace(/ский$/iu,  "ского");
  if (/цкий$/iu.test(lastName))    return lastName.replace(/цкий$/iu,  "цкого");
  if (/жий$/iu.test(lastName))     return lastName.replace(/жий$/iu,   "жего");
  if (/шний$/iu.test(lastName))    return lastName.replace(/шний$/iu,  "шнего");
  if (/жный$/iu.test(lastName))    return lastName.replace(/жный$/iu,  "жного");
  if (/ный$/iu.test(lastName))     return lastName.replace(/ный$/iu,   "ного");
  if (/ой$/iu.test(lastName))      return lastName.replace(/ой$/iu,    "ого");
  if (/ий$/iu.test(lastName))      return lastName.replace(/ий$/iu,    "его");
  // Фамилии на согласную (Борт, Смит, Резник и т.д.)
  if (/[бвгджзклмнпрстфхцчшщ]$/iu.test(lastName)) return lastName + "а";
  // Мужские фамилии на -жа/-ша/-ча/-ща → родительный на -и (шипящая + а):
  // Горожа→Горожи, Стрельча→Стрельчи  (ДОЛЖНО БЫТЬ ДО общего правила на -а!)
  if (/[жшщч]а$/iu.test(lastName)) return lastName.replace(/а$/u, "и");
  // Мужские фамилии на согласную + -а → родительный на -ы (1-е склонение):
  // Халупа→Халупы, Голуба→Голубы, Зима→Зимы, Мороза→Морозы
  // Украинские на -ко/-но и т.д. уже отсечены первым правилом выше
  if (/[бвгджзклмнпрстфхцчшщ]а$/iu.test(lastName)) return lastName.replace(/а$/u, "ы");
  // Всё остальное — не склоняем (гласная + а, -я, -ь, иностранные)
  return lastName;
}

/**
 * Склоняет отдельное слово (звание / слово должности) в родительный падеж.
 * Покрывает наиболее частотные воинские звания и слова должностей.
 */
function toGenitiveWord(word: string): string {
  const w = word.trim();
  const wl = w.toLowerCase();

  // Словарь часто встречающихся целых слов (звания, должности)
  const DICT: Record<string, string> = {
    // Воинские звания
    "маршал":              "маршала",
    "генерал":             "генерала",
    "полковник":           "полковника",
    "подполковник":        "подполковника",
    "майор":               "майора",
    "капитан":             "капитана",
    "лейтенант":           "лейтенанта",
    "прапорщик":           "прапорщика",
    "старшина":            "старшины",
    "сержант":             "сержанта",
    "ефрейтор":            "ефрейтора",
    "рядовой":             "рядового",
    "курсант":             "курсанта",
    // Составные части воинских званий
    "старший":             "старшего",
    "младший":             "младшего",
    "генерал-майор":       "генерал-майора",
    "генерал-лейтенант":   "генерал-лейтенанта",
    "генерал-полковник":   "генерал-полковника",
    "генерал-армии":       "генерала армии",
    "старший-лейтенант":   "старшего лейтенанта",
    "старший-прапорщик":   "старшего прапорщика",
    "старший-сержант":     "старшего сержанта",
    "младший-лейтенант":   "младшего лейтенанта",
    "младший-сержант":     "младшего сержанта",
    // Типовые слова должностей
    "оператор":            "оператора",
    "командир":            "командира",
    "начальник":           "начальника",
    "заместитель":         "заместителя",
    "офицер":              "офицера",
    "специалист":          "специалиста",
    "инженер":             "инженера",
    "техник":              "техника",
    "связист":             "связиста",
    "программист":         "программиста",
    "аналитик":            "аналитика",
    "адъютант":            "адъютанта",
    "дежурный":            "дежурного",
    "писарь":              "писаря",
    "санинструктор":       "санинструктора",
    "водитель":            "водителя",
    "механик":             "механика",
    "снайпер":             "снайпера",
    "переводчик":          "переводчика",
    // Порядковые числительные (для «первого взвода», «второй роты» и т.д.)
    "первого":   "первого",   "первый":   "первого",
    "второго":   "второго",   "второй":   "второго",
    "третьего":  "третьего",  "третий":   "третьего",
    "четвёртого":"четвёртого","четвёртый":"четвёртого",
    "пятого":    "пятого",    "пятый":    "пятого",
    "шестого":   "шестого",   "шестой":   "шестого",
    "седьмого":  "седьмого",  "седьмой":  "седьмого",
    "восьмого":  "восьмого",  "восьмой":  "восьмого",
    "девятого":  "девятого",  "девятый":  "девятого",
    "десятого":  "десятого",  "десятый":  "десятого",
    // Существительные в составе должности
    "роты":      "роты",      "рота":     "роты",
    "взвода":    "взвода",    "взвод":    "взвода",
    "батальона": "батальона", "батальон": "батальона",
    "отделения": "отделения", "отделение":"отделения",
    "бригады":   "бригады",   "бригада":  "бригады",
    "полка":     "полка",     "полк":     "полка",
    "дивизии":   "дивизии",   "дивизия":  "дивизии",
  };

  if (DICT[wl]) {
    // Сохраняем регистр первой буквы оригинала
    const gen = DICT[wl];
    return w[0] === w[0].toUpperCase() ? gen[0].toUpperCase() + gen.slice(1) : gen;
  }

  // Общие правила для неизвестных слов
  if (/ый$/iu.test(w) || /ий$/iu.test(w)) return w.replace(/[ыи]й$/iu, (m) => m[0] === "ы" ? "ого" : "его");
  if (/ник$/iu.test(w)) return w + "а";
  if (/ист$/iu.test(w)) return w + "а";
  if (/ор$/iu.test(w))  return w + "а";
  if (/ер$/iu.test(w))  return w + "а";

  return w; // fallback — не склоняем
}

/**
 * Склоняет фразу (должность или звание) в родительный падеж пословно,
 * пропуская скобочные части типа «(научной)».
 */
function toGenitivePhrase(phrase: string): string {
  return phrase
    .split(/\s+/)
    .map((token) => {
      if (/^\(/.test(token)) return token; // скобки не склоняем
      return toGenitiveWord(token);
    })
    .join(" ");
}

function formatPersonGenitive(p: Personnel): string {
  const positionGen = p.position ? toGenitivePhrase(lcFirst(p.position)) : "";
  const rankGen     = p.rank     ? toGenitivePhrase(lcFirst(p.rank))     : "";
  const parts       = p.full_name.trim().split(/\s+/);
  const lastNameGen = toGenitiveLastName(parts[0] ?? "");
  const initialsStr = parts.length >= 3
    ? `${lastNameGen} ${parts[1][0]}.${parts[2][0]}.`
    : parts.length === 2
      ? `${lastNameGen} ${parts[1][0]}.`
      : lastNameGen;
  const prefix = [positionGen, rankGen].filter(Boolean).join(" ");
  return prefix ? `${prefix} ${initialsStr}` : initialsStr;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConditionToggle({
  value,
  onChange,
}: {
  value: Condition;
  onChange: (v: Condition) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {CONDITION_VALUES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`px-2 py-0.5 rounded text-xs border transition-all ${
            value === c
              ? CONDITION_COLOR[c]
              : "bg-slate-800/40 border-slate-700/40 text-slate-500 hover:border-slate-600 hover:text-slate-400"
          }`}
        >
          {CONDITION_LABEL[c]}
        </button>
      ))}
    </div>
  );
}

function KitItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: KitItem;
  onChange: (updated: KitItem) => void;
  onRemove: () => void;
}) {
  const needsNote = item.condition === "defective" || item.condition === "absent";

  return (
    <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          placeholder="Наименование позиции"
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none border-b border-slate-700/60 pb-0.5 focus:border-blue-500/60 transition-colors"
        />
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-600 hover:text-red-400 transition-colors p-0.5"
          title="Удалить позицию"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <ConditionToggle
        value={item.condition}
        onChange={(c) => onChange({ ...item, condition: c })}
      />

      {needsNote && (
        <input
          type="text"
          value={item.defectNote}
          onChange={(e) => onChange({ ...item, defectNote: e.target.value })}
          placeholder={
            item.condition === "absent"
              ? "Причина отсутствия (необязательно)"
              : "Описание неисправности"
          }
          className="w-full bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none border-b border-slate-700/40 pb-0.5 focus:border-amber-500/40 transition-colors"
        />
      )}
    </div>
  );
}

function MultiAssetSelect({
  label,
  icon: Icon,
  assetType,
  ids,
  onChange,
}: {
  label: string;
  icon: React.ElementType;
  assetType: "flash_drive" | "electronic_pass";
  ids: number[];
  onChange: (ids: number[]) => void;
}) {
  const slots = [...ids, undefined];
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      {slots.map((slotId, i) => (
        <StorageAndPassSelect
          key={i}
          assetType={assetType}
          value={slotId}
          onValueChange={(newId) => {
            const next = [...ids];
            if (newId === undefined) {
              next.splice(i, 1);
            } else if (i < ids.length) {
              next[i] = newId;
            } else {
              next.push(newId);
            }
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

// ─── Doc Preview ─────────────────────────────────────────────────────────────

interface PreviewData {
  actType:              ActType;
  year:                 string;
  surrendererLabel:     string;    // именительный — для строки «Сдал:»
  receiverLabel:        string;    // именительный — для строки «Принял:»
  issuerLabel:          string;    // именительный — для строки «Выдал:»
  surrendererGenLabel:  string;    // родительный  — для вводной части
  receiverGenLabel:     string;    // родительный
  issuerGenLabel:       string;    // родительный
  model:                string;
  serial:               string;
  kitItems:             KitItem[];
  defects:              string;
  flashDriveNumbers:    string;
  passNumbers:          string;
  surrendererName:      string;
  receiverName:         string;
  issuerName:           string;
  receiverRankShort:    string;
  receiverLastNameInitials: string;
}

function DocPreview({ data }: { data: PreviewData }) {
  const {
    actType, year, surrendererLabel, receiverLabel, issuerLabel,
    surrendererGenLabel, receiverGenLabel, issuerGenLabel,
    model, serial, kitItems, defects, flashDriveNumbers, passNumbers,
  } = data;

  const isSdacha = actType === "sdacha";

  // Перечень комплекта с правильными согласованиями
  const kitStr = kitItems.map((it) => `${it.name}${conditionPhrase(it.condition, it.name)}`).join(", ");

  // Определяем общее состояние для предпросмотра (та же логика, что в route.ts)
  const laptopItem = kitItems.find((i) => i.name.toLowerCase().trim() === "ноутбук");
  const hasLaptopDefect  = laptopItem && laptopItem.condition !== "ok";
  const hasCustomDefects = !!defects.trim();

  const peripheryItems = kitItems.filter((i) => i.name.toLowerCase().trim() !== "ноутбук");
  const hasPeripheryDefect   = peripheryItems.some((i) => i.condition === "defective");
  const hasPeripheryAbsent   = peripheryItems.some((i) => i.condition === "absent");
  const hasPeripheryCosmetic = peripheryItems.some((i) => i.condition === "cosmetic");

  let overallState: string;
  if (hasLaptopDefect || hasCustomDefects) {
    overallState = " — в неисправном состоянии (подробности см. Приложение)";
  } else if (hasPeripheryDefect) {
    overallState = " — ноутбук в исправном состоянии; неисправности периферии указаны в Приложении";
  } else if (hasPeripheryAbsent) {
    overallState = " — ноутбук в исправном состоянии; передаётся в неполном комплекте, отсутствующие позиции зафиксированы выше";
  } else if (hasPeripheryCosmetic) {
    overallState = " — ноутбук в исправном состоянии; отдельные позиции имеют косметические дефекты";
  } else if (!isSdacha) {
    overallState = " — в исправном состоянии";
  } else {
    overallState = "";
  }

  // Вводная часть акта:
  //   получатель — именительный («кто принял»)
  //   сдающий    — родительный  («принял от кого»)
  const thirdPartyGenLabel = isSdacha
    ? (surrendererGenLabel || surrendererLabel || "___________")
    : (issuerGenLabel      || issuerLabel      || "___________");
  // Именительный для получателя: «командир первого взвода лейтенант Халупа А.И.»
  const receiverNom = receiverLabel || "___________";
  const verb = isSdacha ? "сдал" : "выдал";

  // Строки подписей
  const actionLabel = isSdacha ? "Сдал:" : "Выдал:";
  const actionSignName = isSdacha
    ? (data.surrendererName || "___________")
    : (data.issuerName      || "___________");

  const showAppendix =
    kitItems.some((i) => i.condition === "defective" || i.condition === "absent") ||
    hasCustomDefects;

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-auto max-h-[600px]">
      <div className="text-black px-12 py-10"
        style={{ fontFamily: "Times New Roman, serif", fontSize: "12pt", lineHeight: "1.5", minWidth: "540px" }}>
        {/* Гриф */}
        <div style={{ textAlign: "right", marginLeft: "55%" }}>
          <div>УТВЕРЖДАЮ</div>
          <div>Командир роты (научной)</div>
          <div>{COMMANDER.rank}</div>
          <div style={{ marginTop: "6px" }}>{COMMANDER.sign}</div>
          <div>«___» ________ {year || "____"} г.</div>
        </div>
        <div style={{ height: "24px" }} />

        <div style={{ textAlign: "center", fontWeight: "bold", lineHeight: "1.4" }}>
          АКТ<br />приёма-передачи оборудования
        </div>

        <div style={{ marginTop: "8px" }}>
          г. Санкт-Петербург
          <span style={{ display: "inline-block", width: "200px" }} />
          «___»___________ {year || "____"} г.
        </div>
        <div style={{ height: "16px" }} />

        {/* Вводная часть */}
        <div style={{ textIndent: "1.25cm", textAlign: "justify" }}>
          Настоящий акт составлен о том, что{" "}
          <strong>{receiverNom}</strong> принял от{" "}
          <strong>{thirdPartyGenLabel}</strong>, который {verb} нижеперечисленное имущество:
        </div>
        <div style={{ height: "8px" }} />

        {/* Пункт 1 */}
        <div style={{ textIndent: "1.25cm", textAlign: "justify" }}>
          1. Ноутбук «{model || "___________"}» (серийный номер: {serial || "___________"};
          в комплекте: {kitStr || "___________"}){overallState}.
        </div>

        {/* Пункт 2 */}
        {(passNumbers || !isSdacha) && (
          <div style={{ marginLeft: "1.25cm" }}>
            2. Электронный пропуск № {passNumbers || "[ДАННЫЕ ОТСУТСТВУЮТ]"}.
          </div>
        )}

        {/* Пункт 3 */}
        {(flashDriveNumbers || !isSdacha) && (
          <div style={{ marginLeft: "1.25cm" }}>
            3. USB-накопитель МО РФ № {flashDriveNumbers || "[ДАННЫЕ ОТСУТСТВУЮТ]"}.
          </div>
        )}

        <div style={{ height: "16px" }} />

        {/* Подписи */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>{actionLabel} <u>{actionSignName}</u> /_______________</div>
          <div>«___»___________ {year || "____"} г.</div>
        </div>
        <div style={{ height: "16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>Принял: <u>{data.receiverName || "___________"}</u> /_______________</div>
          <div>«___»___________ {year || "____"} г.</div>
        </div>

        {/* Приложение */}
        {showAppendix && (
          <>
            <div style={{ borderTop: "1px dashed #999", marginTop: "24px", paddingTop: "16px" }} />
            <div style={{ textAlign: "center", fontWeight: "bold" }}>Приложение</div>
            <div style={{ textIndent: "1.25cm", marginTop: "8px" }}>
              Перечень неисправностей ноутбука «{model}», серийный номер: {serial}:
            </div>
            <div style={{ marginLeft: "1.25cm", marginTop: "8px" }}>
              {kitItems
                .filter((i) => i.condition === "defective" || i.condition === "absent")
                .map((item, idx) => {
                  const gender = getItemGender(item.name);
                  const stateWord = CONDITION_ADJECTIVE[item.condition][gender];
                  return (
                    <div key={item.id}>
                      {idx + 1}. {item.name} — {stateWord}
                      {item.defectNote ? `: ${item.defectNote}` : ""}.
                    </div>
                  );
                })}
              {hasCustomDefects && (
                <div>
                  {kitItems.filter((i) => i.condition === "defective" || i.condition === "absent").length + 1}.
                  Прочие дефекты: {defects}.
                </div>
              )}
            </div>
            <div style={{ marginTop: "12px", fontSize: "11pt" }}>
              Принимающая сторона подтверждает, что перечисленные дефекты выявлены совместно
              и не могут служить основанием для претензий относительно состояния оборудования
              на момент его приёма.
            </div>
            <div style={{ marginTop: "12px" }}>С перечнем ознакомлен и согласен:</div>
            <div style={{ marginTop: "8px" }}>{data.receiverRankShort || "рядовой"}</div>
            <div style={{ textAlign: "right" }}>{data.receiverLastNameInitials || "___________"}</div>
            <div>«___» ___________ {year || "____"} г.</div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Form State ───────────────────────────────────────────────────────────────

const initialState: FormState = {
  actType:           "sdacha",
  surrenderPersonId: undefined,
  receiverPersonId:  undefined,
  issuerPersonId:    undefined,
  equipmentId:       undefined,
  customSerial:      "",
  customModel:       "",
  kitItems:          DEFAULT_KIT_ITEMS,
  defects:           "",
  flashDriveIds:     [],
  passIds:           [],
  year:              new Date().getFullYear().toString(),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActsPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [showPreview, setShowPreview] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [generateError, setGenerateError] = useState<string | null>(null);

  const setField = useCallback(
    <K extends keyof FormState>(key: K) =>
      (value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const { data: personnelData, isLoading: personnelLoading } = useQuery({
    queryKey: ["personnel", { limit: 1000 }],
    queryFn:  () => personnelApi.getList({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: equipmentData } = useQuery({
    queryKey: ["equipment", { limit: 1000 }],
    queryFn:  () => equipmentApi.getList({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: flashData } = useQuery({
    queryKey: ["storage-and-passes", { asset_type: "flash_drive", limit: 1000 }],
    queryFn:  () => storageAndPassesApi.getList({ asset_type: "flash_drive", limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: passData } = useQuery({
    queryKey: ["storage-and-passes", { asset_type: "electronic_pass", limit: 1000 }],
    queryFn:  () => storageAndPassesApi.getList({ asset_type: "electronic_pass", limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const personnel = personnelData?.items ?? [];
  const getPerson = (id: number | undefined): Personnel | undefined =>
    id != null ? personnel.find((p) => p.id === id) : undefined;

  const selectedEquipment = useMemo(
    () => equipmentData?.items.find((e) => e.id === form.equipmentId),
    [equipmentData, form.equipmentId],
  );

  const effectiveModel  = selectedEquipment?.model
    ? [selectedEquipment.manufacturer, selectedEquipment.model].filter(Boolean).join(" ")
    : form.customModel;
  const effectiveSerial = selectedEquipment?.serial_number ?? form.customSerial;

  const selectedFlashNumbers = useMemo(() => {
    if (!flashData?.items || form.flashDriveIds.length === 0) return "";
    return form.flashDriveIds
      .map((id) => flashData.items.find((a) => a.id === id)?.serial_number)
      .filter(Boolean).join(", ");
  }, [flashData, form.flashDriveIds]);

  const selectedPassNumbers = useMemo(() => {
    if (!passData?.items || form.passIds.length === 0) return "";
    return form.passIds
      .map((id) => passData.items.find((a) => a.id === id)?.serial_number)
      .filter(Boolean).join(", ");
  }, [passData, form.passIds]);

  const surrenderer = getPerson(form.surrenderPersonId);
  const receiver    = getPerson(form.receiverPersonId);
  const issuer      = getPerson(form.issuerPersonId);

  // ─── Kit item управление ──────────────────────────────────────────────────

  const updateKitItem = useCallback((id: string, updated: KitItem) => {
    setForm((prev) => ({
      ...prev,
      kitItems: prev.kitItems.map((item) => item.id === id ? updated : item),
    }));
  }, []);

  const removeKitItem = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      kitItems: prev.kitItems.filter((item) => item.id !== id),
    }));
  }, []);

  const addKitItem = useCallback((name?: string) => {
    setForm((prev) => ({
      ...prev,
      kitItems: [
        ...prev.kitItems,
        { id: crypto.randomUUID(), name: name ?? "", condition: "ok", defectNote: "" },
      ],
    }));
  }, []);

  // ─── Валидация ────────────────────────────────────────────────────────────

  const canGenerate =
    effectiveModel.trim() !== "" &&
    effectiveSerial.trim() !== "" &&
    form.kitItems.length > 0 &&
    form.kitItems.every((it) => it.name.trim() !== "") &&
    (form.actType === "sdacha"
      ? form.surrenderPersonId != null && form.receiverPersonId != null
      : form.receiverPersonId != null && form.issuerPersonId != null);

  // ─── Генерация ────────────────────────────────────────────────────────────

  const handleGenerate = () => {
    if (!canGenerate || isPending) return;
    setGenerateError(null);

    startTransition(async () => {
      try {
        const payload = {
          actType:       form.actType,
          year:          form.year,
          commanderRank: COMMANDER.rank,
          commanderSign: COMMANDER.sign,
          equipmentName: effectiveModel,
          serialNumber:  effectiveSerial,
          kitItems: form.kitItems.map((item) => ({
            name:       item.name.trim(),
            condition:  item.condition,
            defectNote: item.defectNote.trim() || null,
          })),
          defects:           form.defects.trim() || null,
          flashDriveNumbers: selectedFlashNumbers || null,
          passNumbers:       selectedPassNumbers || null,

          // Именительный падеж — для строк подписей
          // Должность и звание передаём раздельно
          surrendererPosition: lcFirst(surrenderer?.position ?? ""),
          surrendererRank:     lcFirst(surrenderer?.rank ?? ""),
          surrendererName:     surrenderer ? getPersonInitials(surrenderer.full_name) : "",
          receiverPosition:    lcFirst(receiver?.position ?? ""),
          receiverRank:        lcFirst(receiver?.rank ?? ""),
          receiverName:        receiver ? getPersonInitials(receiver.full_name) : "",
          issuerPosition:      lcFirst(issuer?.position ?? ""),
          issuerRank:          lcFirst(issuer?.rank ?? ""),
          issuerName:          issuer ? getPersonInitials(issuer.full_name) : "",

          // Родительный падеж — для вводной части «принял от …»
          surrendererGenitiveLabel: surrenderer ? formatPersonGenitive(surrenderer) : "",
          receiverGenitiveLabel:    receiver    ? formatPersonGenitive(receiver)    : "",
          issuerGenitiveLabel:      issuer      ? formatPersonGenitive(issuer)      : "",

          // Для Приложения
          receiverRankShort:           receiver?.rank?.split(" ").at(-1) ?? "рядовой",
          receiverLastNameInitials:    receiver ? getPersonLastNameInitials(receiver.full_name) : "",
        };

        const res = await fetch("/api/acts/generate", {
          method:      "POST",
          headers:     { "Content-Type": "application/json" },
          body:        JSON.stringify(payload),
          credentials: "include",
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Ошибка генерации документа");
        }

        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        const lastName =
          (form.actType === "sdacha" ? surrenderer : receiver)?.full_name.split(" ")[0] ?? "документ";
        a.href     = url;
        a.download = `акт_${form.actType === "sdacha" ? "сдачи" : "выдачи"}_ноутбука_${lastName}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        setGenerateError(e instanceof Error ? e.message : "Неизвестная ошибка");
      }
    });
  };

  const previewData: PreviewData = {
    actType:              form.actType,
    year:                 form.year,
    surrendererLabel:     surrenderer ? formatPersonNominative(surrenderer) : "",
    receiverLabel:        receiver    ? formatPersonNominative(receiver)    : "",
    issuerLabel:          issuer      ? formatPersonNominative(issuer)      : "",
    surrendererGenLabel:  surrenderer ? formatPersonGenitive(surrenderer)   : "",
    receiverGenLabel:     receiver    ? formatPersonGenitive(receiver)      : "",
    issuerGenLabel:       issuer      ? formatPersonGenitive(issuer)        : "",
    model:                effectiveModel,
    serial:               effectiveSerial,
    kitItems:             form.kitItems,
    defects:              form.defects,
    flashDriveNumbers:    selectedFlashNumbers,
    passNumbers:          selectedPassNumbers,
    surrendererName:      surrenderer ? getPersonInitials(surrenderer.full_name) : "",
    receiverName:         receiver    ? getPersonInitials(receiver.full_name)    : "",
    issuerName:           issuer      ? getPersonInitials(issuer.full_name)      : "",
    receiverRankShort:    receiver?.rank?.split(" ").at(-1) ?? "рядовой",
    receiverLastNameInitials: receiver ? getPersonLastNameInitials(receiver.full_name) : "",
  };

  const inputCls =
    "w-full rounded-lg px-3 py-2.5 text-sm transition-all focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 bg-slate-800/60 border border-slate-700/60 text-slate-100 placeholder-slate-600";
  const inputDbCls =
    "w-full rounded-lg px-3 py-2.5 text-sm transition-all focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 bg-slate-800/30 border border-slate-700/30 text-slate-300";
  const sectionCls =
    "bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 space-y-4";

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(String);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 text-foreground">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="mb-6">
          <Button variant="ghost" asChild
            className="mb-4 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад к панели
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Генерация актов</h1>
              <p className="text-muted-foreground mt-1">
                Формирование актов приёма-передачи оборудования
              </p>
            </div>
          </div>
        </div>

        {/* Тип документа */}
        <div className="mb-8">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            Тип документа
          </p>
          <div className="flex gap-3">
            {(["sdacha", "vydacha"] as const).map((type) => (
              <button key={type} type="button" onClick={() => setField("actType")(type)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border text-sm font-medium transition-all ${
                  form.actType === type
                    ? "bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-lg shadow-blue-900/20"
                    : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-slate-300 hover:border-slate-600"
                }`}>
                {type === "sdacha"
                  ? <ArrowUpFromLine className="w-4 h-4" />
                  : <ArrowDownToLine className="w-4 h-4" />}
                {type === "sdacha" ? "Акт сдачи оборудования" : "Акт выдачи оборудования"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Участники */}
            <div className={sectionCls}>
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200">Участники</h2>
              </div>
              {personnelLoading ? (
                <div className="text-slate-500 text-sm">Загрузка личного состава…</div>
              ) : form.actType === "sdacha" ? (
                <>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <ArrowUpFromLine className="w-3.5 h-3.5" />
                      Кто сдаёт
                    </label>
                    <PersonnelSelect value={form.surrenderPersonId}
                      onValueChange={setField("surrenderPersonId")}
                      placeholder="Выберите военнослужащего" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      Кто принимает
                    </label>
                    <PersonnelSelect value={form.receiverPersonId}
                      onValueChange={setField("receiverPersonId")}
                      placeholder="Выберите военнослужащего" />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <ArrowUpFromLine className="w-3.5 h-3.5" />
                      Кто выдаёт
                    </label>
                    <PersonnelSelect value={form.issuerPersonId}
                      onValueChange={setField("issuerPersonId")}
                      placeholder="Выберите ответственного" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      Кто принимает
                    </label>
                    <PersonnelSelect value={form.receiverPersonId}
                      onValueChange={setField("receiverPersonId")}
                      placeholder="Выберите военнослужащего" />
                  </div>
                </>
              )}
            </div>

            {/* Ноутбук */}
            <div className={sectionCls}>
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200">Ноутбук</h2>
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  <Database className="w-3.5 h-3.5" />
                  Выбрать из базы данных
                </label>
                <EquipmentSelect value={form.equipmentId}
                  onValueChange={(id) => setForm((prev) => ({
                    ...prev, equipmentId: id, customModel: "", customSerial: "",
                  }))}
                  placeholder="Поиск по модели, типу или номеру…" />
                {selectedEquipment && (
                  <p className="text-xs text-blue-400/70">
                    Модель и серийный номер заполнены из базы данных
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-700/60" />
                <span className="text-xs text-slate-600">или вручную</span>
                <div className="flex-1 h-px bg-slate-700/60" />
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    <PenLine className="w-3.5 h-3.5" />
                    Модель
                    {selectedEquipment && (
                      <span className="text-slate-600 normal-case font-normal tracking-normal">(заполнено из БД)</span>
                    )}
                  </label>
                  <input type="text" value={effectiveModel}
                    onChange={(e) => setForm((prev) => ({
                      ...prev, equipmentId: undefined, customModel: e.target.value,
                    }))}
                    placeholder="Aquarius Cmp NS685U R11"
                    className={selectedEquipment ? inputDbCls : inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    <Shield className="w-3.5 h-3.5" />
                    Серийный номер
                    {selectedEquipment && (
                      <span className="text-slate-600 normal-case font-normal tracking-normal">(заполнено из БД)</span>
                    )}
                  </label>
                  <input type="text" value={effectiveSerial}
                    onChange={(e) => setForm((prev) => ({
                      ...prev, equipmentId: undefined, customSerial: e.target.value,
                    }))}
                    placeholder="222081909046R-0210"
                    className={`font-mono ${selectedEquipment ? inputDbCls : inputCls}`} />
                </div>
              </div>
            </div>

            {/* Флешки и пропуска */}
            <div className={sectionCls}>
              <div className="flex items-center gap-2 mb-1">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200">Флешки и пропуска</h2>
                <span className="text-xs text-slate-500 ml-1">(необязательно)</span>
              </div>
              <MultiAssetSelect label="USB-накопители МО РФ" icon={HardDrive}
                assetType="flash_drive" ids={form.flashDriveIds} onChange={setField("flashDriveIds")} />
              <div className="h-px bg-slate-800/60" />
              <MultiAssetSelect label="Электронные пропуска" icon={CreditCard}
                assetType="electronic_pass" ids={form.passIds} onChange={setField("passIds")} />
            </div>

            {/* Комплектация */}
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-semibold text-slate-200">Комплектация</h2>
                </div>
                <div className="flex gap-1 items-center text-xs text-slate-500">
                  <span className="hidden sm:inline">Состояние:</span>
                  {CONDITION_VALUES.map((c) => (
                    <span key={c} className={`px-1.5 py-0.5 rounded border text-xs ${CONDITION_COLOR[c]}`}>
                      {CONDITION_LABEL[c]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {form.kitItems.map((item) => (
                  <KitItemRow
                    key={item.id}
                    item={item}
                    onChange={(updated) => updateKitItem(item.id, updated)}
                    onRemove={() => removeKitItem(item.id)}
                  />
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {KIT_PRESETS.filter(
                    (preset) => !form.kitItems.some((it) => it.name === preset),
                  ).map((preset) => (
                    <button key={preset} type="button" onClick={() => addKitItem(preset)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-slate-700/40 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all bg-slate-800/20">
                      <Plus className="w-3 h-3" />
                      {preset}
                    </button>
                  ))}
                  <button type="button" onClick={() => addKitItem()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-dashed border-slate-700/40 text-slate-600 hover:text-slate-400 hover:border-slate-500 transition-all">
                    <Plus className="w-3 h-3" />
                    Свою позицию
                  </button>
                </div>
              </div>
            </div>

            {/* Дефекты */}
            <div className={sectionCls}>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-slate-200">
                  Дополнительное описание дефектов
                </h2>
                <span className="text-xs text-slate-500 ml-1">(необязательно)</span>
              </div>
              <div className="space-y-1.5">
                <textarea value={form.defects} onChange={(e) => setField("defects")(e.target.value)}
                  placeholder="Дефекты корпуса, матрицы и пр., не отражённые в комплекте"
                  rows={2}
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none" />
                <p className="text-xs text-slate-600">
                  При наличии дефектов к акту автоматически добавляется Приложение.
                </p>
              </div>
            </div>

            {/* Год */}
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Год
                </label>
                <div className="relative">
                  <select value={form.year} onChange={(e) => setField("year")(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-100 appearance-none cursor-pointer focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all">
                    {yearOptions.map((y) => (
                      <option key={y} value={y} className="bg-slate-800">{y} г.</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Ошибка */}
            {generateError && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {generateError}
              </div>
            )}

            {/* Кнопка */}
            <button type="button" onClick={handleGenerate} disabled={!canGenerate || isPending}
              className={`w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-sm font-semibold transition-all ${
                canGenerate && !isPending
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 active:scale-[0.98]"
                  : "bg-slate-800/60 text-slate-600 cursor-not-allowed border border-slate-700/40"
              }`}>
              {isPending ? (
                <><RefreshCw className="w-4 h-4 animate-spin" />Формирование документа…</>
              ) : (
                <><Download className="w-4 h-4" />Сформировать и скачать DOCX</>
              )}
            </button>

            {!canGenerate && (
              <p className="text-xs text-slate-600 text-center">
                Заполните все обязательные поля и наименования позиций комплекта
              </p>
            )}
          </div>

          {/* Предпросмотр */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Предварительный просмотр
              </p>
              <button type="button" onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                {showPreview
                  ? <><ChevronUp className="w-3.5 h-3.5" />Свернуть</>
                  : <><ChevronDown className="w-3.5 h-3.5" />Развернуть</>}
              </button>
            </div>

            {showPreview && (
              <div className="rounded-2xl overflow-hidden border border-slate-700/40 shadow-2xl">
                <div className="bg-slate-800/60 border-b border-slate-700/40 px-4 py-2.5 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  <span className="text-xs text-slate-500 ml-2">
                    {form.actType === "sdacha" ? "Акт сдачи" : "Акт выдачи"} оборудования.docx
                  </span>
                </div>
                <DocPreview data={previewData} />
              </div>
            )}

            <div className="bg-slate-900/40 border border-slate-800/40 rounded-xl p-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                <span className="text-slate-400 font-medium">Формат документа:</span> A4, поля
                3 см / 0,6 см / 0,8 см / 1,2 см, шрифт Times New Roman 14 пт. При наличии
                позиций в состоянии «Неисправно» или «Отсутствует» к акту автоматически
                добавляется Приложение с перечнем дефектов и подписью принимающей стороны.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}