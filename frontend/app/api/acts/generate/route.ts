import { NextRequest, NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, UnderlineType, TabStopType,
} from "docx";
import { z } from "zod";

// ─── Матрица состояний ────────────────────────────────────────────────────────

const CONDITION_VALUES = ["ok", "defective", "absent", "cosmetic"] as const;
type Condition = (typeof CONDITION_VALUES)[number];

const CONDITION_LABEL: Record<Condition, string> = {
  ok:        "исправно",
  defective: "неисправно",
  absent:    "отсутствует",
  cosmetic:  "имеются косметические дефекты",
};

function conditionPhrase(c: Condition): string {
  switch (c) {
    case "ok":        return "в исправном состоянии";
    case "defective": return "в неисправном состоянии";
    case "absent":    return "отсутствует";
    case "cosmetic":  return "имеет косметические дефекты";
  }
}

// ─── Схема валидации ──────────────────────────────────────────────────────────

const KitItemSchema = z.object({
  name:       z.string().min(1).max(200),
  condition:  z.enum(CONDITION_VALUES).default("ok"),
  defectNote: z.string().max(500).nullable().optional(),
});

const ActPayloadSchema = z.object({
  actType:       z.enum(["sdacha", "vydacha"]),
  year:          z.string().regex(/^\d{4}$/),
  commanderRank: z.string().min(1).max(100),
  commanderSign: z.string().min(1).max(100),
  equipmentName: z.string().min(1).max(500),
  serialNumber:  z.string().min(1).max(200),

  // Новый формат: массив позиций с матрицей состояний
  kitItems: z.array(KitItemSchema).min(1).max(20),

  // Доп. поле свободного описания дефектов (обратная совместимость)
  defects: z.string().max(2000).nullable().optional(),

  flashDriveNumbers:        z.string().max(1000).nullable().optional(),
  passNumbers:              z.string().max(1000).nullable().optional(),
  surrendererRank:          z.string().max(200).optional(),
  surrendererName:          z.string().max(200).optional(),
  receiverRank:             z.string().max(200).optional(),
  receiverName:             z.string().max(200).optional(),
  issuerRank:               z.string().max(200).optional(),
  issuerName:               z.string().max(200).optional(),
  receiverRankShort:        z.string().max(100).optional(),
  receiverLastNameInitials: z.string().max(200).optional(),
});

type Payload = z.infer<typeof ActPayloadSchema>;

// ─── Утилиты ──────────────────────────────────────────────────────────────────

/** Плейсхолдер для любых отсутствующих данных — юридически безопасный вариант. */
const MISSING = "[ДАННЫЕ ОТСУТСТВУЮТ]";

/** Возвращает значение или MISSING, если строка пустая / undefined / null. */
function val(s: string | null | undefined): string {
  const t = (s ?? "").trim();
  return t.length > 0 ? t : MISSING;
}

/** Убирает висячие предлоги и союзы (а, в, и, к, с, у, о). */
const WIDOWS_RE = /\b([авиксуоАВИКСУО])\s+/g;
const noWidows = (t: string) => t.replace(WIDOWS_RE, (_, p) => `${p}\u00A0`);

// ─── Конструкторы параграфов ──────────────────────────────────────────────────

const TNR = (text: string, opts: Partial<ConstructorParameters<typeof TextRun>[0]> = {}) =>
  new TextRun({ text, font: "Times New Roman", size: 28, ...(opts as object) });

const BL = () =>
  new Paragraph({ children: [], spacing: { after: 0, line: 240, lineRule: "auto" } });

const bodyP = (children: TextRun[]) =>
  new Paragraph({
    children,
    spacing:   { after: 0, line: 240, lineRule: "auto" },
    indent:    { firstLine: 709 },
    alignment: AlignmentType.BOTH,
  });

// A4, поля: верх 2 см, право ~0,6 см, низ 2 см, лево ~3 см (переплёт)
const PAGE = {
  page: {
    size:   { width: 11906, height: 16838 },
    margin: { top: 1134, right: 850, bottom: 1134, left: 1701 },
  },
} as const;

// ─── Блоки документа ──────────────────────────────────────────────────────────

function headerBlock(rank: string, sign: string, year: string): Paragraph[] {
  return [
    new Paragraph({
      children:  [TNR("УТВЕРЖДАЮ")],
      spacing:   { after: 0, line: 240, lineRule: "auto" },
      indent:    { left: 5387 },
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [TNR("Командир роты (научной)")],
      spacing:  { after: 0, line: 240, lineRule: "auto" },
      indent:   { left: 5387 },
    }),
    new Paragraph({
      children: [TNR(val(rank))],
      spacing:  { after: 0, line: 240, lineRule: "auto" },
      indent:   { left: 5387 },
    }),
    new Paragraph({
      children:  [TNR(val(sign))],
      spacing:   { after: 0, line: 360, lineRule: "auto" },
      indent:    { left: 4678, firstLine: 2693 },
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      children: [TNR(`«___» ________ ${year} г.`)],
      spacing:  { after: 0, line: 240, lineRule: "auto" },
      indent:   { left: 5387 },
    }),
    BL(), BL(),
    new Paragraph({
      children: [
        new TextRun({ text: "АКТ", font: "Times New Roman", size: 28, bold: true }),
        new TextRun({ text: "приёма-передачи в эксплуатацию", font: "Times New Roman", size: 28, bold: true, break: 1 }),
        new TextRun({ text: "оборудования", font: "Times New Roman", size: 28, bold: true, break: 1 }),
      ],
      spacing:   { after: 0, line: 240, lineRule: "auto" },
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [TNR(`г. Санкт-Петербург                                                        «___»___________ ${year} г.`)],
      spacing:  { after: 0, line: 240, lineRule: "auto" },
    }),
    BL(), BL(),
  ];
}

