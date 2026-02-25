import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  UnderlineType,
  TabStopType,
  WidthType,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  VerticalAlign,
} from "docx";
import { z } from "zod";
import {
  CONDITION_VALUES,
  type Condition,
  type KitItem,
  getItemGender,
  CONDITION_ADJECTIVE,
  conditionPhrase,
  itemGoesToAppendix,
  computeOverallState,
  buildKitString,
  noWidows,
  parseDateString,
} from "@/lib/acts/shared";

// ─── Константы документа ──────────────────────────────────────────────────────

const MISSING = "[ДАННЫЕ ОТСУТСТВУЮТ]";
const FONT = "Times New Roman";
const SIZE_MAIN = 28; // 14pt в half-points
const SIZE_SMALL = 22; // 11pt

// A4, поля: top 2cm, right 0.6cm, bottom 2cm, left 3cm
const PAGE_PROPS = {
  page: {
    size: { width: 11906, height: 16838 },
    margin: { top: 1134, right: 851, bottom: 1134, left: 1701 },
  },
} as const;

// Ширина полосы набора в DXA (11906 - 1701 - 851 = 9354)
const CONTENT_WIDTH = 9354;
const INDENT_FIRST = 709; // 1.25cm ≈ 709 DXA

// ─── Схема валидации ──────────────────────────────────────────────────────────

const KitItemSchema = z.object({
  name: z.string().min(1).max(200),
  condition: z.enum(CONDITION_VALUES).default("ok"),
  defectNote: z.string().max(500).nullable().optional(),
});

const PhotoSchema = z.object({
  dataUrl: z.string().startsWith("data:image/"),
  caption: z.string().max(300).optional(),
});

const ActPayloadSchema = z.object({
  actType: z.enum(["sdacha", "vydacha"]),
  actNumber: z
    .string()
    .max(50)
    .optional()
    .transform((v) => v?.trim() || ""),
  fullDate: z.string().max(100).optional(),
  year: z.string().regex(/^\d{4}$/),
  basisDoc: z.string().max(500).nullable().optional(),
  commanderRank: z.string().min(1).max(100),
  commanderSign: z.string().min(1).max(100),
  equipmentName: z.string().min(1).max(500),
  serialNumber: z.string().min(1).max(200),
  kitItems: z.array(KitItemSchema).min(1).max(20),
  defects: z.string().max(2000).nullable().optional(),
  flashDriveNumbers: z.string().max(1000).nullable().optional(),
  passNumbers: z.string().max(1000).nullable().optional(),
  photos: z.array(PhotoSchema).max(20).optional(),

  // Именительный (подписи)
  surrendererLabel: z.string().max(300).optional(),
  receiverLabel: z.string().max(300).optional(),
  issuerLabel: z.string().max(300).optional(),

  // Родительный (вводная часть)
  surrendererGenitiveLabel: z.string().max(300).optional(),
  receiverGenitiveLabel: z.string().max(300).optional(),
  issuerGenitiveLabel: z.string().max(300).optional(),

  receiverRankShort: z.string().max(100).optional(),
  receiverLastNameInitials: z.string().max(200).optional(),
  surrendererLastNameInitials: z.string().max(200).optional(),
  issuerLastNameInitials: z.string().max(200).optional(),
});

type Payload = z.infer<typeof ActPayloadSchema>;

// ─── Утилиты ──────────────────────────────────────────────────────────────────

const val = (s: string | null | undefined): string => {
  const t = (s ?? "").trim();
  return t.length > 0 ? t : MISSING;
};

// ─── Базовые конструкторы ──────────────────────────────────────────────────────

type RunOpts = Partial<ConstructorParameters<typeof TextRun>[0]>;

const TNR = (text: string, opts: RunOpts = {}): TextRun =>
  new TextRun({ text, font: FONT, size: SIZE_MAIN, ...(opts as object) });

const BL = (): Paragraph =>
  new Paragraph({
    children: [],
    spacing: { after: 0, line: 240, lineRule: "auto" },
  });

