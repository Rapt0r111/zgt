import { NextRequest, NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, ImageRun,
  AlignmentType, UnderlineType, TabStopType,
} from "docx";
import { z } from "zod";

// ─── Матрица состояний ────────────────────────────────────────────────────────

const CONDITION_VALUES = ["ok", "defective", "absent", "cosmetic"] as const;
type Condition = (typeof CONDITION_VALUES)[number];

function conditionAdjective(c: Condition, gender: "m" | "f" | "n" = "n"): string {
  const forms: Record<Condition, Record<"m" | "f" | "n", string>> = {
    ok:        { m: "исправен",   f: "исправна",   n: "исправно"   },
    defective: { m: "неисправен", f: "неисправна", n: "неисправно" },
    absent:    { m: "отсутствует", f: "отсутствует", n: "отсутствует" },
    cosmetic:  { m: "имеет косметические дефекты", f: "имеет косметические дефекты", n: "имеет косметические дефекты" },
  };
  return forms[c][gender];
}

const ITEM_GENDER: Record<string, "m" | "f" | "n"> = {
  "ноутбук":               "m",
  "зарядное устройство":   "n",
  "компьютерная мышь":     "f",
  "мышь":                  "f",
  "сумка для ноутбука":    "f",
  "сумка":                 "f",
  "usb-концентратор":      "m",
  "usb концентратор":      "m",
  "кабель питания":        "m",
  "кабель":                "m",
  "адаптер питания":       "m",
  "адаптер":               "m",
  "блок питания":          "m",
};

function getItemGender(name: string): "m" | "f" | "n" {
  return ITEM_GENDER[name.toLowerCase().trim()] ?? "n";
}

function conditionPhrase(c: Condition, gender: "m" | "f" | "n"): string {
  if (c === "ok") return "";
  return ` (${conditionAdjective(c, gender)})`;
}

// ─── Схема валидации ──────────────────────────────────────────────────────────

const KitItemSchema = z.object({
  name:       z.string().min(1).max(200),
  condition:  z.enum(CONDITION_VALUES).default("ok"),
  defectNote: z.string().max(500).nullable().optional(),
});

const PhotoSchema = z.object({
  dataUrl:  z.string().startsWith("data:image/"),
  caption:  z.string().max(300).optional(),
});

const ActPayloadSchema = z.object({
  actType:       z.enum(["sdacha", "vydacha"]),
  actNumber:     z.string().max(50).optional().transform(v => v?.trim() || ""),
  fullDate:      z.string().max(100).optional(),  // «01» января 2026 г.
  year:          z.string().regex(/^\d{4}$/),
  basisDoc:      z.string().max(500).nullable().optional(),
  commanderRank: z.string().min(1).max(100),
  commanderSign: z.string().min(1).max(100),
  equipmentName: z.string().min(1).max(500),
  serialNumber:  z.string().min(1).max(200),
  kitItems: z.array(KitItemSchema).min(1).max(20),
  defects:  z.string().max(2000).nullable().optional(),
  flashDriveNumbers:        z.string().max(1000).nullable().optional(),
  passNumbers:              z.string().max(1000).nullable().optional(),
  photos:                   z.array(PhotoSchema).max(20).optional(),

  // Именительный – для строк подписей («командир взвода лейтенант Халупа А.И.»)
  surrendererLabel:         z.string().max(300).optional(),
  receiverLabel:            z.string().max(300).optional(),
  issuerLabel:              z.string().max(300).optional(),

  // Родительный – для вводной части («принял от командира взвода лейтенанта Халупы А.И.»)
  surrendererGenitiveLabel: z.string().max(300).optional(),
  receiverGenitiveLabel:    z.string().max(300).optional(),
  issuerGenitiveLabel:      z.string().max(300).optional(),

  receiverRankShort:          z.string().max(100).optional(),
  receiverLastNameInitials:   z.string().max(200).optional(),
  // Инициалы для строк подписей (Фамилия И.О.)
  surrendererLastNameInitials: z.string().max(200).optional(),
  issuerLastNameInitials:      z.string().max(200).optional(),
});

type Payload = z.infer<typeof ActPayloadSchema>;

// ─── Утилиты ──────────────────────────────────────────────────────────────────

const MISSING = "[ДАННЫЕ ОТСУТСТВУЮТ]";

function val(s: string | null | undefined): string {
  const t = (s ?? "").trim();
  return t.length > 0 ? t : MISSING;
}

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

const PAGE = {
  page: {
    size:   { width: 11906, height: 16838 },
    // top: ~2cm, right: ~0.6cm, bottom: ~2cm, left: ~3cm
    margin: { top: 1134, right: 850, bottom: 1134, left: 1701 },
  },
} as const;