function signatureLine(label: string, name: string, year: string): Paragraph {
  const displayName = (name ?? "").trim() || "___________";
  return new Paragraph({
    children: [
      TNR(`${label}   `),
      new TextRun({
        text:      `${displayName} `,
        font:      "Times New Roman",
        size:      28,
        underline: { type: UnderlineType.SINGLE },
      }),
      TNR(`/_______________\t\t«___»___________ ${year} г.`),
    ],
    tabStops: [
      { type: TabStopType.RIGHT, position: 6237 },
      { type: TabStopType.RIGHT, position: 7088 },
    ],
    spacing: { after: 0, line: 240, lineRule: "auto" },
  });
}

/**
 * Пункт 1 акта — ноутбук с перечнем комплекта и матрицей состояний.
 *
 * Логика итогового состояния:
 *   — хотя бы один элемент «неисправен» → ссылка на Приложение
 *   — только «отсутствующие» → передача в неполном комплекте
 *   — только «косметика» → исправен, с косметическими дефектами
 *   — иначе (акт выдачи) → в исправном состоянии
 */
function buildItem1(d: Payload, isSdacha: boolean): Paragraph {
  const equipName = val(d.equipmentName);
  const serial    = val(d.serialNumber);

  const kitParts = d.kitItems.map((item) => {
    const n = val(item.name);
    return item.condition === "ok" ? n : `${n} (${conditionPhrase(item.condition)})`;
  });
  const kitStr = kitParts.length > 0 ? kitParts.join(", ") : MISSING;

  const hasDefective     = d.kitItems.some((i) => i.condition === "defective");
  const hasAbsent        = d.kitItems.some((i) => i.condition === "absent");
  const hasCosmetic      = d.kitItems.some((i) => i.condition === "cosmetic");
  const hasCustomDefects = !!(d.defects ?? "").trim();

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

  const text = noWidows(
    `1. Ноутбук «${equipName}» (серийный номер: ${serial}; в комплекте: ${kitStr})${overallState}.`,
  );
  return bodyP([TNR(text)]);
}

/**
 * Пункты 2 и 3 — электронный пропуск и USB-накопитель.
 * Для акта сдачи — только при наличии номеров.
 * Для акта выдачи — всегда (с заглушкой при отсутствии данных).
 */
function additionalItems(d: Payload): Paragraph[] {
  const isSdacha = d.actType === "sdacha";
  const pass  = (d.passNumbers ?? "").trim();
  const flash = (d.flashDriveNumbers ?? "").trim();
  const items: Paragraph[] = [];

  const itemP = (text: string) =>
    new Paragraph({
      children: [TNR(noWidows(text))],
      spacing:  { after: 0, line: 240, lineRule: "auto" },
      indent:   { left: 709 },
    });

  if (pass) {
    items.push(itemP(`2. Электронный пропуск № ${pass}.`));
  } else if (!isSdacha) {
    items.push(itemP(`2. Электронный пропуск № ${MISSING}.`));
  }

  if (flash) {
    items.push(itemP(`3. USB-накопитель МО РФ № ${flash}.`));
  } else if (!isSdacha) {
    items.push(itemP(`3. USB-накопитель МО РФ № ${MISSING}.`));
  }

  return items;
}

/**
 * Приложение с перечнем дефектов.
 *
 * Добавляется автоматически при наличии:
 *   — элементов со статусом «неисправен» или «отсутствует»
 *   — заполненного поля свободного описания дефектов
 *
 * Подпись принимающей стороны фиксирует, что дефекты выявлены совместно
 * и не могут быть оспорены как возникшие после приёма.
 */
