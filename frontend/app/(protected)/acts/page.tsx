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

// ─── Матрица состояний (синхронизирована с route.ts) ─────────────────────────

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

function formatPersonForAct(p: Personnel): string {
  const role = lcFirst(p.position ?? p.rank ?? "");
  const initials = getPersonInitials(p.full_name);
  return role ? `${role} ${initials}` : initials;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Переключатель состояния одного элемента комплекта — 4 варианта. */
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

/** Строка одного элемента комплекта с полной матрицей состояний. */
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
  actType:                 ActType;
  year:                    string;
  surrendererLabel:        string;
  receiverLabel:           string;
  issuerLabel:             string;
  model:                   string;
  serial:                  string;
  kitItems:                KitItem[];
  defects:                 string;
  flashDriveNumbers:       string;
  passNumbers:             string;
  surrendererName:         string;
  receiverName:            string;
  issuerName:              string;
  receiverRankShort:       string;
  receiverLastNameInitials: string;
}

function conditionPhrase(c: Condition): string {
  switch (c) {
    case "ok":        return "";
    case "defective": return " (в неисправном состоянии)";
    case "absent":    return " (отсутствует)";
    case "cosmetic":  return " (имеет косметические дефекты)";
  }
}

function DocPreview({ data }: { data: PreviewData }) {
  const { actType, year, surrendererLabel, receiverLabel, issuerLabel,
    model, serial, kitItems, defects, flashDriveNumbers, passNumbers } = data;

  const isSdacha = actType === "sdacha";

  const kitStr = kitItems.map((it) => `${it.name}${conditionPhrase(it.condition)}`).join(", ");

  const hasDefective     = kitItems.some((i) => i.condition === "defective");
  const hasAbsent        = kitItems.some((i) => i.condition === "absent");
  const hasCosmetic      = kitItems.some((i) => i.condition === "cosmetic");
  const hasCustomDefects = !!defects.trim();

  let overallState: string;
  if (hasDefective || hasCustomDefects) {
    overallState = " — в неисправном состоянии (подробности см. Приложение)";
  } else if (hasAbsent) {
    overallState = " — передаётся в неполном комплекте; отсутствующие позиции зафиксированы выше";
  } else if (hasCosmetic) {
    overallState = " — в исправном состоянии; имеются косметические дефекты";
  } else if (!isSdacha) {
    overallState = " — в исправном состоянии";
  } else {
    overallState = "";
  }

  const actionLabel = actType === "sdacha" ? "Сдал:" : "Выдал:";
  const actionName  = actType === "sdacha" ? data.surrendererName || "___________" : data.issuerName || "___________";

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
          АКТ<br />приёма-передачи в эксплуатацию<br />оборудования
        </div>

        <div style={{ marginTop: "8px" }}>
          г. Санкт-Петербург
          <span style={{ display: "inline-block", width: "200px" }} />
          «___»___________ {year || "____"} г.
        </div>
        <div style={{ height: "16px" }} />

        {/* Вводная часть */}
        <div style={{ textIndent: "1.25cm", textAlign: "justify" }}>
          {isSdacha ? (
            <>Настоящий акт составлен в том, что{" "}
              <strong>{receiverLabel || "___________"}</strong> принял от{" "}
              <strong>{surrendererLabel || "___________"}</strong>, который(-ая) сдал нижеперечисленное имущество:</>
          ) : (
            <>Настоящий акт составлен в том, что{" "}
              <strong>{receiverLabel || "___________"}</strong> принял от{" "}
              <strong>{issuerLabel || "___________"}</strong>, который(-ая) выдал нижеперечисленное имущество:</>
          )}
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
          <div>{actionLabel} <u>{actionName}</u> /_______________</div>
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
                .map((item, idx) => (
                  <div key={item.id}>
                    {idx + 1}. {item.name} — {CONDITION_LABEL[item.condition].toLowerCase()}
                    {item.defectNote ? `: ${item.defectNote}` : ""}.
                  </div>
                ))}
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
        // Формируем payload с новым форматом kitItems
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
          surrendererRank:   lcFirst(surrenderer?.position ?? surrenderer?.rank ?? ""),
          surrendererName:   surrenderer ? getPersonInitials(surrenderer.full_name) : "",
          receiverRank:      lcFirst(receiver?.position ?? receiver?.rank ?? ""),
          receiverName:      receiver ? getPersonInitials(receiver.full_name) : "",
          issuerRank:        lcFirst(issuer?.position ?? issuer?.rank ?? ""),
          issuerName:        issuer ? getPersonInitials(issuer.full_name) : "",
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
    actType:                 form.actType,
    year:                    form.year,
    surrendererLabel:        surrenderer ? formatPersonForAct(surrenderer) : "",
    receiverLabel:           receiver ? formatPersonForAct(receiver) : "",
    issuerLabel:             issuer ? formatPersonForAct(issuer) : "",
    model:                   effectiveModel,
    serial:                  effectiveSerial,
    kitItems:                form.kitItems,
    defects:                 form.defects,
    flashDriveNumbers:       selectedFlashNumbers,
    passNumbers:             selectedPassNumbers,
    surrendererName:         surrenderer ? getPersonInitials(surrenderer.full_name) : "",
    receiverName:            receiver ? getPersonInitials(receiver.full_name) : "",
    issuerName:              issuer ? getPersonInitials(issuer.full_name) : "",
    receiverRankShort:       receiver?.rank?.split(" ").at(-1) ?? "рядовой",
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

            {/* Комплектация с матрицей состояний */}
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-semibold text-slate-200">Комплектация</h2>
                </div>
                <div className="flex gap-1 items-center text-xs text-slate-500">
                  <span className="hidden sm:inline">Состояние каждой позиции:</span>
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

              {/* Добавить позицию */}
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

            {/* Дефекты (свободный текст) */}
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
                  placeholder="Дефекты самого ноутбука (корпус, матрица и пр.) не отражённые в комплекте"
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

            {/* Кнопка генерации */}
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