const bodyP = (children: TextRun[], align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.BOTH): Paragraph =>
  new Paragraph({
    children,
    spacing: { after: 0, line: 240, lineRule: "auto" },
    indent: { firstLine: INDENT_FIRST },
    alignment: align,
  });

const indentP = (children: TextRun[]): Paragraph =>
  new Paragraph({
    children,
    spacing: { after: 0, line: 240, lineRule: "auto" },
    indent: { left: INDENT_FIRST },
  });

// ─── Подчёркнутые даты ───────────────────────────────────────────────────────

/**
 * Строит массив TextRun с подчёркнутыми днём и месяцем.
 * Формат входа: «01» января 2026 г.
 */
function dateToRuns(dateStr: string | undefined, year: string): TextRun[] {
  const base: RunOpts = { font: FONT, size: SIZE_MAIN };
  const uline: RunOpts = { ...base, underline: { type: UnderlineType.SINGLE } };

  const input = (dateStr ?? "").trim();

  if (!input || input.includes("___")) {
    return [
      new TextRun({ ...uline, text: "«___»" } as object),
      new TextRun({ ...base, text: " " } as object),
      new TextRun({ ...uline, text: "___________" } as object),
      new TextRun({ ...base, text: ` ${year} г.` } as object),
    ];
  }

  const parsed = parseDateString(input);
  if (!parsed) return [TNR(input)];

  const { day, month, rest } = parsed;
  return [
    new TextRun({ ...uline, text: "«" } as object),
    new TextRun({ ...uline, text: day } as object),
    new TextRun({ ...uline, text: "»" } as object),
    new TextRun({ ...base, text: " " } as object),
    new TextRun({ ...uline, text: month } as object),
    new TextRun({ ...base, text: ` ${rest}` } as object),
  ];
}

// ─── Блок «УТВЕРЖДАЮ» ────────────────────────────────────────────────────────

function headerBlock(d: Payload): Paragraph[] {
  const { commanderRank, commanderSign, year, fullDate, actNumber } = d;
  const actNumStr = actNumber?.trim() ? ` № ${actNumber.trim()}` : "";
  const dateStr = fullDate?.trim() || `«___» ___________ ${year} г.`;

  return [
    new Paragraph({
      children: [TNR("УТВЕРЖДАЮ")],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 5387 },
    }),
    new Paragraph({
      children: [TNR("Командир роты (научной)")],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 5387 },
    }),
    new Paragraph({
      children: [TNR(val(commanderRank))],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 5387 },
    }),
    // Подпись с отступом, чтобы «подпись / расшифровка» выглядела как бланк
    new Paragraph({
      children: [TNR(val(commanderSign))],
      spacing: { after: 0, line: 360, lineRule: "auto" },
      indent: { left: 4678, firstLine: 2693 },
      alignment: AlignmentType.RIGHT,
    }),
    // Дата утверждения (с подчёркиванием дня и месяца)
    new Paragraph({
      children: dateToRuns(dateStr, year),
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 5387 },
    }),
    BL(),
    BL(),
    // Заголовок акта
    new Paragraph({
      children: [
        new TextRun({
          text: `АКТ${actNumStr}`,
          font: FONT,
          size: SIZE_MAIN,
          bold: true,
        }),
        new TextRun({
          text: "приёма-передачи оборудования",
          font: FONT,
          size: SIZE_MAIN,
          bold: true,
          break: 1,
        }),
      ],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      alignment: AlignmentType.CENTER,
    }),
    // Город и дата в одну строку через таб
    new Paragraph({
      children: [
        TNR("г. Санкт-Петербург"),
        new TextRun({ text: "\t", font: FONT, size: SIZE_MAIN }),
        ...dateToRuns(dateStr, year),
      ],
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
      spacing: { after: 0, line: 240, lineRule: "auto" },
    }),
    BL(),
    BL(),
  ];
}

// ─── Строка подписи ───────────────────────────────────────────────────────────

