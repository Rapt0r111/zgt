import {
  Document, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  AlignmentType, UnderlineType, TabStopType, WidthType, BorderStyle, VerticalAlign,
} from "docx";
import {
  type Condition, type KitItem,
  getItemGender, CONDITION_ADJECTIVE, conditionPhrase,
  itemGoesToAppendix, computeOverallState, buildKitString, noWidows, parseDateString,
} from "./shared";

const FONT = "Times New Roman";
const SIZE_MAIN = 28;
const SIZE_SMALL = 22;
const CONTENT_WIDTH = 9354;
const INDENT_FIRST = 709;
const MISSING = "[ДАННЫЕ ОТСУТСТВУЮТ]";

export const PAGE_PROPS = {
  page: {
    size: { width: 11906, height: 16838 },
    margin: { top: 1134, right: 851, bottom: 1134, left: 1701 },
  },
} as const;

type RunOpts = Partial<ConstructorParameters<typeof TextRun>[0]>;

export const tnr = (text: string, opts: RunOpts = {}): TextRun =>
  new TextRun({ text, font: FONT, size: SIZE_MAIN, ...(opts as object) });

export const bl = (): Paragraph =>
  new Paragraph({ children: [], spacing: { after: 0, line: 240, lineRule: "auto" } });

export const bodyP = (
  children: TextRun[],
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.BOTH,
): Paragraph =>
  new Paragraph({
    children,
    spacing: { after: 0, line: 240, lineRule: "auto" },
    indent: { firstLine: INDENT_FIRST },
    alignment: align,
  });

export const indentP = (children: TextRun[]): Paragraph =>
  new Paragraph({
    children,
    spacing: { after: 0, line: 240, lineRule: "auto" },
    indent: { left: INDENT_FIRST },
  });

export const val = (s: string | null | undefined): string => {
  const t = (s ?? "").trim();
  return t.length > 0 ? t : MISSING;
};

export function dateToRuns(dateStr: string | undefined, year: string): TextRun[] {
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
  if (!parsed) return [tnr(input)];
  const { day, month, rest } = parsed;
  return [
    new TextRun({ ...uline, text: `«${day}»` } as object),
    new TextRun({ ...base, text: " " } as object),
    new TextRun({ ...uline, text: month } as object),
    new TextRun({ ...base, text: ` ${rest}` } as object),
  ];
}