function appendix(d: Payload): Paragraph[] {
  const defectiveItems = d.kitItems.filter(
    (i) => i.condition === "defective" || i.condition === "absent",
  );
  const hasCustomDefects = !!(d.defects ?? "").trim();

  if (defectiveItems.length === 0 && !hasCustomDefects) return [];

  const receiverRankShort        = (d.receiverRankShort ?? "").trim() || "рядовой";
  const receiverLastNameInitials = val(d.receiverLastNameInitials);

  const defectLines: Paragraph[] = defectiveItems.map((item, idx) => {
    const prefix = `${idx + 1}. ${val(item.name)} — ${CONDITION_LABEL[item.condition]}`;
    const note   = (item.defectNote ?? "").trim();
    return new Paragraph({
      children: [TNR(note ? `${prefix}: ${note}.` : `${prefix}.`)],
      spacing:  { after: 0, line: 240, lineRule: "auto" },
      indent:   { left: 709 },
    });
  });

  if (hasCustomDefects) {
    defectLines.push(
      new Paragraph({
        children: [TNR(noWidows(
          `${defectiveItems.length + 1}. Прочие дефекты: ${d.defects!.trim()}.`,
        ))],
        spacing: { after: 0, line: 240, lineRule: "auto" },
        indent:  { left: 709 },
      }),
    );
  }

  const equipName = val(d.equipmentName);
  const serial    = val(d.serialNumber);

  return [
    new Paragraph({
      children:        [new TextRun({ text: "", break: 1 })],
      pageBreakBefore: true,
      spacing:         { after: 0, line: 240, lineRule: "auto" },
    }),
    new Paragraph({
      children:  [TNR("Приложение", { bold: true })],
      spacing:   { after: 0, line: 720, lineRule: "auto" },
      alignment: AlignmentType.CENTER,
    }),
    bodyP([TNR(noWidows(
      `Перечень неисправностей и отклонений от штатного состояния ноутбука «${equipName}» ` +
      `(серийный номер: ${serial}), зафиксированных на момент передачи:`,
    ))]),
    BL(),
    ...defectLines,
    BL(),
    new Paragraph({
      children: [TNR(
        "Принимающая сторона подтверждает, что перечисленные дефекты выявлены совместно " +
        "и не могут служить основанием для претензий относительно состояния оборудования " +
        "на момент его приёма.",
      )],
      spacing:   { after: 0, line: 240, lineRule: "auto" },
      alignment: AlignmentType.BOTH,
    }),
    BL(),
    new Paragraph({
      children: [TNR("С перечнем ознакомлен и согласен:")],
      spacing:  { line: 240, lineRule: "auto" },
    }),
    BL(),
    new Paragraph({
      children: [TNR(receiverRankShort)],
      spacing:  { line: 240, lineRule: "auto" },
    }),
    new Paragraph({
      children:  [TNR(receiverLastNameInitials)],
      spacing:   { line: 240, lineRule: "auto" },
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      children: [TNR(`«___» ___________ ${d.year} г.`)],
      spacing:  { line: 240, lineRule: "auto" },
    }),
  ];
}

// ─── Сборка документа ─────────────────────────────────────────────────────────

function buildDoc(d: Payload): Document {
  const isSdacha = d.actType === "sdacha";

  const thirdPartyRank = ((isSdacha ? d.surrendererRank : d.issuerRank) ?? "").trim();
  const thirdPartyName = val(isSdacha ? d.surrendererName : d.issuerName);
  const thirdParty     = [thirdPartyRank, thirdPartyName].filter(Boolean).join(" ");

  const receiverRank = (d.receiverRank ?? "").trim();
  const receiverName = val(d.receiverName);
  const receiverFull = [receiverRank, receiverName].filter(Boolean).join(" ");

  const verb = isSdacha ? "сдал" : "выдал";

  const intro = noWidows(
    `Настоящий акт составлен в том, что ${val(receiverFull)} принял от ` +
    `${val(thirdParty)}, который(-ая) ${verb} нижеперечисленное имущество:`,
  );

  const actionLabel = isSdacha ? "Сдал:" : "Выдал:";
  const actionName  = ((isSdacha ? d.surrendererName : d.issuerName) ?? "").trim();

  return new Document({
    sections: [
      {
        properties: PAGE,
        children: [
          ...headerBlock(d.commanderRank, d.commanderSign, d.year),
          bodyP([TNR(intro)]),
          buildItem1(d, isSdacha),
          ...additionalItems(d),
          BL(),
          signatureLine(`${actionLabel}   `, actionName, d.year),
          BL(), BL(),
          signatureLine("Принял:", receiverName, d.year),
          BL(), BL(),
          ...appendix(d),
        ],
      },
    ],
  });
}

// ─── HTTP-обработчик ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type должен быть application/json" },
      { status: 415 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = ActPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации данных", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const buffer = await Packer.toBuffer(buildDoc(parsed.data));
    const d      = parsed.data;

    const personKey =
      d.actType === "sdacha"
        ? (d.surrendererName?.split(" ")[0] ?? "документ")
        : (d.receiverName?.split(" ")[0] ?? "документ");

    const typeLabel = d.actType === "sdacha" ? "сдачи" : "выдачи";
    const filename  = encodeURIComponent(`акт_${typeLabel}_ноутбука_${personKey}.docx`);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
        "Cache-Control":       "no-store",
      },
    });
  } catch (err) {
    console.error("[acts/generate]", err);
    return NextResponse.json({ error: "Ошибка формирования документа" }, { status: 500 });
  }
}