/**
 * Строка вида:
 *   Сдал:   <u>Фамилия И.О.</u> /_______________     <u>«01»</u> <u>января</u> 2026 г.
 *
 * Использует таблицу из двух колонок для надёжного выравнивания
 * (пробелы в шрифтах пропорциональны — Count of spaces unreliable).
 */
function signatureLine(label: string, initials: string, year: string, dateStr: string): Table {
  const name = initials.trim() || "___________";
  const noBorder = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

  const leftCell = new TableCell({
    borders: noBorders,
    width: { size: Math.round(CONTENT_WIDTH * 0.55), type: WidthType.DXA },
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    verticalAlign: VerticalAlign.BOTTOM,
    children: [
      new Paragraph({
        children: [
          TNR(label),
          new TextRun({
            text: name,
            font: FONT,
            size: SIZE_MAIN,
            underline: { type: UnderlineType.SINGLE },
          }),
          TNR(" /_______________"),
        ],
        spacing: { after: 0, line: 240, lineRule: "auto" },
      }),
    ],
  });

  const rightCell = new TableCell({
    borders: noBorders,
    width: { size: Math.round(CONTENT_WIDTH * 0.45), type: WidthType.DXA },
    margins: { top: 0, bottom: 0, left: 240, right: 0 },
    verticalAlign: VerticalAlign.BOTTOM,
    children: [
      new Paragraph({
        children: dateToRuns(dateStr, year),
        spacing: { after: 0, line: 240, lineRule: "auto" },
        alignment: AlignmentType.RIGHT,
      }),
    ],
  });

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [Math.round(CONTENT_WIDTH * 0.55), Math.round(CONTENT_WIDTH * 0.45)],
    rows: [new TableRow({ children: [leftCell, rightCell] })],
  });
}

// ─── Пункт 1 — ноутбук ───────────────────────────────────────────────────────

function buildItem1(d: Payload): Paragraph {
  const equipName = val(d.equipmentName);
  const serial = val(d.serialNumber);
  const kitStr = buildKitString(d.kitItems as KitItem[]);
  const { text: overallState } = computeOverallState(
    d.kitItems as KitItem[],
    !!(d.defects ?? "").trim(),
  );

  return bodyP([
    TNR(
      noWidows(
        `1. Ноутбук «${equipName}» (серийный номер: ${serial}; в комплекте: ${kitStr})${overallState}.`,
      ),
    ),
  ]);
}

// ─── Дополнительные пункты ────────────────────────────────────────────────────

function additionalItems(d: Payload): Paragraph[] {
  const pass = (d.passNumbers ?? "").trim();
  const flash = (d.flashDriveNumbers ?? "").trim();
  const items: Paragraph[] = [];
  if (pass) items.push(indentP([TNR(noWidows(`2. Электронный пропуск № ${pass}.`))]));
  if (flash) items.push(indentP([TNR(noWidows(`3. USB-накопитель МО РФ № ${flash}.`))]));
  return items;
}

// ─── Ресайз изображений на сервере ───────────────────────────────────────────

const MAX_PHOTO_WIDTH = 400;
const MAX_PHOTO_HEIGHT = 300;

interface PhotoDimensions {
  width: number;
  height: number;
}

function calcPhotoDimensions(originalW: number, originalH: number): PhotoDimensions {
  const ratio = Math.min(MAX_PHOTO_WIDTH / originalW, MAX_PHOTO_HEIGHT / originalH, 1);
  return {
    width: Math.round(originalW * ratio),
    height: Math.round(originalH * ratio),
  };
}

function getDocxImageType(mimeType: string): "jpg" | "png" | "gif" | "bmp" {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("bmp")) return "bmp";
  // Для всех остальных (jpeg, webp и т.д.) используем "jpg"
  return "jpg";
}

// ─── Приложение ──────────────────────────────────────────────────────────────

