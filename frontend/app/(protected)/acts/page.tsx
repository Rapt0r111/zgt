"use client";

import { useTransition, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, Download, ArrowUpFromLine, ArrowDownToLine, ArrowLeft,
  ChevronDown, ChevronUp, RefreshCw, Shield, User, Cpu, CalendarDays,
  Package, AlertCircle, Database, PenLine, HardDrive, CreditCard,
} from "lucide-react";
import Link from "next/link";
import { personnelApi } from "@/lib/api/personnel";
import { equipmentApi } from "@/lib/api/equipment";
import { storageAndPassesApi } from "@/lib/api/storage-and-passes";
import type { Personnel } from "@/types/personnel";
import type { StorageAndPass } from "@/types/storage-and-passes";
import type { ActPayload, ActType } from "@/types/acts";
import { Button } from "@/components/ui/button";
import { PersonnelSelect } from "@/components/shared/personnel-select";
import { EquipmentSelect } from "@/components/shared/equipment-select";
import { StorageAndPassSelect } from "@/components/shared/storage-and-pass-select";

// ─── Constants ───────────────────────────────────────────────────────────────

const COMMANDER = { rank: "капитан", sign: "С. Тарасенко" } as const;

const KIT_OPTIONS = [
  "ноутбук", "зарядное устройство", "компьютерная мышь",
  "сумка для ноутбука", "USB-хаб", "кабель питания",
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${checked ? "bg-blue-600 border-blue-500" : "bg-slate-800/60 border-slate-700 group-hover:border-slate-500"}`}
      >
        {checked && (
          <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );
}

function MultiAssetSelect({ label, icon: Icon, assetType, ids, onChange }: {
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
        <Icon className="w-3.5 h-3.5" />{label}
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

// ─── Doc Preview ─────────────────────────────────────────────────────────────

interface PreviewData {
  actType: ActType; year: string;
  surrendererLabel: string; receiverLabel: string; issuerLabel: string;
  model: string; serial: string; kit: string[]; defects: string;
  flashDriveNumbers: string; passNumbers: string;
  surrendererName: string; receiverName: string; issuerName: string;
  receiverRankShort: string; receiverLastNameInitials: string;
}

function DocPreview({ data }: { data: PreviewData }) {
  const { actType, year, surrendererLabel, receiverLabel, issuerLabel, model, serial, kit, defects, flashDriveNumbers, passNumbers } = data;
  let idx = 2;
  const passItem = passNumbers ? <div style={{ marginLeft: "1.25cm" }}>{idx++}. Электронный пропуск № {passNumbers}</div> : null;
  const flashItem = flashDriveNumbers ? <div style={{ marginLeft: "1.25cm" }}>{idx++}. USB-накопитель МО РФ № {flashDriveNumbers}</div> : null;

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-auto max-h-[600px]">
      <div className="text-black px-12 py-10" style={{ fontFamily: "Times New Roman, serif", fontSize: "12pt", lineHeight: "1.5", minWidth: "540px" }}>
        <div style={{ textAlign: "right", marginLeft: "55%" }}>
          <div>УТВЕРЖДАЮ</div>
          <div>Командир роты (научной)</div>
          <div>{COMMANDER.rank}</div>
          <div style={{ marginTop: "6px" }}>{COMMANDER.sign}</div>
          <div>«___» ________ {year || "____"} г.</div>
        </div>
        <div style={{ height: "24px" }} />
        <div style={{ textAlign: "center", fontWeight: "bold", lineHeight: "1.4" }}>АКТ<br />приема-передачи в эксплуатацию<br />оборудования</div>
        <div style={{ marginTop: "8px" }}>г. Санкт-Петербург<span style={{ display: "inline-block", width: "200px" }} />«___»___________ {year || "____"} г.</div>
        <div style={{ height: "16px" }} />
        <div style={{ textIndent: "1.25cm", textAlign: "justify" }}>
          {actType === "sdacha"
            ? <>Настоящий акт составлен в том, что <strong>{receiverLabel || "___________"}</strong> принял, а <strong>{surrendererLabel || "___________"}</strong> сдал нижеперечисленное имущество:</>
            : <>Настоящий акт составлен в том, что <strong>{receiverLabel || "___________"}</strong> принял, а <strong>{issuerLabel || "___________"}</strong> выдал нижеперечисленное имущество:</>}
        </div>
        <div style={{ height: "8px" }} />
        <div style={{ textIndent: "1.25cm", textAlign: "justify" }}>
          1. Ноутбук «{model || "___________"}» (серийный номер {serial || "___________"} в комплекте: {kit.length > 0 ? kit.join(", ") : "___________"})
          {actType === "vydacha" && (defects ? <> в исправном состоянии, за исключением {defects} (см. приложение).</> : " в исправном состоянии.")}
          {actType === "sdacha" && (defects ? <>, за исключением {defects} (см. приложение).</> : ".")}
        </div>
        {passItem}
        {flashItem}
        {actType === "vydacha" && !passNumbers && <div style={{ marginLeft: "1.25cm" }}>2. Электронный пропуск №</div>}
        {actType === "vydacha" && !flashDriveNumbers && <div style={{ marginLeft: "1.25cm" }}>3. USB-накопитель МО РФ №</div>}
        <div style={{ height: "16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>{actType === "sdacha" ? "Сдал:" : "Выдал:"} <u>{actType === "sdacha" ? (data.surrendererName || "___________") : (data.issuerName || "___________")}</u> /_______________</div>
          <div>«___»___________ {year || "____"} г.</div>
        </div>
        <div style={{ height: "16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>Принял: <u>{data.receiverName || "___________"}</u> /_______________</div>
          <div>«___»___________ {year || "____"} г.</div>
        </div>
        {defects && (
          <>
            <div style={{ borderTop: "1px dashed #999", marginTop: "24px", paddingTop: "16px" }} />
            <div style={{ textAlign: "center", fontWeight: "bold" }}>Приложение</div>
            <div style={{ textIndent: "1.25cm", marginTop: "8px" }}>Неисправности «{model}» №{serial}</div>
            <div style={{ marginTop: "16px" }}>Корректность подтверждаю:</div>
            <div>{data.receiverRankShort || "рядовой"}</div>
            <div style={{ textAlign: "right" }}>{data.receiverLastNameInitials || "___________"}</div>
            <div>«___» ___________ {year || "____"} г.</div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Form State ───────────────────────────────────────────────────────────────

interface FormState {
  actType: ActType;
  surrenderPersonId: number | undefined;
  receiverPersonId: number | undefined;
  issuerPersonId: number | undefined;
  equipmentId: number | undefined;
  customSerial: string;
  customModel: string;
  kit: string[];
  defects: string;
  flashDriveIds: number[];
  passIds: number[];
  year: string;
}

const initialState: FormState = {
  actType: "sdacha",
  surrenderPersonId: undefined,
  receiverPersonId: undefined,
  issuerPersonId: undefined,
  equipmentId: undefined,
  customSerial: "",
  customModel: "",
  kit: ["ноутбук", "компьютерная мышь", "сумка для ноутбука"],
  defects: "",
  flashDriveIds: [],
  passIds: [],
  year: new Date().getFullYear().toString(),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActsPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [showPreview, setShowPreview] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [generateError, setGenerateError] = useState<string | null>(null);

  const setField = useCallback(<K extends keyof FormState>(key: K) => (value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

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
  const getPerson = (id: number | undefined): Personnel | undefined => id != null ? personnel.find((p) => p.id === id) : undefined;

  const selectedEquipment = useMemo(
    () => equipmentData?.items.find((e) => e.id === form.equipmentId),
    [equipmentData, form.equipmentId],
  );

  const effectiveModel = selectedEquipment?.model
    ? [selectedEquipment.manufacturer, selectedEquipment.model].filter(Boolean).join(" ")
    : form.customModel;
  const effectiveSerial = selectedEquipment?.serial_number ?? form.customSerial;

  const selectedFlashNumbers = useMemo(() => {
    if (!flashData?.items || form.flashDriveIds.length === 0) return "";
    return form.flashDriveIds.map((id) => flashData.items.find((a) => a.id === id)?.serial_number).filter(Boolean).join(", ");
  }, [flashData, form.flashDriveIds]);

  const selectedPassNumbers = useMemo(() => {
    if (!passData?.items || form.passIds.length === 0) return "";
    return form.passIds.map((id) => passData.items.find((a) => a.id === id)?.serial_number).filter(Boolean).join(", ");
  }, [passData, form.passIds]);

  const surrenderer = getPerson(form.surrenderPersonId);
  const receiver = getPerson(form.receiverPersonId);
  const issuer = getPerson(form.issuerPersonId);

  const canGenerate =
    effectiveModel.trim() !== "" &&
    effectiveSerial.trim() !== "" &&
    form.kit.length > 0 &&
    (form.actType === "sdacha"
      ? form.surrenderPersonId != null && form.receiverPersonId != null
      : form.receiverPersonId != null && form.issuerPersonId != null);

  const handleGenerate = () => {
    if (!canGenerate || isPending) return;
    setGenerateError(null);

    startTransition(async () => {
      try {
        const payload: ActPayload = {
          actType: form.actType,
          year: form.year,
          commanderRank: COMMANDER.rank,
          commanderSign: COMMANDER.sign,
          equipmentName: effectiveModel,
          serialNumber: effectiveSerial,
          kit: form.kit.join(", "),
          defects: form.defects || null,
          flashDriveNumbers: selectedFlashNumbers || null,
          passNumbers: selectedPassNumbers || null,
          surrendererRank: lcFirst(surrenderer?.position ?? surrenderer?.rank ?? ""),
          surrendererName: surrenderer ? getPersonInitials(surrenderer.full_name) : "",
          receiverRank: lcFirst(receiver?.position ?? receiver?.rank ?? ""),
          receiverName: receiver ? getPersonInitials(receiver.full_name) : "",
          issuerRank: lcFirst(issuer?.position ?? issuer?.rank ?? ""),
          issuerName: issuer ? getPersonInitials(issuer.full_name) : "",
          receiverRankShort: receiver?.rank?.split(" ").at(-1) ?? "рядовой",
          receiverLastNameInitials: receiver ? getPersonLastNameInitials(receiver.full_name) : "",
        };

        const res = await fetch("/api/acts/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Ошибка генерации");
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const lastName = (form.actType === "sdacha" ? surrenderer : receiver)?.full_name.split(" ")[0] ?? "документ";
        a.href = url;
        a.download = `акт_${form.actType === "sdacha" ? "сдачи" : "выдачи"}_ноутбука_${lastName}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        setGenerateError(e instanceof Error ? e.message : "Неизвестная ошибка");
      }
    });
  };

  const previewData: PreviewData = {
    actType: form.actType,
    year: form.year,
    surrendererLabel: surrenderer ? formatPersonForAct(surrenderer) : "",
    receiverLabel: receiver ? formatPersonForAct(receiver) : "",
    issuerLabel: issuer ? formatPersonForAct(issuer) : "",
    model: effectiveModel,
    serial: effectiveSerial,
    kit: form.kit,
    defects: form.defects,
    flashDriveNumbers: selectedFlashNumbers,
    passNumbers: selectedPassNumbers,
    surrendererName: surrenderer ? getPersonInitials(surrenderer.full_name) : "",
    receiverName: receiver ? getPersonInitials(receiver.full_name) : "",
    issuerName: issuer ? getPersonInitials(issuer.full_name) : "",
    receiverRankShort: receiver?.rank?.split(" ").at(-1) ?? "рядовой",
    receiverLastNameInitials: receiver ? getPersonLastNameInitials(receiver.full_name) : "",
  };

  const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm transition-all focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 bg-slate-800/60 border border-slate-700/60 text-slate-100 placeholder-slate-600";
  const inputDbCls = "w-full rounded-lg px-3 py-2.5 text-sm transition-all focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 bg-slate-800/30 border border-slate-700/30 text-slate-300";
  const sectionCls = "bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 space-y-4";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 text-foreground">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
            <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Назад к панели</Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Генерация актов</h1>
              <p className="text-muted-foreground mt-1">Формирование актов приема-передачи оборудования</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Тип документа</p>
          <div className="flex gap-3">
            {(["sdacha", "vydacha"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setField("actType")(type)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border text-sm font-medium transition-all ${form.actType === type ? "bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-lg shadow-blue-900/20" : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-slate-300 hover:border-slate-600"}`}
              >
                {type === "sdacha" ? <ArrowUpFromLine className="w-4 h-4" /> : <ArrowDownToLine className="w-4 h-4" />}
                {type === "sdacha" ? "Акт сдачи оборудования" : "Акт выдачи оборудования"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Participants */}
            <div className={sectionCls}>
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200">Участники</h2>
              </div>
              {personnelLoading ? (
                <div className="text-slate-500 text-sm">Загрузка личного состава...</div>
              ) : form.actType === "sdacha" ? (
                <>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider"><ArrowUpFromLine className="w-3.5 h-3.5" />Кто сдаёт</label>
                    <PersonnelSelect value={form.surrenderPersonId} onValueChange={setField("surrenderPersonId")} placeholder="Выберите сотрудника" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider"><ArrowDownToLine className="w-3.5 h-3.5" />Кто принимает</label>
                    <PersonnelSelect value={form.receiverPersonId} onValueChange={setField("receiverPersonId")} placeholder="Выберите сотрудника" />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider"><ArrowUpFromLine className="w-3.5 h-3.5" />Кто выдаёт</label>
                    <PersonnelSelect value={form.issuerPersonId} onValueChange={setField("issuerPersonId")} placeholder="Выберите офицера" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider"><ArrowDownToLine className="w-3.5 h-3.5" />Кто принимает</label>
                    <PersonnelSelect value={form.receiverPersonId} onValueChange={setField("receiverPersonId")} placeholder="Выберите сотрудника" />
                  </div>
                </>
              )}
            </div>

            {/* Equipment */}
            <div className={sectionCls}>
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200">Ноутбук</h2>
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider"><Database className="w-3.5 h-3.5" />Выбрать из базы данных</label>
                <EquipmentSelect
                  value={form.equipmentId}
                  onValueChange={(id) => setForm((prev) => ({ ...prev, equipmentId: id, customModel: "", customSerial: "" }))}
                  placeholder="Поиск по модели, типу или номеру..."
                />
                {selectedEquipment && <p className="text-xs text-blue-400/70">Модель и серийный номер заполнены из базы данных</p>}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-700/60" /><span className="text-xs text-slate-600">или вручную</span><div className="flex-1 h-px bg-slate-700/60" />
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    <PenLine className="w-3.5 h-3.5" />Модель
                    {selectedEquipment && <span className="text-slate-600 normal-case font-normal tracking-normal">(заполнено из БД)</span>}
                  </label>
                  <input
                    type="text"
                    value={effectiveModel}
                    onChange={(e) => setForm((prev) => ({ ...prev, equipmentId: undefined, customModel: e.target.value }))}
                    placeholder="Aquarius Cmp NS685U R11"
                    className={selectedEquipment ? inputDbCls : inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    <Shield className="w-3.5 h-3.5" />Серийный номер
                    {selectedEquipment && <span className="text-slate-600 normal-case font-normal tracking-normal">(заполнено из БД)</span>}
                  </label>
                  <input
                    type="text"
                    value={effectiveSerial}
                    onChange={(e) => setForm((prev) => ({ ...prev, equipmentId: undefined, customSerial: e.target.value }))}
                    placeholder="222081909046R-0210"
                    className={`font-mono ${selectedEquipment ? inputDbCls : inputCls}`}
                  />
                </div>
              </div>
            </div>

            {/* Flash drives & passes */}
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200">Флешки и пропуска</h2>
                <span className="text-xs text-slate-500 ml-1">(необязательно)</span>
              </div>
              <MultiAssetSelect label="USB-накопители МО РФ" icon={HardDrive} assetType="flash_drive" ids={form.flashDriveIds} onChange={setField("flashDriveIds")} />
              <div className="h-px bg-slate-800/60" />
              <MultiAssetSelect label="Электронные пропуска" icon={CreditCard} assetType="electronic_pass" ids={form.passIds} onChange={setField("passIds")} />
            </div>

            {/* Kit */}
            <div className={sectionCls.replace("space-y-4", "")}>
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-semibold text-slate-200">Комплект поставки</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {KIT_OPTIONS.map((item) => (
                    <CheckboxField
                      key={item}
                      label={item}
                      checked={form.kit.includes(item)}
                      onChange={(checked) => setField("kit")(checked ? [...form.kit, item] : form.kit.filter((k) => k !== item))}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Defects */}
            <div className={sectionCls}>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-slate-200">Дефекты и неисправности</h2>
                <span className="text-xs text-slate-500 ml-1">(необязательно)</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Описание дефектов</label>
                <textarea
                  value={form.defects}
                  onChange={(e) => setField("defects")(e.target.value)}
                  placeholder="царапин и сломанного крепежа экрана"
                  rows={2}
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
                />
                <p className="text-xs text-slate-600">При наличии дефектов будет добавлено Приложение со второй страницей</p>
              </div>
            </div>

            {/* Year */}
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  <CalendarDays className="w-3.5 h-3.5" />Год
                </label>
                <div className="relative">
                  <select
                    value={form.year}
                    onChange={(e) => setField("year")(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-100 appearance-none cursor-pointer focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  >
                    {["2024", "2025", "2026", "2027"].map((y) => (
                      <option key={y} value={y} className="bg-slate-800">{y} г.</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {generateError && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{generateError}
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate || isPending}
              className={`w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-sm font-semibold transition-all ${canGenerate && !isPending ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 active:scale-[0.98]" : "bg-slate-800/60 text-slate-600 cursor-not-allowed border border-slate-700/40"}`}
            >
              {isPending
                ? <><RefreshCw className="w-4 h-4 animate-spin" />Формирование документа...</>
                : <><Download className="w-4 h-4" />Сформировать и скачать DOCX</>}
            </button>

            {!canGenerate && <p className="text-xs text-slate-600 text-center">Заполните все обязательные поля для генерации</p>}
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Предварительный просмотр</p>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPreview ? <><ChevronUp className="w-3.5 h-3.5" />Свернуть</> : <><ChevronDown className="w-3.5 h-3.5" />Развернуть</>}
              </button>
            </div>

            {showPreview && (
              <div className="rounded-2xl overflow-hidden border border-slate-700/40 shadow-2xl">
                <div className="bg-slate-800/60 border-b border-slate-700/40 px-4 py-2.5 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  <span className="text-xs text-slate-500 ml-2">
                    {form.actType === "sdacha" ? "Акт сдачи оборудования" : "Акт выдачи оборудования"}.docx
                  </span>
                </div>
                <DocPreview data={previewData} />
              </div>
            )}

            <div className="bg-slate-900/40 border border-slate-800/40 rounded-xl p-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                <span className="text-slate-400 font-medium">Формат документа:</span> A4, поля 2cm / 0.6cm / 0.8cm / 1.2cm, шрифт Times New Roman 14pt. При наличии дефектов автоматически добавляется Приложение.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}