function dateToRuns(dateStr: string | undefined, year: string): TextRun[] {
  const input = (dateStr ?? "").trim();
  const base = { font: "Times New Roman", size: 28 };

  // Если дата пустая – создаем шаблон
  if (!input || input.includes("___")) {
    return [
      new TextRun({ ...base, text: "«", underline: {} }),
      new TextRun({ ...base, text: "___", underline: {} }),
      new TextRun({ ...base, text: "»", underline: {} }),
      new TextRun({ ...base, text: " " }),
      new TextRun({ ...base, text: "___________", underline: {} }),
      new TextRun({ ...base, text: ` ${year} г.` }),
    ];
  }

  // Регулярное выражение для формата «01» января 2026 г.
  const regex = /«([^»]+)»\s+([^\s]+)\s+(.*)/;
  const match = input.match(regex);

  if (match) {
    const [, day, month, rest] = match;
    return [
      new TextRun({ ...base, text: "«", underline: {} }),
      new TextRun({ ...base, text: day, underline: {} }),
      new TextRun({ ...base, text: "»", underline: {} }),
      new TextRun({ ...base, text: " " }),
      new TextRun({ ...base, text: month, underline: {} }),
      new TextRun({ ...base, text: ` ${rest}` }),
    ];
  }
  return [new TextRun({ ...base, text: input })];
}

// ─── Блоки документа ──────────────────────────────────────────────────────────

function headerBlock(
  rank: string,
  sign: string,
  year: string,
  fullDate: string,
  actNumber: string,
): Paragraph[] {
  const actNumStr = actNumber.trim() ? ` № ${actNumber.trim()}` : "";
  // Дата для грифа «УТВЕРЖДАЮ» совпадает с датой акта
  const approvalDate = fullDate || `«___» ___________ ${year} г.`;

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
      children: dateToRuns(fullDate, year), // Дата в грифе
      spacing:  { after: 0, line: 240, lineRule: "auto" },
      indent:   { left: 5387 },
    }),
    BL(), BL(),
    new Paragraph({
      children: [
        new TextRun({ text: `АКТ${actNumStr}`, font: "Times New Roman", size: 28, bold: true }),
        new TextRun({ text: "приёма-передачи оборудования", font: "Times New Roman", size: 28, bold: true, break: 1 }),
      ],
      spacing:   { after: 0, line: 240, lineRule: "auto" },
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        TNR("г. Санкт-Петербург"),
        new TextRun({ text: "\t", font: "Times New Roman", size: 28 }),
        ...dateToRuns(fullDate, year), // Дата в шапке
      ],
      tabStops: [{ type: TabStopType.RIGHT, position: 9355 }],
      spacing:  { after: 0, line: 240, lineRule: "auto" },
    }),
    BL(), BL(),
  ];
}

function signatureLine(label: string, initials: string, year: string, fullDate: string): Paragraph {
  const name = (initials ?? "").trim() || "___________";
  return new Paragraph({
    children: [
      TNR(label), // Теперь тут будут наши 7 или 2 пробела
      new TextRun({
        text: name,
        font: "Times New Roman",
        size: 28,
        underline: { type: UnderlineType.SINGLE },
      }),
      TNR(" /_______________\t"),
      ...dateToRuns(fullDate, year),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: 9355 }],
    spacing:  { after: 0, line: 240, lineRule: "auto" },
  });
}

/**
 * Пункт 1 – ноутбук с комплектом.
 *
 * Логика итогового состояния:
 *   – ноутбук сам неисправен → «в неисправном состоянии (см. Приложение)»
 *   – ноутбук исправен, но периферия нет → соответствующая оговорка
 *   – всё исправно → «в исправном состоянии»
 *   – при сдаче: если всё исправно – состояние не указывается явно (нет избыточности)
 */
function buildItem1(d: Payload): Paragraph {
  const equipName = val(d.equipmentName);
  const serial    = val(d.serialNumber);

  const kitParts = d.kitItems.map((item) => {
    const n = val(item.name);
    if (item.condition === "ok") return n;
    const gender = getItemGender(item.name);
    return `${n}${conditionPhrase(item.condition, gender)}`;
  });
  const kitStr = kitParts.length > 0 ? kitParts.join(", ") : MISSING;

  const laptopItem = d.kitItems.find((i) => i.name.toLowerCase().trim() === "ноутбук");
  const hasLaptopDefect  = laptopItem && laptopItem.condition !== "ok";
  const hasCustomDefects = !!(d.defects ?? "").trim();

  const peripheryItems = d.kitItems.filter((i) => i.name.toLowerCase().trim() !== "ноутбук");
  const hasPeripheryDefect   = peripheryItems.some((i) => i.condition === "defective");
  const hasPeripheryAbsent   = peripheryItems.some((i) => i.condition === "absent");
  const hasPeripheryCosmetic = peripheryItems.some((i) => i.condition === "cosmetic");

  let overallState: string;
  if (hasLaptopDefect || hasCustomDefects) {
    overallState = " – в неисправном состоянии (см. Приложение)";
  } else if (hasPeripheryDefect) {
    overallState = " – ноутбук в исправном состоянии; дефекты периферии указаны в Приложении";
  } else if (hasPeripheryAbsent) {
    overallState = " – ноутбук в исправном состоянии; передаётся в неполном комплекте";
  } else if (hasPeripheryCosmetic) {
    overallState = " – ноутбук в исправном состоянии; отдельные позиции имеют косметические дефекты";
  } else {
    // При сдаче акта достаточно «в исправном состоянии», при выдаче – тоже
    overallState = " – в исправном состоянии";
  }

  const text = noWidows(
    `1. Ноутбук «${equipName}» (серийный номер: ${serial}; в комплекте: ${kitStr})${overallState}.`,
  );
  return bodyP([TNR(text)]);
}