async function buildAppendix(d: Payload): Promise<(Paragraph | Table)[]> {
  const defectiveItems = (d.kitItems as KitItem[]).filter((i) => itemGoesToAppendix(i.condition));
  const hasCustomDefects = !!(d.defects ?? "").trim();
  const hasPhotos = (d.photos ?? []).length > 0;

  if (defectiveItems.length === 0 && !hasCustomDefects && !hasPhotos) return [];

  const receiverRankShort = (d.receiverRankShort ?? "").trim() || "рядовой";
  const receiverLastNameInitials = val(d.receiverLastNameInitials);
  const actNumStr = (d.actNumber ?? "").trim() ? `к акту № ${d.actNumber!.trim()}` : "";
  const equipName = val(d.equipmentName);
  const serial = val(d.serialNumber);
  const dateStr = d.fullDate?.trim() || `«___» ___________ ${d.year} г.`;

  // Перечень дефектов
  const defectLines: Paragraph[] = defectiveItems.map((item, idx) => {
    const gender = getItemGender(item.name);
    const stateWord = CONDITION_ADJECTIVE[item.condition as Condition][gender];
    const prefix = `${idx + 1}. ${val(item.name)} – ${stateWord}`;
    const note = (item.defectNote ?? "").trim();
    return indentP([TNR(note ? `${prefix}: ${note}.` : `${prefix}.`)]);
  });

  if (hasCustomDefects) {
    defectLines.push(
      indentP([
        TNR(
          noWidows(
            `${defectiveItems.length + 1}. Прочие дефекты: ${d.defects!.trim()}.`,
          ),
        ),
      ]),
    );
  }

  // Фотографии
  const photoBlocks: (Paragraph | Table)[] = [];
  if (hasPhotos) {
    photoBlocks.push(
      BL(),
      new Paragraph({
        children: [TNR("Фотоматериалы:", { bold: true })],
        spacing: { after: 0, line: 240, lineRule: "auto" },
      }),
    );

    for (let i = 0; i < (d.photos ?? []).length; i++) {
      const photo = d.photos![i];
      try {
        const base64Data = photo.dataUrl.split(",")[1];
        const mimeMatch = photo.dataUrl.match(/^data:(image\/[a-z+.-]+);base64/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

        // Используем функцию маппинга для получения типа "jpg" | "png" | и т.д.
        const docxType = getDocxImageType(mimeType);
        const imageBuffer = new Uint8Array(Buffer.from(base64Data, "base64"));

        // Используем фиксированные размеры (без Sharp на сервере)
        const dims = calcPhotoDimensions(800, 600);

        photoBlocks.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer,
                transformation: { 
                  width: dims.width, 
                  height: dims.height 
                },
                type: docxType,
              }),
            ],
            spacing: { before: 120, after: 0, line: 240, lineRule: "auto" },
          }),
          new Paragraph({
            children: [
              TNR(
                `Фото ${i + 1}${photo.caption ? `: ${photo.caption}` : ""}`,
                { size: SIZE_SMALL, italics: true },
              ),
            ],
            spacing: { after: 120, line: 240, lineRule: "auto" },
          }),
        );
      } catch (err) {
        console.error(`Ошибка обработки фото ${i}:`, err);
        // Пропускаем неудачное изображение
      }
    }
  }

  return [
    // Разрыв страницы
    new Paragraph({
      pageBreakBefore: true,
      children: [],
      spacing: { after: 0, line: 240, lineRule: "auto" },
    }),
    // Заголовок приложения
    new Paragraph({
      children: [TNR(`Приложение ${actNumStr}`.trim(), { bold: true })],
      spacing: { after: 0, line: 720, lineRule: "auto" },
      alignment: AlignmentType.CENTER,
    }),
    // Вводная часть приложения
    bodyP([
      TNR(
        noWidows(
          `Перечень неисправностей и отклонений от штатного состояния ноутбука «${equipName}» ` +
            `(серийный номер: ${serial}), зафиксированных при передаче ${dateStr}:`,
        ),
      ),
    ]),
    BL(),
    ...defectLines,
    BL(),
    ...photoBlocks,
    // Подтверждение принимающей стороны
    new Paragraph({
      children: [
        TNR(
          "Принимающая сторона подтверждает, что указанные выше недостатки " +
            "зафиксированы сторонами совместно и известны принимающей стороне " +
            "на момент приёма имущества.",
        ),
      ],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      alignment: AlignmentType.BOTH,
    }),
    BL(),
    new Paragraph({
      children: [TNR("С перечнем ознакомлен и согласен:")],
      spacing: { line: 240, lineRule: "auto" },
    }),
    BL(),
    new Paragraph({
      children: [TNR(receiverRankShort)],
      spacing: { line: 240, lineRule: "auto" },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: receiverLastNameInitials,
          font: FONT,
          size: SIZE_MAIN,
          underline: { type: UnderlineType.SINGLE },
        }),
      ],
      spacing: { line: 240, lineRule: "auto" },
      alignment: AlignmentType.RIGHT,
    }),
    // Дата в приложении — тоже с подчёркиванием
    new Paragraph({
      children: dateToRuns(dateStr, d.year),
      spacing: { line: 240, lineRule: "auto" },
    }),
  ];
}

