"use client";

import {
  useTransition,
  useState,
  useCallback,
  useMemo,
  useRef,
  memo, 
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, Download, ArrowUpFromLine, ArrowDownToLine, ArrowLeft,
  ChevronDown, ChevronUp, RefreshCw, Shield, User, Cpu, CalendarDays,
  Package, AlertCircle, Database, PenLine, HardDrive, CreditCard,
  Plus, Trash2, Camera, X, Hash, FileSignature,
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
import {
  CONDITION_VALUES,
  CONDITION_LABEL,
  CONDITION_COLOR,
  type Condition,
  type KitItem,
  type UploadedPhoto,
  KIT_PRESETS,
  COMMANDER,
  MONTHS_GEN,
  formatFullDate,
  parseDateString,
  buildKitString,
  computeOverallState,
  conditionPhrase,
  itemGoesToAppendix,
  CONDITION_ADJECTIVE,
  getItemGender,
  formatPersonNominative,
  formatPersonGenitive,
  getPersonInitials,
  getPersonLastNameInitials,
} from "@/lib/acts/shared";

// ─── Типы ─────────────────────────────────────────────────────────────────────

interface FormState {
  actType: ActType;
  actNumber: string;
  actDay: string;
  actMonth: string;
  year: string;
  basisDoc: string;
  surrenderPersonId: number | undefined;
  receiverPersonId: number | undefined;
  issuerPersonId: number | undefined;
  equipmentId: number | undefined;
  customSerial: string;
  customModel: string;
  kitItems: KitItem[];
  defects: string;
  flashDriveIds: number[];
  passIds: number[];
  photos: UploadedPhoto[];
}

// ─── Начальное состояние ─────────────────────────────────────────────────────

function makeDefaultKitItems(): KitItem[] {
  return [
    { id: crypto.randomUUID(), name: "ноутбук", condition: "ok", defectNote: "" },
    { id: crypto.randomUUID(), name: "компьютерная мышь", condition: "ok", defectNote: "" },
    { id: crypto.randomUUID(), name: "сумка для ноутбука", condition: "ok", defectNote: "" },
  ];
}

function makeInitialState(): FormState {
  const now = new Date();
  return {
    actType: "sdacha",
    actNumber: "",
    actDay: String(now.getDate()).padStart(2, "0"),
    actMonth: String(now.getMonth() + 1).padStart(2, "0"),
    year: String(now.getFullYear()),
    basisDoc: "",
    surrenderPersonId: undefined,
    receiverPersonId: undefined,
    issuerPersonId: undefined,
    equipmentId: undefined,
    customSerial: "",
    customModel: "",
    kitItems: makeDefaultKitItems(),
    defects: "",
    flashDriveIds: [],
    passIds: [],
    photos: [],
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ConditionToggle = memo(function ConditionToggle({
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
});

const KitItemRow = memo(function KitItemRow({
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
      <ConditionToggle value={item.condition} onChange={(c) => onChange({ ...item, condition: c })} />
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
});

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
            if (newId === undefined) next.splice(i, 1);
            else if (i < ids.length) next[i] = newId;
            else next.push(newId);
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

// ─── Photo Upload ─────────────────────────────────────────────────────────────

/**
 * Ресайзит изображение на клиенте до max 1200×900 перед отправкой.
 * Сокращает размер payload и финального docx.
 */
function resizeImage(file: File, maxW = 1200, maxH = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(e.target!.result as string); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function PhotoUpload({
  photos,
  onChange,
}: {
  photos: UploadedPhoto[];
  onChange: (p: UploadedPhoto[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const newPhotos: UploadedPhoto[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const dataUrl = await resizeImage(file);
        newPhotos.push({ id: crypto.randomUUID(), file, dataUrl, caption: "" });
      } catch {
        // пропускаем файл при ошибке
      }
    }
    if (newPhotos.length > 0) onChange([...photos, ...newPhotos]);
  };

  const updateCaption = (id: string, caption: string) => {
    onChange(photos.map((p) => (p.id === id ? { ...p, caption } : p)));
  };

  const remove = (id: string) => {
    onChange(photos.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative group bg-slate-800/40 border border-slate-700/40 rounded-lg overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.dataUrl}
              alt={photo.caption || "Фото"}
              className="w-full h-32 object-cover"
            />
            <button
              type="button"
              onClick={() => remove(photo.id)}
              className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="p-2">
              <input
                type="text"
                value={photo.caption}
                onChange={(e) => updateCaption(photo.id, e.target.value)}
                placeholder="Подпись к фото"
                className="w-full bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none border-b border-slate-700/40 pb-0.5 focus:border-blue-500/40 transition-colors"
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-slate-700/60 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all text-sm"
      >
        <Camera className="w-4 h-4" />
        Добавить фотографии дефектов
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {photos.length > 0 && (
        <p className="text-xs text-slate-600">
          Фотографии будут добавлены в Приложение к акту. Рекомендуется добавлять подписи.
        </p>
      )}
    </div>
  );
}

// ─── Doc Preview ──────────────────────────────────────────────────────────────

interface PreviewData {
  actType: ActType;
  actNumber: string;
  fullDate: string;
  year: string;
  basisDoc: string;
  surrendererLabel: string;
  receiverLabel: string;
  issuerLabel: string;
  surrendererGenLabel: string;
  receiverGenLabel: string;
  issuerGenLabel: string;
  model: string;
  serial: string;
  kitItems: KitItem[];
  defects: string;
  flashDriveNumbers: string;
  passNumbers: string;
  surrendererName: string;
  receiverName: string;
  issuerName: string;
  receiverRankShort: string;
  receiverLastNameInitials: string;
  surrendererLastNameInitials: string;
  issuerLastNameInitials: string;
  photos: UploadedPhoto[];
}

/** Рендерит дату с подчёркиваниями для превью */
function PreviewDate({ dateStr }: { dateStr: string }) {
  const parsed = parseDateString(dateStr);
  if (!parsed) return <span>{dateStr}</span>;
  const { day, month, rest } = parsed;
  return (
    <span>
      <u>«{day}»</u> <u>{month}</u> {rest}
    </span>
  );
}

/** Строка подписи для превью */
function PreviewSignLine({
  label,
  initials,
  dateStr,
}: {
  label: string;
  initials: string;
  dateStr: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
      <div>
        <span style={{ whiteSpace: "pre" }}>{label}</span>
        <u>{initials || "___________"}</u>
        <span> /_______________</span>
      </div>
      <PreviewDate dateStr={dateStr} />
    </div>
  );
}

const DocPreview = memo(function DocPreview({ data }: { data: PreviewData }) {
  const {
    actType, actNumber, fullDate, year, basisDoc,
    surrendererLabel, receiverLabel, issuerLabel,
    surrendererGenLabel, receiverGenLabel, issuerGenLabel,
    model, serial, kitItems, defects, flashDriveNumbers, passNumbers, photos,
    receiverRankShort, receiverLastNameInitials,
    surrendererLastNameInitials, issuerLastNameInitials,
  } = data;

  const isSdacha = actType === "sdacha";
  const kitStr = buildKitString(kitItems);
  const hasCustomDefects = !!defects.trim();
  const { text: overallState, hasAppendix: showAppendix } = computeOverallState(
    kitItems,
    hasCustomDefects,
  );

  const thirdPartyGenLabel = isSdacha
    ? surrendererGenLabel || surrendererLabel || "___________"
    : issuerGenLabel || issuerLabel || "___________";

  const receiverNom = receiverLabel || "___________";
  const actionLabel = isSdacha ? "Сдал:       " : "Выдал:  ";
  const actionInitials = isSdacha ? surrendererLastNameInitials : issuerLastNameInitials;
  const actNumberStr = actNumber.trim() ? ` № ${actNumber.trim()}` : "";

  const appendixItems = kitItems.filter((i) => itemGoesToAppendix(i.condition));

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-auto max-h-[600px]">
      <div
        className="text-black px-12 py-10"
        style={{
          fontFamily: "Times New Roman, serif",
          fontSize: "12pt",
          lineHeight: "1.5",
          minWidth: "540px",
        }}
      >
        {/* Гриф УТВЕРЖДАЮ */}
        <div style={{ textAlign: "right", marginLeft: "55%" }}>
          <div>УТВЕРЖДАЮ</div>
          <div>Командир роты (научной)</div>
          <div>{COMMANDER.rank}</div>
          <div style={{ marginTop: "6px" }}>{COMMANDER.sign}</div>
          <PreviewDate dateStr={fullDate} />
        </div>
        <div style={{ height: "24px" }} />

        <div style={{ textAlign: "center", fontWeight: "bold", lineHeight: "1.4" }}>
          АКТ{actNumberStr}
          <br />
          приёма-передачи оборудования
        </div>

        <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between" }}>
          <span>г. Санкт-Петербург</span>
          <PreviewDate dateStr={fullDate} />
        </div>
        <div style={{ height: "16px" }} />

        {basisDoc.trim() && (
          <div style={{ marginBottom: "8px" }}>
            <strong>Основание:</strong> {basisDoc.trim()}.
          </div>
        )}

        <div style={{ textIndent: "1.25cm", textAlign: "justify" }}>
          Настоящий акт составлен о том, что <strong>{receiverNom}</strong> принял от{" "}
          <strong>{thirdPartyGenLabel}</strong> нижеперечисленное имущество:
        </div>
        <div style={{ height: "8px" }} />

        <div style={{ textIndent: "1.25cm", textAlign: "justify" }}>
          1. Ноутбук «{model || "___________"}» (серийный номер:{" "}
          {serial || "___________"}; в комплекте: {kitStr || "___________"})
          {overallState}.
        </div>

        {passNumbers && (
          <div style={{ marginLeft: "1.25cm" }}>
            2. Электронный пропуск № {passNumbers}.
          </div>
        )}
        {flashDriveNumbers && (
          <div style={{ marginLeft: "1.25cm" }}>
            3. USB-накопитель МО РФ № {flashDriveNumbers}.
          </div>
        )}

        <div style={{ height: "16px" }} />

        {/* Подписи */}
        <PreviewSignLine
          label={actionLabel}
          initials={actionInitials}
          dateStr={fullDate}
        />
        <PreviewSignLine
          label="Принял:  "
          initials={receiverLastNameInitials}
          dateStr={fullDate}
        />

        {/* Приложение */}
        {showAppendix && (
          <>
            <div
              style={{ borderTop: "1px dashed #999", marginTop: "24px", paddingTop: "16px" }}
            />
            <div style={{ textAlign: "center", fontWeight: "bold" }}>
              Приложение{actNumber.trim() ? ` к акту № ${actNumber.trim()}` : ""}
            </div>
            <div style={{ textIndent: "1.25cm", marginTop: "8px" }}>
              Перечень неисправностей ноутбука «{model}», серийный номер: {serial}:
            </div>
            <div style={{ marginLeft: "1.25cm", marginTop: "8px" }}>
              {appendixItems.map((item, idx) => {
                const gender = getItemGender(item.name);
                const stateWord = CONDITION_ADJECTIVE[item.condition][gender];
                return (
                  <div key={item.id}>
                    {idx + 1}. {item.name} – {stateWord}
                    {item.defectNote ? `: ${item.defectNote}` : ""}.
                  </div>
                );
              })}
              {hasCustomDefects && (
                <div>
                  {appendixItems.length + 1}. Прочие дефекты: {defects}.
                </div>
              )}
            </div>
            {photos.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontWeight: "bold", marginBottom: "8px" }}>Фотоматериалы:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {photos.map((photo, i) => (
                    <div key={photo.id} style={{ textAlign: "center" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.dataUrl}
                        alt={photo.caption}
                        style={{
                          width: "120px",
                          height: "90px",
                          objectFit: "cover",
                          border: "1px solid #ccc",
                        }}
                      />
                      <div style={{ fontSize: "9pt", color: "#666" }}>
                        Фото {i + 1}
                        {photo.caption ? `: ${photo.caption}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: "16px", fontSize: "11pt" }}>
              Принимающая сторона подтверждает, что указанные выше недостатки зафиксированы
              сторонами совместно и известны принимающей стороне на момент приёма имущества.
            </div>
            <div style={{ marginTop: "16px" }}>С перечнем ознакомлен и согласен:</div>
            <div style={{ marginTop: "8px" }}>{receiverRankShort || "рядовой"}</div>
            <div style={{ textAlign: "right" }}>
              <u>{receiverLastNameInitials || "___________"}</u>
            </div>
            <PreviewDate dateStr={fullDate} />
          </>
        )}
      </div>
    </div>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActsPage() {
  const [form, setForm] = useState<FormState>(makeInitialState);
  const [showPreview, setShowPreview] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [generateError, setGenerateError] = useState<string | null>(null);

  const setField = useCallback(
    <K extends keyof FormState>(key: K) =>
      (value: FormState[K]) =>
        setForm((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const { data: personnelData, isLoading: personnelLoading } = useQuery({
    queryKey: ["personnel", { limit: 1000 }],
    queryFn: () => personnelApi.getList({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: equipmentData } = useQuery({
    queryKey: ["equipment", { limit: 1000 }],
    queryFn: () => equipmentApi.getList({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: flashData } = useQuery({
    queryKey: ["storage-and-passes", { asset_type: "flash_drive", limit: 1000 }],
    queryFn: () => storageAndPassesApi.getList({ asset_type: "flash_drive", limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: passData } = useQuery({
    queryKey: ["storage-and-passes", { asset_type: "electronic_pass", limit: 1000 }],
    queryFn: () => storageAndPassesApi.getList({ asset_type: "electronic_pass", limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const personnel = personnelData?.items ?? [];
  const getPerson = useCallback(
    (id: number | undefined): Personnel | undefined =>
      id != null ? personnel.find((p) => p.id === id) : undefined,
    [personnel],
  );

  const selectedEquipment = useMemo(
    () => equipmentData?.items.find((e) => e.id === form.equipmentId),
    [equipmentData, form.equipmentId],
  );

  const effectiveModel = useMemo(
    () =>
      selectedEquipment?.model
        ? [selectedEquipment.manufacturer, selectedEquipment.model].filter(Boolean).join(" ")
        : form.customModel,
    [selectedEquipment, form.customModel],
  );

  const effectiveSerial = selectedEquipment?.serial_number ?? form.customSerial;

  const selectedFlashNumbers = useMemo(() => {
    if (!flashData?.items || form.flashDriveIds.length === 0) return "";
    return form.flashDriveIds
      .map((id) => flashData.items.find((a) => a.id === id)?.serial_number)
      .filter(Boolean)
      .join(", ");
  }, [flashData, form.flashDriveIds]);

  const selectedPassNumbers = useMemo(() => {
    if (!passData?.items || form.passIds.length === 0) return "";
    return form.passIds
      .map((id) => passData.items.find((a) => a.id === id)?.serial_number)
      .filter(Boolean)
      .join(", ");
  }, [passData, form.passIds]);

  const surrenderer = useMemo(() => getPerson(form.surrenderPersonId), [getPerson, form.surrenderPersonId]);
  const receiver = useMemo(() => getPerson(form.receiverPersonId), [getPerson, form.receiverPersonId]);
  const issuer = useMemo(() => getPerson(form.issuerPersonId), [getPerson, form.issuerPersonId]);

  const updateKitItem = useCallback((id: string, updated: KitItem) => {
    setForm((prev) => ({
      ...prev,
      kitItems: prev.kitItems.map((item) => (item.id === id ? updated : item)),
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
        { id: crypto.randomUUID(), name: name ?? "", condition: "ok" as Condition, defectNote: "" },
      ],
    }));
  }, []);

  const fullDate = useMemo(
    () => formatFullDate(form.actDay, form.actMonth, form.year),
    [form.actDay, form.actMonth, form.year],
  );

  const canGenerate = useMemo(
    () =>
      effectiveModel.trim() !== "" &&
      effectiveSerial.trim() !== "" &&
      form.kitItems.length > 0 &&
      form.kitItems.every((it) => it.name.trim() !== "") &&
      (form.actType === "sdacha"
        ? form.surrenderPersonId != null && form.receiverPersonId != null
        : form.receiverPersonId != null && form.issuerPersonId != null),
    [effectiveModel, effectiveSerial, form.kitItems, form.actType, form.surrenderPersonId, form.receiverPersonId, form.issuerPersonId],
  );

  const handleGenerate = () => {
    if (!canGenerate || isPending) return;
    setGenerateError(null);

    startTransition(async () => {
      try {
        const photosPayload = form.photos.map((p) => ({
          dataUrl: p.dataUrl,
          caption: p.caption,
        }));

        const payload = {
          actType: form.actType,
          actNumber: form.actNumber.trim(),
          fullDate,
          year: form.year,
          basisDoc: form.basisDoc.trim() || null,
          commanderRank: COMMANDER.rank,
          commanderSign: COMMANDER.sign,
          equipmentName: effectiveModel,
          serialNumber: effectiveSerial,
          kitItems: form.kitItems.map((item) => ({
            name: item.name.trim(),
            condition: item.condition,
            defectNote: item.defectNote.trim() || null,
          })),
          defects: form.defects.trim() || null,
          flashDriveNumbers: selectedFlashNumbers || null,
          passNumbers: selectedPassNumbers || null,
          photos: photosPayload,

          surrendererLabel: surrenderer ? formatPersonNominative(surrenderer) : "",
          receiverLabel: receiver ? formatPersonNominative(receiver) : "",
          issuerLabel: issuer ? formatPersonNominative(issuer) : "",

          surrendererGenitiveLabel: surrenderer ? formatPersonGenitive(surrenderer) : "",
          receiverGenitiveLabel: receiver ? formatPersonGenitive(receiver) : "",
          issuerGenitiveLabel: issuer ? formatPersonGenitive(issuer) : "",

          receiverRankShort: receiver?.rank?.split(" ").at(-1) ?? "рядовой",
          receiverLastNameInitials: receiver ? getPersonLastNameInitials(receiver.full_name) : "",
          surrendererLastNameInitials: surrenderer
            ? getPersonLastNameInitials(surrenderer.full_name)
            : "",
          issuerLastNameInitials: issuer ? getPersonLastNameInitials(issuer.full_name) : "",
        };

        const res = await fetch("/api/acts/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Ошибка генерации документа");
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const lastName =
          (form.actType === "sdacha" ? surrenderer : receiver)?.full_name.split(" ")[0] ??
          "документ";
        a.href = url;
        a.download = `акт_${form.actType === "sdacha" ? "сдачи" : "выдачи"}_ноутбука_${lastName}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        setGenerateError(e instanceof Error ? e.message : "Неизвестная ошибка");
      }
    });
  };

  // Мемоизированный previewData — пересчитывается только при изменении зависимостей
  const previewData = useMemo<PreviewData>(
    () => ({
      actType: form.actType,
      actNumber: form.actNumber,
      fullDate,
      year: form.year,
      basisDoc: form.basisDoc,
      surrendererLabel: surrenderer ? formatPersonNominative(surrenderer) : "",
      receiverLabel: receiver ? formatPersonNominative(receiver) : "",
      issuerLabel: issuer ? formatPersonNominative(issuer) : "",
      surrendererGenLabel: surrenderer ? formatPersonGenitive(surrenderer) : "",
      receiverGenLabel: receiver ? formatPersonGenitive(receiver) : "",
      issuerGenLabel: issuer ? formatPersonGenitive(issuer) : "",
      model: effectiveModel,
      serial: effectiveSerial,
      kitItems: form.kitItems,
      defects: form.defects,
      flashDriveNumbers: selectedFlashNumbers,
      passNumbers: selectedPassNumbers,
      surrendererName: surrenderer ? getPersonInitials(surrenderer.full_name) : "",
      receiverName: receiver ? getPersonInitials(receiver.full_name) : "",
      issuerName: issuer ? getPersonInitials(issuer.full_name) : "",
      receiverRankShort: receiver?.rank?.split(" ").at(-1) ?? "рядовой",
      receiverLastNameInitials: receiver ? getPersonLastNameInitials(receiver.full_name) : "",
      surrendererLastNameInitials: surrenderer
        ? getPersonLastNameInitials(surrenderer.full_name)
        : "",
      issuerLastNameInitials: issuer ? getPersonLastNameInitials(issuer.full_name) : "",
      photos: form.photos,
    }),
    [
      form.actType, form.actNumber, form.basisDoc, form.kitItems,
      form.defects, form.photos, form.year,
      fullDate, effectiveModel, effectiveSerial,
      selectedFlashNumbers, selectedPassNumbers,
      surrenderer, receiver, issuer,
    ],
  );

  const inputCls =
    "w-full rounded-lg px-3 py-2.5 text-sm transition-all focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 bg-slate-800/60 border border-slate-700/60 text-slate-100 placeholder-slate-600";
  const inputDbCls =
    "w-full rounded-lg px-3 py-2.5 text-sm transition-all focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 bg-slate-800/30 border border-slate-700/30 text-slate-300";
  const sectionCls =
    "bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 space-y-4";

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(String);
  const dayOptions = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const monthOptions = MONTHS_GEN.map((m, i) => ({
    value: String(i + 1).padStart(2, "0"),
    label: m,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 text-foreground">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="mb-6">
          <Button
            variant="ghost"
            asChild
            className="mb-4 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
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
              <button
                key={type}
                type="button"
                onClick={() => setField("actType")(type)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border text-sm font-medium transition-all ${
                  form.actType === type
                    ? "bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-lg shadow-blue-900/20"
                    : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-slate-300 hover:border-slate-600"
                }`}
              >
                {type === "sdacha" ? (
                  <ArrowUpFromLine className="w-4 h-4" />
                ) : (
                  <ArrowDownToLine className="w-4 h-4" />
                )}
                {type === "sdacha" ? "Акт сдачи оборудования" : "Акт выдачи оборудования"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="space-y-6">

            {/* Реквизиты акта */}
            <div className={sectionCls}>
              <div className="flex items-center gap-2 mb-1">
                <FileSignature className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200">Реквизиты акта</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    <Hash className="w-3.5 h-3.5" />
                    Номер акта{" "}
                    <span className="normal-case font-normal text-slate-500">(необязательно)</span>
                  </label>
                  <input
                    type="text"
                    value={form.actNumber}
                    onChange={(e) => setField("actNumber")(e.target.value)}
                    placeholder="например, 12"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Год
                  </label>
                  <div className="relative">
                    <select
                      value={form.year}
                      onChange={(e) => setField("year")(e.target.value)}
                      className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-100 appearance-none cursor-pointer focus:outline-none focus:border-blue-500/60 transition-all"
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y} className="bg-slate-800">
                          {y} г.
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Дата */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Дата акта
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <select
                      value={form.actDay}
                      onChange={(e) => setField("actDay")(e.target.value)}
                      className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-100 appearance-none cursor-pointer focus:outline-none focus:border-blue-500/60 transition-all"
                    >
                      {dayOptions.map((d) => (
                        <option key={d} value={d} className="bg-slate-800">
                          {d}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select
                      value={form.actMonth}
                      onChange={(e) => setField("actMonth")(e.target.value)}
                      className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-100 appearance-none cursor-pointer focus:outline-none focus:border-blue-500/60 transition-all"
                    >
                      {monthOptions.map(({ value, label }) => (
                        <option key={value} value={value} className="bg-slate-800">
                          {label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>
                <p className="text-xs text-slate-600">Итог: {fullDate}</p>
              </div>

              {/* Основание */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5" />
                  Основание{" "}
                  <span className="text-slate-600 normal-case font-normal">(необязательно)</span>
                </label>
                <input
                  type="text"
                  value={form.basisDoc}
                  onChange={(e) => setField("basisDoc")(e.target.value)}
                  placeholder="Приказ командира в/ч № … от …"
                  className={inputCls}
                />
              </div>
            </div>

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
                    <PersonnelSelect
                      value={form.surrenderPersonId}
                      onValueChange={setField("surrenderPersonId")}
                      placeholder="Выберите военнослужащего"
                    />
                    {surrenderer && (
                      <p className="text-xs text-slate-500">
                        ↳ В акте: {formatPersonGenitive(surrenderer)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      Кто принимает
                    </label>
                    <PersonnelSelect
                      value={form.receiverPersonId}
                      onValueChange={setField("receiverPersonId")}
                      placeholder="Выберите военнослужащего"
                    />
                    {receiver && (
                      <p className="text-xs text-slate-500">
                        ↳ В акте: {formatPersonNominative(receiver)}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <ArrowUpFromLine className="w-3.5 h-3.5" />
                      Кто выдаёт
                    </label>
                    <PersonnelSelect
                      value={form.issuerPersonId}
                      onValueChange={setField("issuerPersonId")}
                      placeholder="Выберите ответственного"
                    />
                    {issuer && (
                      <p className="text-xs text-slate-500">
                        ↳ В акте: {formatPersonGenitive(issuer)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      Кто принимает
                    </label>
                    <PersonnelSelect
                      value={form.receiverPersonId}
                      onValueChange={setField("receiverPersonId")}
                      placeholder="Выберите военнослужащего"
                    />
                    {receiver && (
                      <p className="text-xs text-slate-500">
                        ↳ В акте: {formatPersonNominative(receiver)}
                      </p>
                    )}
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
                <EquipmentSelect
                  value={form.equipmentId}
                  onValueChange={(id) =>
                    setForm((prev) => ({
                      ...prev,
                      equipmentId: id,
                      customModel: "",
                      customSerial: "",
                    }))
                  }
                  placeholder="Поиск по модели, типу или номеру…"
                />
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
                      <span className="text-slate-600 normal-case font-normal tracking-normal">
                        (заполнено из БД)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={effectiveModel}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        equipmentId: undefined,
                        customModel: e.target.value,
                      }))
                    }
                    placeholder="Aquarius Cmp NS685U R11"
                    className={selectedEquipment ? inputDbCls : inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    <Shield className="w-3.5 h-3.5" />
                    Серийный номер
                    {selectedEquipment && (
                      <span className="text-slate-600 normal-case font-normal tracking-normal">
                        (заполнено из БД)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={effectiveSerial}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        equipmentId: undefined,
                        customSerial: e.target.value,
                      }))
                    }
                    placeholder="222081909046R-0210"
                    className={`font-mono ${selectedEquipment ? inputDbCls : inputCls}`}
                  />
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
              <MultiAssetSelect
                label="USB-накопители МО РФ"
                icon={HardDrive}
                assetType="flash_drive"
                ids={form.flashDriveIds}
                onChange={setField("flashDriveIds")}
              />
              <div className="h-px bg-slate-800/60" />
              <MultiAssetSelect
                label="Электронные пропуска"
                icon={CreditCard}
                assetType="electronic_pass"
                ids={form.passIds}
                onChange={setField("passIds")}
              />
            </div>

            {/* Комплектация */}
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-semibold text-slate-200">Комплектация</h2>
                </div>
                <div className="flex gap-1 items-center text-xs text-slate-500">
                  {CONDITION_VALUES.map((c) => (
                    <span
                      key={c}
                      className={`px-1.5 py-0.5 rounded border text-xs ${CONDITION_COLOR[c]}`}
                    >
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
              <div className="flex flex-wrap gap-1.5">
                {KIT_PRESETS.filter(
                  (preset) => !form.kitItems.some((it) => it.name === preset),
                ).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addKitItem(preset)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-slate-700/40 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all bg-slate-800/20"
                  >
                    <Plus className="w-3 h-3" />
                    {preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => addKitItem()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-dashed border-slate-700/40 text-slate-600 hover:text-slate-400 hover:border-slate-500 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  Свою позицию
                </button>
              </div>
            </div>

            {/* Дефекты */}
            <div className={sectionCls}>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-slate-200">Дополнительные дефекты</h2>
                <span className="text-xs text-slate-500 ml-1">(необязательно)</span>
              </div>
              <textarea
                value={form.defects}
                onChange={(e) => setField("defects")(e.target.value)}
                placeholder="Дефекты корпуса, матрицы, царапины и пр., не отражённые выше"
                rows={2}
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 transition-all resize-none"
              />
            </div>

            {/* Фотографии */}
            <div className={sectionCls}>
              <div className="flex items-center gap-2 mb-1">
                <Camera className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200">Фотоматериалы</h2>
                <span className="text-xs text-slate-500 ml-1">(необязательно)</span>
              </div>
              <PhotoUpload photos={form.photos} onChange={setField("photos")} />
            </div>

            {/* Ошибка */}
            {generateError && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {generateError}
              </div>
            )}

            {/* Кнопка генерации */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate || isPending}
              className={`w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-sm font-semibold transition-all ${
                canGenerate && !isPending
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 active:scale-[0.98]"
                  : "bg-slate-800/60 text-slate-600 cursor-not-allowed border border-slate-700/40"
              }`}
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Формирование документа…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Сформировать и скачать DOCX
                </>
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
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPreview ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    Свернуть
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    Развернуть
                  </>
                )}
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
                <span className="text-slate-400 font-medium">Формат:</span> A4, поля 3/0.6/0.8/1.2 см,
                Times New Roman 14 пт. При дефектах – автоматическое Приложение с перечнем и
                подписью. Фотографии встраиваются в Приложение (оптимизированы до 1200×900 px).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}