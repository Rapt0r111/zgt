"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  ArrowUpFromLine,
  ArrowDownToLine,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Shield,
  User,
  Cpu,
  CalendarDays,
  Package,
} from "lucide-react";

// ─── Типы ────────────────────────────────────────────────────────────────────
type ActType = "sdacha" | "vydacha";

interface PersonOption {
  id: string;
  label: string; // "рядовой Дубровин И.С."
  rank: string;
  nameInitials: string; // "Дубровин И.С."
  lastNameInitials: string; // "И. Дубровин" (для подписи)
}

interface EquipmentOption {
  id: string;
  model: string; // "Aquarius Cmp NS685U R11"
  serial: string;
}

// ─── Справочники (в реальной системе — из API) ────────────────────────────────
const PERSONNEL: PersonOption[] = [
  {
    id: "1",
    label: "рядовой Дубровин И.С.",
    rank: "оператор роты (научной) рядовой",
    nameInitials: "Дубровин И.С.",
    lastNameInitials: "И. Дубровин",
  },
  {
    id: "2",
    label: "рядовой Поршаков Л.Н.",
    rank: "оператор роты (научной) рядовой",
    nameInitials: "Поршаков Л.Н.",
    lastNameInitials: "Л. Поршаков",
  },
  {
    id: "3",
    label: "рядовой Цветков Д.Е.",
    rank: "оператор роты (научной) рядовой",
    nameInitials: "Цветков Д.Е.",
    lastNameInitials: "Д. Цветков",
  },
  {
    id: "4",
    label: "лейтенант Халупа А.И.",
    rank: "командир 1 взвода (научного) роты (научной) лейтенант",
    nameInitials: "Халупа А.И.",
    lastNameInitials: "А. Халупа",
  },
];

const OFFICERS: PersonOption[] = [
  {
    id: "4",
    label: "лейтенант Халупа А.И.",
    rank: "командир 1 взвода (научного) роты (научной) лейтенант",
    nameInitials: "Халупа А.И.",
    lastNameInitials: "А. Халупа",
  },
];

const EQUIPMENT: EquipmentOption[] = [
  { id: "e1", model: "Aquarius Cmp NS685U R11", serial: "222081909046R-0210" },
  { id: "e2", model: "Aquarius Cmp NS685U R1", serial: "222081909046R-0080" },
  { id: "e3", model: "Aquarius Cmp NS685U R2", serial: "222081909046R-0150" },
  { id: "e4", model: "Aquarius Cmp NS685U R3", serial: "222081909046R-0310" },
];

const KIT_OPTIONS = [
  "ноутбук",
  "зарядное устройство",
  "компьютерная мышь",
  "сумка для ноутбука",
  "USB-хаб",
  "кабель питания",
];

const COMMANDER = { rank: "капитан", sign: "С. Тарасенко" };