// ─── Сборка документа ─────────────────────────────────────────────────────────

async function buildDoc(d: Payload): Promise<Document> {
  const isSdacha = d.actType === "sdacha";
  const dateStr = d.fullDate?.trim() || `«___»___________ ${d.year} г.`;

  // Родительный падеж для вводной части
  const thirdPartyGenLabel = isSdacha
    ? (d.surrendererGenitiveLabel ?? "").trim() || (d.surrendererLabel ?? "").trim() || MISSING
    : (d.issuerGenitiveLabel ?? "").trim() || (d.issuerLabel ?? "").trim() || MISSING;

  const receiverNom = (d.receiverLabel ?? "").trim() || MISSING;

  // Инициалы для строк подписей
  const actionLabel = isSdacha ? "Сдал:    " : "Выдал:   ";
  const actionInitials = isSdacha
    ? (d.surrendererLastNameInitials ?? d.surrendererLabel ?? "").trim()
    : (d.issuerLastNameInitials ?? d.issuerLabel ?? "").trim();
  const receiverInitials = (d.receiverLastNameInitials ?? d.receiverLabel ?? "").trim();

  // Вводная часть
  const intro = noWidows(
    `Настоящий акт составлен о том, что ${receiverNom} принял от ` +
      `${thirdPartyGenLabel} нижеперечисленное имущество:`,
  );

  // Пункт «Основание»
  const basisParagraphs: Paragraph[] = [];
  const basisDoc = (d.basisDoc ?? "").trim();
  if (basisDoc) {
    basisParagraphs.push(
      new Paragraph({
        children: [TNR("Основание: ", { bold: true }), TNR(`${basisDoc}.`)],
        spacing: { after: 0, line: 240, lineRule: "auto" },
      }),
      BL(),
    );
  }

  const appendixBlocks = await buildAppendix(d);

  return new Document({
    sections: [
      {
        properties: PAGE_PROPS,
        children: [
          ...headerBlock(d),
          ...basisParagraphs,
          bodyP([TNR(intro)]),
          buildItem1(d),
          ...additionalItems(d),
          BL(),
          signatureLine(actionLabel, actionInitials, d.year, dateStr),
          BL(),
          signatureLine("Принял: ", receiverInitials, d.year, dateStr),
          BL(),
          ...(appendixBlocks as Paragraph[]),
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
    const doc = await buildDoc(parsed.data);
    const buffer = await Packer.toBuffer(doc);
    const d = parsed.data;

    const personLabel =
      d.actType === "sdacha"
        ? (d.surrendererLabel ?? "").split(" ").find((p) => p.length > 2) ?? "документ"
        : (d.receiverLabel ?? "").split(" ").find((p) => p.length > 2) ?? "документ";

    const actNumSuffix = (d.actNumber ?? "").trim() ? `_${d.actNumber}` : "";
    const typeLabel = d.actType === "sdacha" ? "сдачи" : "выдачи";
    const filename = encodeURIComponent(
      `акт_${typeLabel}_ноутбука_${personLabel}${actNumSuffix}.docx`,
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[acts/generate]", err);
    return NextResponse.json({ error: "Ошибка формирования документа" }, { status: 500 });
  }
}