export function signatureLine(label: string, initials: string, year: string, dateStr: string): Table {
  const name = initials.trim() || "___________";
  const noBorder = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
  const leftW = Math.round(CONTENT_WIDTH * 0.55);
  const rightW = Math.round(CONTENT_WIDTH * 0.45);

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [leftW, rightW],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorders,
            width: { size: leftW, type: WidthType.DXA },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            verticalAlign: VerticalAlign.BOTTOM,
            children: [
              new Paragraph({
                children: [
                  tnr(label),
                  new TextRun({ text: name, font: FONT, size: SIZE_MAIN, underline: { type: UnderlineType.SINGLE } }),
                  tnr(" /_______________"),
                ],
                spacing: { after: 0, line: 240, lineRule: "auto" },
              }),
            ],
          }),
          new TableCell({
            borders: noBorders,
            width: { size: rightW, type: WidthType.DXA },
            margins: { top: 0, bottom: 0, left: 240, right: 0 },
            verticalAlign: VerticalAlign.BOTTOM,
            children: [
              new Paragraph({
                children: dateToRuns(dateStr, year),
                spacing: { after: 0, line: 240, lineRule: "auto" },
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export function buildHeaderBlock(d: {
  commanderRank: string;
  commanderSign: string;
  year: string;
  fullDate?: string;
  actNumber?: string;
}): Paragraph[] {
  const actNumStr = (d.actNumber ?? "").trim() ? ` № ${d.actNumber!.trim()}` : "";
  const dateStr = d.fullDate?.trim() || `«___» ___________ ${d.year} г.`;

  return [
    new Paragraph({ children: [tnr("УТВЕРЖДАЮ")], spacing: { after: 0, line: 240, lineRule: "auto" }, indent: { left: 5387 } }),
    new Paragraph({ children: [tnr("Командир роты (научной)")], spacing: { after: 0, line: 240, lineRule: "auto" }, indent: { left: 5387 } }),
    new Paragraph({ children: [tnr(val(d.commanderRank))], spacing: { after: 0, line: 240, lineRule: "auto" }, indent: { left: 5387 } }),
    new Paragraph({
      children: [tnr(val(d.commanderSign))],
      spacing: { after: 0, line: 360, lineRule: "auto" },
      indent: { left: 4678, firstLine: 2693 },
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({ children: dateToRuns(dateStr, d.year), spacing: { after: 0, line: 240, lineRule: "auto" }, indent: { left: 5387 } }),
    bl(), bl(),
    new Paragraph({
      children: [
        new TextRun({ text: `АКТ${actNumStr}`, font: FONT, size: SIZE_MAIN, bold: true }),
        new TextRun({ text: "приёма-передачи оборудования", font: FONT, size: SIZE_MAIN, bold: true, break: 1 }),
      ],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        tnr("г. Санкт-Петербург"),
        new TextRun({ text: "\t", font: FONT, size: SIZE_MAIN }),
        ...dateToRuns(dateStr, d.year),
      ],
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
      spacing: { after: 0, line: 240, lineRule: "auto" },
    }),
    bl(), bl(),
  ];
}

export function buildItem1(equipmentName: string, serialNumber: string, kitItems: KitItem[], hasCustomDefects: boolean): Paragraph {
  const kitStr = buildKitString(kitItems);
  const { text: overallState } = computeOverallState(kitItems, hasCustomDefects);
  return bodyP([tnr(noWidows(`1. Ноутбук «${val(equipmentName)}» (серийный номер: ${val(serialNumber)}; в комплекте: ${kitStr})${overallState}.`))]);
}

export function buildAdditionalItems(passNumbers?: string | null, flashDriveNumbers?: string | null): Paragraph[] {
  const items: Paragraph[] = [];
  const pass = (passNumbers ?? "").trim();
  const flash = (flashDriveNumbers ?? "").trim();
  if (pass) items.push(indentP([tnr(noWidows(`2. Электронный пропуск № ${pass}.`))]));
  if (flash) items.push(indentP([tnr(noWidows(`3. USB-накопитель МО РФ № ${flash}.`))]));
  return items;
}

function getDocxImageType(mimeType: string): "jpg" | "png" | "gif" | "bmp" {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("bmp")) return "bmp";
  return "jpg";
}

function parseImageDimensions(base64: string): { width: number; height: number } {
  const MAX_W = 400;
  const MAX_H = 300;
  try {
    const bytes = Buffer.from(base64, "base64");
    let srcW = 0;
    let srcH = 0;

    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      let i = 2;
      while (i < bytes.length - 8) {
        if (bytes[i] !== 0xff) break;
        const marker = bytes[i + 1];
        const len = bytes.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xc3) {
          srcH = bytes.readUInt16BE(i + 5);
          srcW = bytes.readUInt16BE(i + 7);
          break;
        }
        i += 2 + len;
      }
    } else if (bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      srcW = bytes.readUInt32BE(16);
      srcH = bytes.readUInt32BE(20);
    }

    if (srcW > 0 && srcH > 0) {
      const ratio = Math.min(MAX_W / srcW, MAX_H / srcH, 1);
      return { width: Math.round(srcW * ratio), height: Math.round(srcH * ratio) };
    }
  } catch {
    // fall through
  }
  return { width: MAX_W, height: MAX_H };
}

export async function buildAppendix(d: {
  kitItems: KitItem[];
  defects?: string | null;
  photos?: Array<{ dataUrl: string; caption?: string }>;
  equipmentName: string;
  serialNumber: string;
  actNumber?: string;
  year: string;
  fullDate?: string;
  receiverRankShort?: string;
  receiverLastNameInitials?: string;
}): Promise<(Paragraph | Table)[]> {
  const defectiveItems = d.kitItems.filter((i) => itemGoesToAppendix(i.condition));
  const hasCustomDefects = !!(d.defects ?? "").trim();
  const hasPhotos = (d.photos ?? []).length > 0;

  if (defectiveItems.length === 0 && !hasCustomDefects && !hasPhotos) return [];

  const receiverRankShort = (d.receiverRankShort ?? "").trim() || "рядовой";
  const receiverLastNameInitials = val(d.receiverLastNameInitials);
  const actNumStr = (d.actNumber ?? "").trim() ? `к акту № ${d.actNumber!.trim()}` : "";
  const equipName = val(d.equipmentName);
  const serial = val(d.serialNumber);
  const dateStr = d.fullDate?.trim() || `«___» ___________ ${d.year} г.`;

  const defectLines: Paragraph[] = [
    ...defectiveItems.map((item, idx) => {
      const gender = getItemGender(item.name);
      const stateWord = CONDITION_ADJECTIVE[item.condition as Condition][gender];
      const note = (item.defectNote ?? "").trim();
      return indentP([tnr(`${idx + 1}. ${val(item.name)} – ${stateWord}${note ? `: ${note}` : ""}.`)]);
    }),
    ...(hasCustomDefects
      ? [indentP([tnr(noWidows(`${defectiveItems.length + 1}. Прочие дефекты: ${d.defects!.trim()}.`))])]
      : []),
  ];

  const photoBlocks: (Paragraph | Table)[] = [];
  if (hasPhotos) {
    photoBlocks.push(
      bl(),
      new Paragraph({ children: [tnr("Фотоматериалы:", { bold: true })], spacing: { after: 0, line: 240, lineRule: "auto" } }),
    );

    for (let i = 0; i < d.photos!.length; i++) {
      const photo = d.photos![i];
      try {
        const base64Data = photo.dataUrl.split(",")[1];
        const mimeMatch = photo.dataUrl.match(/^data:(image\/[a-z+.-]+);base64/);
        const mimeType = mimeMatch?.[1] ?? "image/jpeg";
        const docxType = getDocxImageType(mimeType);
        const dims = parseImageDimensions(base64Data);
        const imageBuffer = new Uint8Array(Buffer.from(base64Data, "base64"));

        photoBlocks.push(
          new Paragraph({
            children: [new ImageRun({ data: imageBuffer, transformation: dims, type: docxType })],
            spacing: { before: 120, after: 0, line: 240, lineRule: "auto" },
          }),
          new Paragraph({
            children: [tnr(`Фото ${i + 1}${photo.caption ? `: ${photo.caption}` : ""}`, { size: SIZE_SMALL, italics: true })],
            spacing: { after: 120, line: 240, lineRule: "auto" },
          }),
        );
      } catch {
        // skip broken image
      }
    }
  }

  return [
    new Paragraph({ pageBreakBefore: true, children: [], spacing: { after: 0, line: 240, lineRule: "auto" } }),
    new Paragraph({
      children: [tnr(`Приложение ${actNumStr}`.trim(), { bold: true })],
      spacing: { after: 0, line: 720, lineRule: "auto" },
      alignment: AlignmentType.CENTER,
    }),
    bodyP([tnr(noWidows(
      `Перечень неисправностей и отклонений от штатного состояния ноутбука «${equipName}» ` +
      `(серийный номер: ${serial}), зафиксированных при передаче ${dateStr}:`,
    ))]),
    bl(),
    ...defectLines,
    bl(),
    ...photoBlocks,
    new Paragraph({
      children: [tnr("Принимающая сторона подтверждает, что указанные выше недостатки зафиксированы сторонами совместно и известны принимающей стороне на момент приёма имущества.")],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      alignment: AlignmentType.BOTH,
    }),
    bl(),
    new Paragraph({ children: [tnr("С перечнем ознакомлен и согласен:")], spacing: { line: 240, lineRule: "auto" } }),
    bl(),
    new Paragraph({ children: [tnr(receiverRankShort)], spacing: { line: 240, lineRule: "auto" } }),
    new Paragraph({
      children: [new TextRun({ text: receiverLastNameInitials, font: FONT, size: SIZE_MAIN, underline: { type: UnderlineType.SINGLE } })],
      spacing: { line: 240, lineRule: "auto" },
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({ children: dateToRuns(dateStr, d.year), spacing: { line: 240, lineRule: "auto" } }),
  ];
}

export async function buildActDocument(d: {
  actType: string;
  actNumber?: string;
  fullDate?: string;
  year: string;
  basisDoc?: string | null;
  commanderRank: string;
  commanderSign: string;
  equipmentName: string;
  serialNumber: string;
  kitItems: KitItem[];
  defects?: string | null;
  flashDriveNumbers?: string | null;
  passNumbers?: string | null;
  photos?: Array<{ dataUrl: string; caption?: string }>;
  surrendererLabel?: string;
  receiverLabel?: string;
  issuerLabel?: string;
  surrendererGenitiveLabel?: string;
  receiverGenitiveLabel?: string;
  issuerGenitiveLabel?: string;
  surrendererLastNameInitials?: string;
  receiverLastNameInitials?: string;
  issuerLastNameInitials?: string;
  receiverRankShort?: string;
}): Promise<Document> {
  const isSdacha = d.actType === "sdacha";
  const dateStr = d.fullDate?.trim() || `«___»___________ ${d.year} г.`;

  const thirdPartyGenLabel = isSdacha
    ? (d.surrendererGenitiveLabel ?? "").trim() || (d.surrendererLabel ?? "").trim() || MISSING
    : (d.issuerGenitiveLabel ?? "").trim() || (d.issuerLabel ?? "").trim() || MISSING;

  const receiverNom = (d.receiverLabel ?? "").trim() || MISSING;
  const actionLabel = isSdacha ? "Сдал:    " : "Выдал:   ";
  const actionInitials = isSdacha
    ? (d.surrendererLastNameInitials ?? d.surrendererLabel ?? "").trim()
    : (d.issuerLastNameInitials ?? d.issuerLabel ?? "").trim();
  const receiverInitials = (d.receiverLastNameInitials ?? d.receiverLabel ?? "").trim();

  const basisDoc = (d.basisDoc ?? "").trim();
  const basisParagraphs: Paragraph[] = basisDoc
    ? [
        new Paragraph({
          children: [tnr("Основание: ", { bold: true }), tnr(`${basisDoc}.`)],
          spacing: { after: 0, line: 240, lineRule: "auto" },
        }),
        bl(),
      ]
    : [];

  const appendixBlocks = await buildAppendix({
    kitItems: d.kitItems,
    defects: d.defects,
    photos: d.photos,
    equipmentName: d.equipmentName,
    serialNumber: d.serialNumber,
    actNumber: d.actNumber,
    year: d.year,
    fullDate: d.fullDate,
    receiverRankShort: d.receiverRankShort,
    receiverLastNameInitials: d.receiverLastNameInitials,
  });

  return new Document({
    sections: [
      {
        properties: PAGE_PROPS,
        children: [
          ...buildHeaderBlock(d),
          ...basisParagraphs,
          bodyP([tnr(noWidows(`Настоящий акт составлен о том, что ${receiverNom} принял от ${thirdPartyGenLabel} нижеперечисленное имущество:`))]),
          buildItem1(d.equipmentName, d.serialNumber, d.kitItems, !!(d.defects ?? "").trim()),
          ...buildAdditionalItems(d.passNumbers, d.flashDriveNumbers),
          bl(),
          signatureLine(actionLabel, actionInitials, d.year, dateStr),
          bl(),
          signatureLine("Принял: ", receiverInitials, d.year, dateStr),
          bl(),
          ...(appendixBlocks as Paragraph[]),
        ],
      },
    ],
  });
}