function additionalItems(d: Payload): Paragraph[] {
  const pass  = (d.passNumbers ?? "").trim();
  const flash = (d.flashDriveNumbers ?? "").trim();
  const items: Paragraph[] = [];
  const itemP = (text: string) =>
    new Paragraph({
      children: [TNR(noWidows(text))],
      spacing:  { after: 0, line: 240, lineRule: "auto" },
      indent:   { left: 709 },
    });
  if (pass)  items.push(itemP(`2. Электронный пропуск № ${pass}.`));
  if (flash) items.push(itemP(`3. USB-накопитель МО РФ № ${flash}.`));
  return items;
}

/**
 * Приложение к акту.
 *
 * Содержит:
 *   – перечень неисправностей/отсутствующих позиций
 *   – поле для свободного описания дефектов
 *   – фотоматериалы (если переданы)
 *   – подпись принимающей стороны
 *
 * Приложение идентифицировано ссылкой на номер акта.
 */
async function appendix(d: Payload): Promise<Paragraph[]> {
  const defectiveItems = d.kitItems.filter(
    (i) => i.condition === "defective" || i.condition === "absent",
  );
  const hasCustomDefects = !!(d.defects ?? "").trim();
  const hasPhotos        = (d.photos ?? []).length > 0;

  if (defectiveItems.length === 0 && !hasCustomDefects && !hasPhotos) return [];

  const receiverRankShort        = (d.receiverRankShort ?? "").trim() || "рядовой";
  const receiverLastNameInitials = val(d.receiverLastNameInitials);
  const actNumStr = (d.actNumber ?? "").trim() ? `к акту № ${d.actNumber!.trim()}` : "";
  const equipName = val(d.equipmentName);
  const serial    = val(d.serialNumber);
  const dateStr   = d.fullDate || `«___» ___________ ${d.year} г.`;

  const defectLines: Paragraph[] = defectiveItems.map((item, idx) => {
    const gender    = getItemGender(item.name);
    const stateWord = conditionAdjective(item.condition, gender);
    const prefix    = `${idx + 1}. ${val(item.name)} – ${stateWord}`;
    const note      = (item.defectNote ?? "").trim();
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

  // Фотографии
  const photoBlocks: Paragraph[] = [];
  if (hasPhotos) {
    photoBlocks.push(
      BL(),
      new Paragraph({
        children: [TNR("Фотоматериалы:", { bold: true })],
        spacing:  { after: 0, line: 240, lineRule: "auto" },
      }),
    );
    for (let i = 0; i < (d.photos ?? []).length; i++) {
      const photo = d.photos![i];
      try {
        // Декодируем base64 Data URL → Buffer
        const base64 = photo.dataUrl.split(",")[1];
        const mimeMatch = photo.dataUrl.match(/^data:(image\/[a-z+]+);base64/);
        const mediaType = (mimeMatch?.[1] ?? "image/jpeg") as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/bmp"
          | "image/webp";
        const imageBuffer = Buffer.from(base64, "base64");

        photoBlocks.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer,
                transformation: { width: 300, height: 225 },
                type: mediaType,
              }),
            ],
            spacing: { after: 0, line: 240, lineRule: "auto" },
          }),
        );
        if (photo.caption) {
          photoBlocks.push(
            new Paragraph({
              children: [TNR(`Фото ${i + 1}: ${photo.caption}`, { size: 20, italics: true })],
              spacing:  { after: 0, line: 240, lineRule: "auto" },
            }),
          );
        } else {
          photoBlocks.push(
            new Paragraph({
              children: [TNR(`Фото ${i + 1}`, { size: 20, italics: true })],
              spacing:  { after: 0, line: 240, lineRule: "auto" },
            }),
          );
        }
        photoBlocks.push(BL());
      } catch {
        // Если изображение не удалось встроить – пропускаем
      }
    }
  }

  return [
    new Paragraph({
      children:        [new TextRun({ text: "", break: 1 })],
      pageBreakBefore: true,
      spacing:         { after: 0, line: 240, lineRule: "auto" },
    }),
    new Paragraph({
      children:  [TNR(`Приложение ${actNumStr}`.trim(), { bold: true })],
      spacing:   { after: 0, line: 720, lineRule: "auto" },
      alignment: AlignmentType.CENTER,
    }),
    bodyP([TNR(noWidows(
      `Перечень неисправностей и отклонений от штатного состояния ноутбука «${equipName}» ` +
      `(серийный номер: ${serial}), зафиксированных при передаче ${dateStr}:`,
    ))]),
    BL(),
    ...defectLines,
    BL(),
    ...photoBlocks,
    new Paragraph({
      children: [TNR(
        "Принимающая сторона подтверждает, что указанные выше недостатки " +
        "зафиксированы сторонами совместно и известны принимающей стороне " +
        "на момент приёма имущества.",
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
      children: [TNR(dateStr)],
      spacing:  { line: 240, lineRule: "auto" },
    }),
  ];
}

// ─── Сборка документа ─────────────────────────────────────────────────────────

async function buildDoc(d: Payload): Promise<Document> {
  const isSdacha = d.actType === "sdacha";
  const fullDate = (d.fullDate ?? "").trim() || `«___»___________ ${d.year} г.`;
  const actNumber = (d.actNumber ?? "").trim();

  // Родительный падеж для вводной части
  // Сдача: принял [receiverNom] от [surrendererGen]
  // Выдача: принял [receiverNom] от [issuerGen]
  const thirdPartyGenitiveLabel = isSdacha
    ? (d.surrendererGenitiveLabel ?? "").trim() || (d.surrendererLabel ?? "").trim() || MISSING
    : (d.issuerGenitiveLabel ?? "").trim()      || (d.issuerLabel ?? "").trim()      || MISSING;

  const receiverNom = (d.receiverLabel ?? "").trim() || MISSING;

  // Строки подписей – только инициалы (Фамилия И.О.)
  const actionLabel = isSdacha ? "Сдал:       " : "Выдал:  "; 
  const actionInitials  = isSdacha
    ? (d.surrendererLastNameInitials ?? d.surrendererLabel ?? "").trim()
    : (d.issuerLastNameInitials      ?? d.issuerLabel      ?? "").trim();
  const receiverInitials = (d.receiverLastNameInitials ?? d.receiverLabel ?? "").trim();

  // Вводная часть:
  // «[получатель именит.] принял от [сдающий/выдающий родит.] нижеперечисленное имущество:»
  // Убрана конструкция «который сдал/выдал» – юридически избыточна
  const intro = noWidows(
    `Настоящий акт составлен о том, что ${receiverNom} принял от ` +
    `${thirdPartyGenitiveLabel} нижеперечисленное имущество:`,
  );

  const appxParagraphs = await appendix(d);

  // Пункт «Основание»
  const basisParagraphs: Paragraph[] = [];
  const basisDoc = (d.basisDoc ?? "").trim();
  if (basisDoc) {
    basisParagraphs.push(
      new Paragraph({
        children: [
          TNR("Основание: ", { bold: true }),
          TNR(`${basisDoc}.`),
        ],
        spacing: { after: 0, line: 240, lineRule: "auto" },
      }),
      BL(),
    );
  }

  return new Document({
    sections: [
      {
        properties: PAGE,
        children: [
          ...headerBlock(d.commanderRank, d.commanderSign, d.year, fullDate, actNumber),
          ...basisParagraphs,
          bodyP([TNR(intro)]),
          buildItem1(d),
          ...additionalItems(d),
          BL(),
          signatureLine(actionLabel, actionInitials, d.year, fullDate),
          BL(), BL(),
          signatureLine("Принял:  ", receiverInitials, d.year, fullDate),
          BL(), BL(),
          ...appxParagraphs,
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
    const doc    = await buildDoc(parsed.data);
    const buffer = await Packer.toBuffer(doc);
    const d = parsed.data;

    // Имя файла: приоритет – сдающий (при сдаче) или принимающий (при выдаче)
    const personLabel =
      d.actType === "sdacha"
        ? (d.surrendererLabel ?? "").split(" ").find((p) => p.length > 2) ?? "документ"
        : (d.receiverLabel    ?? "").split(" ").find((p) => p.length > 2) ?? "документ";

    const actNumSuffix = (d.actNumber ?? "").trim() ? `_${d.actNumber}` : "";
    const typeLabel    = d.actType === "sdacha" ? "сдачи" : "выдачи";
    const filename     = encodeURIComponent(
      `акт_${typeLabel}_ноутбука_${personLabel}${actNumSuffix}.docx`,
    );

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