// ─── Вспомогательные компоненты ───────────────────────────────────────────────
function Select({
  label,
  value,
  onChange,
  options,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ElementType;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-100 appearance-none cursor-pointer focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all"
        >
          <option value="" className="bg-slate-800">
            — выберите —
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-slate-800">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all"
      />
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div
        onClick={() => onChange(!checked)}
        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
          checked
            ? "bg-blue-600 border-blue-500"
            : "bg-slate-800/60 border-slate-700 group-hover:border-slate-500"
        }`}
      >
        {checked && (
          <svg
            viewBox="0 0 10 8"
            fill="none"
            className="w-2.5 h-2.5"
          >
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );
}

// ─── Превью документа ─────────────────────────────────────────────────────────
function DocPreview({
  actType,
  data,
}: {
  actType: ActType;
  data: Record<string, string | string[] | boolean>;
}) {
  const year = (data.year as string) || "____";
  const eq = EQUIPMENT.find((e) => e.id === data.equipmentId);
  const personSurrender = PERSONNEL.find((p) => p.id === data.surrenderPersonId);
  const personReceiver = PERSONNEL.find((p) => p.id === data.receiverPersonId);
  const personIssuer = OFFICERS.find((p) => p.id === data.issuerPersonId);
  const kit = ((data.kit as string[]) || []).join(", ");
  const serial = (data.customSerial as string) || eq?.serial || "___________";
  const model = eq?.model || "___________";
  const defects = (data.defects as string) || "";

  const surrendererDisplay = personSurrender
    ? `${personSurrender.rank} ${personSurrender.nameInitials}`
    : "___________";
  const receiverDisplay = personReceiver
    ? `${personReceiver.rank} ${personReceiver.nameInitials}`
    : "___________";
  const issuerDisplay = personIssuer
    ? `${personIssuer.rank} ${personIssuer.nameInitials}`
    : "___________";

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
        {/* Блок УТВЕРЖДАЮ */}
        <div style={{ textAlign: "right", marginLeft: "55%" }}>
          <div style={{ fontWeight: "normal" }}>УТВЕРЖДАЮ</div>
          <div>Командир роты (научной)</div>
          <div>{COMMANDER.rank}</div>
          <div style={{ marginTop: "6px" }}>{COMMANDER.sign}</div>
          <div>«___» ________ {year} г.</div>
        </div>

        <div style={{ height: "24px" }} />

        {/* Заголовок */}
        <div style={{ textAlign: "center", fontWeight: "bold", lineHeight: "1.4" }}>
          АКТ
          <br />
          приема-передачи в эксплуатацию
          <br />
          оборудования
        </div>

        <div style={{ marginTop: "8px" }}>
          г. Санкт-Петербург{" "}
          <span style={{ display: "inline-block", width: "200px" }} />
          «___»___________
          {year} г.
        </div>

        <div style={{ height: "16px" }} />

        {/* Основной текст */}
        {actType === "sdacha" ? (
          <div style={{ textIndent: "1.25cm", textAlign: "justify" }}>
            Настоящий акт составлен в том, что{" "}
            <strong>{receiverDisplay}</strong> принял, а{" "}
            <strong>{surrendererDisplay}</strong> сдал нижеперечисленное
            имущество:
          </div>
        ) : (
          <div style={{ textIndent: "1.25cm", textAlign: "justify" }}>
            Настоящий акт составлен в том, что{" "}
            <strong>{receiverDisplay}</strong> принял, а{" "}
            <strong>{issuerDisplay}</strong> выдал нижеперечисленное имущество:
          </div>
        )}

        <div style={{ height: "8px" }} />

        {/* Пункт 1 */}
        <div style={{ textIndent: "1.25cm", textAlign: "justify" }}>
          1. Ноутбук «{model}» (серийный номер {serial} в комплекте:{" "}
          {kit || "___________"})
          {actType === "vydacha" ? (
            <>
              {" "}
              в исправном состоянии
              {defects ? (
                <>
                  ,<br />
                  за исключением {defects} (см. приложение).
                </>
              ) : (
                "."
              )}
            </>
          ) : (
            "."
          )}
        </div>

        {actType === "vydacha" && (
          <>
            <div style={{ marginLeft: "1.25cm" }}>
              2. Электронный пропуск №
            </div>
            <div style={{ marginLeft: "1.25cm" }}>
              3. USB-накопитель МО РФ №
            </div>
          </>
        )}

        <div style={{ height: "16px" }} />

        {/* Подписи */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            {actType === "sdacha" ? "Сдал:" : "Выдал:"}
            {"     "}
            <u>
              {actType === "sdacha"
                ? personSurrender?.nameInitials || "___________"
                : personIssuer?.nameInitials || "___________"}
            </u>{" "}
            /_______________
          </div>
          <div>«___»___________{year} г.</div>
        </div>

        <div style={{ height: "16px" }} />

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            Принял:{" "}
            <u>{personReceiver?.nameInitials || "___________"}</u>{" "}
            /_______________
          </div>
          <div>«___»___________{year} г.</div>
        </div>

        {/* Приложение (для акта выдачи с дефектами) */}
        {actType === "vydacha" && defects && (
          <>
            <div
              style={{
                borderTop: "1px dashed #999",
                marginTop: "24px",
                paddingTop: "16px",
              }}
            />
            <div style={{ textAlign: "center", fontWeight: "bold" }}>
              Приложение
            </div>
            <div style={{ textIndent: "1.25cm", textAlign: "justify", marginTop: "8px" }}>
              Неисправности «{model}» №{serial}
            </div>
            <div style={{ marginTop: "16px" }}>Корректность подтверждаю:</div>
            <div>
              {personReceiver
                ? personReceiver.rank.split(" ")[
                    personReceiver.rank.split(" ").length - 1
                  ]
                : "рядовой"}
            </div>
            <div style={{ textAlign: "right" }}>
              {personReceiver?.lastNameInitials || "___________"}
            </div>
            <div>«___» ___________{year} г.</div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Главная страница ─────────────────────────────────────────────────────────
export default function ActsPage() {
  const [actType, setActType] = useState<ActType>("sdacha");
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Форма
  const [surrenderPersonId, setSurrenderPersonId] = useState("");
  const [receiverPersonId, setReceiverPersonId] = useState("");
  const [issuerPersonId, setIssuerPersonId] = useState("4"); // Халупа по умолч.
  const [equipmentId, setEquipmentId] = useState("");
  const [customSerial, setCustomSerial] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [kit, setKit] = useState<string[]>(["ноутбук", "компьютерная мышь", "сумка для ноутбука"]);
  const [defects, setDefects] = useState("");
  const [year, setYear] = useState("2025");

  const formData = {
    surrenderPersonId,
    receiverPersonId,
    issuerPersonId,
    equipmentId,
    customSerial,
    customModel,
    kit,
    defects,
    year,
  };

  const selectedEq = EQUIPMENT.find((e) => e.id === equipmentId);
  const effectiveSerial = customSerial || selectedEq?.serial || "";
  const effectiveModel = customModel || selectedEq?.model || "";

  const canGenerate =
    effectiveModel &&
    effectiveSerial &&
    kit.length > 0 &&
    (actType === "sdacha"
      ? surrenderPersonId && receiverPersonId
      : receiverPersonId && issuerPersonId);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);

    try {
      const personSurrender = PERSONNEL.find((p) => p.id === surrenderPersonId);
      const personReceiver = PERSONNEL.find((p) => p.id === receiverPersonId);
      const personIssuer = OFFICERS.find((p) => p.id === issuerPersonId);

      const payload = {
        actType,
        year,
        commanderRank: COMMANDER.rank,
        commanderSign: COMMANDER.sign,
        equipmentName: effectiveModel,
        serialNumber: effectiveSerial,
        kit: kit.join(", "),
        defects: defects || null,
        // Сдача
        surrendererRank: personSurrender?.rank || "",
        surrendererName: personSurrender?.nameInitials || "",
        receiverRank: personReceiver?.rank || "",
        receiverName: personReceiver?.nameInitials || "",
        // Выдача
        issuerRank: personIssuer?.rank || "",
        issuerName: personIssuer?.nameInitials || "",
        receiverRankShort:
          personReceiver?.rank.split(" ").slice(-1)[0] || "рядовой",
        receiverLastNameInitials: personReceiver?.lastNameInitials || "",
      };

      const res = await fetch("/api/acts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Ошибка генерации");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const personName =
        actType === "sdacha"
          ? personSurrender?.nameInitials?.split(" ")[0] || "документ"
          : personReceiver?.nameInitials?.split(" ")[0] || "документ";
      a.href = url;
      a.download = `акт_${actType === "sdacha" ? "сдачи" : "выдачи"}_ноутбука_${personName}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Ошибка при генерации документа. Проверьте соединение.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Заголовок */}
      <div className="border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-100">
                Генерация актов
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Формирование актов приема-передачи оборудования
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Тип акта */}
        <div className="mb-8">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            Тип документа
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setActType("sdacha")}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border text-sm font-medium transition-all ${
                actType === "sdacha"
                  ? "bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-lg shadow-blue-900/20"
                  : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-slate-300 hover:border-slate-600"
              }`}
            >
              <ArrowUpFromLine className="w-4 h-4" />
              Акт сдачи оборудования
            </button>
            <button
              onClick={() => setActType("vydacha")}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border text-sm font-medium transition-all ${
                actType === "vydacha"
                  ? "bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-lg shadow-blue-900/20"
                  : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-slate-300 hover:border-slate-600"
              }`}
            >
              <ArrowDownToLine className="w-4 h-4" />
              Акт выдачи оборудования
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* ─── Форма ──────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Блок: Участники */}
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200">
                  Участники
                </h2>
              </div>

              {actType === "sdacha" ? (
                <>
                  <Select
                    label="Кто сдаёт"
                    value={surrenderPersonId}
                    onChange={setSurrenderPersonId}
                    icon={ArrowUpFromLine}
                    options={PERSONNEL.map((p) => ({
                      value: p.id,
                      label: p.label,
                    }))}
                  />
                  <Select
                    label="Кто принимает"
                    value={receiverPersonId}
                    onChange={setReceiverPersonId}
                    icon={ArrowDownToLine}
                    options={PERSONNEL.map((p) => ({
                      value: p.id,
                      label: p.label,
                    }))}
                  />
                </>
              ) : (
                <>
                  <Select
                    label="Кто выдаёт"
                    value={issuerPersonId}
                    onChange={setIssuerPersonId}
                    icon={ArrowUpFromLine}
                    options={OFFICERS.map((p) => ({
                      value: p.id,
                      label: p.label,
                    }))}
                  />
                  <Select
                    label="Кто принимает"
                    value={receiverPersonId}
                    onChange={setReceiverPersonId}
                    icon={ArrowDownToLine}
                    options={PERSONNEL.map((p) => ({
                      value: p.id,
                      label: p.label,
                    }))}
                  />
                </>
              )}
            </div>

            {/* Блок: Оборудование */}
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200">
                  Оборудование
                </h2>
              </div>

              <Select
                label="Модель ноутбука"
                value={equipmentId}
                onChange={(v) => {
                  setEquipmentId(v);
                  setCustomSerial("");
                  setCustomModel("");
                }}
                icon={Cpu}
                options={[
                  ...EQUIPMENT.map((e) => ({
                    value: e.id,
                    label: e.model,
                  })),
                  { value: "custom", label: "Другое (ввести вручную)" },
                ]}
              />

              {(equipmentId === "custom" || !equipmentId) && (
                <Input
                  label="Название оборудования"
                  value={customModel}
                  onChange={setCustomModel}
                  placeholder="Aquarius Cmp NS685U R1"
                />
              )}

              <Input
                label="Серийный номер"
                value={customSerial || selectedEq?.serial || ""}
                onChange={setCustomSerial}
                placeholder={selectedEq?.serial || "222081909046R-0210"}
                icon={Shield}
              />
            </div>

            {/* Блок: Комплект */}
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200">
                  Комплект поставки
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {KIT_OPTIONS.map((item) => (
                  <Checkbox
                    key={item}
                    label={item}
                    checked={kit.includes(item)}
                    onChange={(checked) => {
                      if (checked) {
                        setKit([...kit, item]);
                      } else {
                        setKit(kit.filter((k) => k !== item));
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Блок: Дефекты (только для выдачи) */}
            {actType === "vydacha" && (
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-slate-200">
                    Дефекты и неисправности
                  </h2>
                  <span className="text-xs text-slate-500 ml-1">
                    (необязательно)
                  </span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Описание дефектов
                  </label>
                  <textarea
                    value={defects}
                    onChange={(e) => setDefects(e.target.value)}
                    placeholder="царапин и сломанного крепежа экрана"
                    rows={2}
                    className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
                  />
                  <p className="text-xs text-slate-600">
                    При наличии дефектов будет добавлено Приложение с 2-й
                    страницей
                  </p>
                </div>
              </div>
            )}

            {/* Блок: Год */}
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6">
              <Select
                label="Год"
                value={year}
                onChange={setYear}
                icon={CalendarDays}
                options={["2024", "2025", "2026", "2027"].map((y) => ({
                  value: y,
                  label: y + " г.",
                }))}
              />
            </div>

            {/* Кнопка генерации */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
              className={`w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-sm font-semibold transition-all ${
                canGenerate && !generating
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 active:scale-[0.98]"
                  : "bg-slate-800/60 text-slate-600 cursor-not-allowed border border-slate-700/40"
              }`}
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Формирование документа...
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
                Заполните все обязательные поля для генерации
              </p>
            )}
          </div>

          {/* ─── Превью ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Предварительный просмотр
              </p>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPreview ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" /> Свернуть
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" /> Развернуть
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
                    {actType === "sdacha"
                      ? "Акт сдачи оборудования"
                      : "Акт выдачи оборудования"}
                    .docx
                  </span>
                </div>
                <DocPreview actType={actType} data={formData} />
              </div>
            )}

            {/* Подсказка */}
            <div className="bg-slate-900/40 border border-slate-800/40 rounded-xl p-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                <span className="text-slate-400 font-medium">
                  Формат документа:
                </span>{" "}
                A4, поля 2cm / 0.6cm / 0.8cm / 1.2cm, шрифт Times New Roman
                14pt. Документ точно соответствует утверждённому образцу.
                {actType === "vydacha" && (
                  <>
                    {" "}
                    При наличии дефектов автоматически добавляется Приложение.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}