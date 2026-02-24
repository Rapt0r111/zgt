import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType, TabStopType } from "docx";
import { z } from "zod";

const ActPayloadSchema = z.object({
  actType: z.enum(["sdacha", "vydacha"]),
  year: z.string().regex(/^\d{4}$/),
  commanderRank: z.string().min(1).max(100),
  commanderSign: z.string().min(1).max(100),
  equipmentName: z.string().min(1).max(500),
  serialNumber: z.string().min(1).max(200),
  kit: z.string().min(1).max(1000),
  defects: z.string().max(2000).nullable().optional(),
  flashDriveNumbers: z.string().max(1000).nullable().optional(),
  passNumbers: z.string().max(1000).nullable().optional(),
  surrendererRank: z.string().max(200).optional(),
  surrendererName: z.string().max(200).optional(),
  receiverRank: z.string().max(200).optional(),
  receiverName: z.string().max(200).optional(),
  issuerRank: z.string().max(200).optional(),
  issuerName: z.string().max(200).optional(),
  receiverRankShort: z.string().max(100).optional(),
  receiverLastNameInitials: z.string().max(200).optional(),
});

type Payload = z.infer<typeof ActPayloadSchema>;

// Заменяет однобуквенные предлоги/союзы перед пробелом на неразрывный пробел,
// чтобы избежать висячих предлогов в конце строки.
const WIDOWS_RE = /\b([авиксуоАВИКСУО])\s+/g;
const noWidows = (t: string) => t.replace(WIDOWS_RE, (_, p) => `${p}\u00A0`);

const TNR = (text: string, opts: Partial<ConstructorParameters<typeof TextRun>[0]> = {}) =>
  new TextRun({ text, font: "Times New Roman", size: 28, ...(opts as object) });

const BL = () => new Paragraph({ children: [], spacing: { after: 0, line: 240, lineRule: "auto" } });

const bodyP = (children: TextRun[]) =>
  new Paragraph({
    children,
    spacing: { after: 0, line: 240, lineRule: "auto" },
    indent: { firstLine: 709 },
    alignment: AlignmentType.BOTH,
  });

// A4: ширина 11906, высота 16838 DXA.
// Поля: верх 2 см (1134), право 0.6 см (851), низ 0.8 см (454) — оставляем 1134 для симметрии,
// лево 1.2 см (680) — используем 1701 (~3 см) для переплёта, как в оригинале.
const PAGE = {
  page: {
    size: { width: 11906, height: 16838 },
    margin: { top: 1134, right: 850, bottom: 1134, left: 1701 },
  },
} as const;

function headerBlock(rank: string, sign: string, year: string): Paragraph[] {
  return [
    new Paragraph({
      children: [TNR("УТВЕРЖДАЮ")],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 5387 },
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [TNR("Командир роты (научной)")],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 5387 },
    }),
    new Paragraph({
      children: [TNR(rank)],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 5387 },
    }),
    new Paragraph({
      children: [TNR(sign)],
      spacing: { after: 0, line: 360, lineRule: "auto" },
      indent: { left: 4678, firstLine: 2693 },
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      children: [TNR(`«___» ________ ${year} г.`)],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 5387 },
    }),
    BL(), BL(),
    new Paragraph({
      children: [
        new TextRun({ text: "АКТ", font: "Times New Roman", size: 28, bold: true }),
        new TextRun({ text: "приёма-передачи в эксплуатацию", font: "Times New Roman", size: 28, bold: true, break: 1 }),
        new TextRun({ text: "оборудования", font: "Times New Roman", size: 28, bold: true, break: 1 }),
      ],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [TNR(`г. Санкт-Петербург                                                        «___»___________ ${year} г.`)],
      spacing: { after: 0, line: 240, lineRule: "auto" },
    }),
    BL(), BL(),
  ];
}

function signatureLine(label: string, name: string, year: string): Paragraph {
  // name может быть пустым, если участник не выбран — подставляем прочерк
  const displayName = name.trim() || "___________";
  return new Paragraph({
    children: [
      TNR(`${label}   `),
      new TextRun({
        text: `${displayName} `,
        font: "Times New Roman",
        size: 28,
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
 * Формирует пункты 2 и 3 перечня имущества с фиксированными позициями:
 *   2 — электронный пропуск
 *   3 — USB-накопитель МО РФ
 *
 * Для акта сдачи: позиция включается только при наличии данных.
 * Для акта выдачи: позиция всегда присутствует; если данные не указаны —
 *   выводится строка-заглушка для заполнения вручную.
 */
function additionalItems(d: Payload): Paragraph[] {
  const isSdacha = d.actType === "sdacha";
  const pass = d.passNumbers?.trim();
  const flash = d.flashDriveNumbers?.trim();
  const items: Paragraph[] = [];

  const itemP = (text: string) =>
    new Paragraph({
      children: [TNR(noWidows(text))],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 709 },
    });

  // Позиция 2: электронный пропуск
  if (pass) {
    items.push(itemP(`2. Электронный пропуск № ${pass}.`));
  } else if (!isSdacha) {
    items.push(itemP("2. Электронный пропуск №"));
  }

  // Позиция 3: USB-накопитель
  if (flash) {
    items.push(itemP(`3. USB-накопитель МО РФ № ${flash}.`));
  } else if (!isSdacha) {
    items.push(itemP("3. USB-накопитель МО РФ №"));
  }

  return items;
}

/**
 * Формирует Приложение с описанием дефектов (только если поле defects заполнено).
 * Добавляется на новой странице и содержит подпись получателя.
 */
function appendix(d: Payload): Paragraph[] {
  if (!d.defects?.trim()) return [];

  const receiverRankShort = d.receiverRankShort?.trim() || "рядовой";
  const receiverLastNameInitials = d.receiverLastNameInitials?.trim() || "___________";

  return [
    new Paragraph({
      children: [new TextRun({ text: "", break: 1 })],
      pageBreakBefore: true,
      spacing: { after: 0, line: 240, lineRule: "auto" },
    }),
    new Paragraph({
      children: [TNR("Приложение", { bold: true })],
      spacing: { after: 0, line: 720, lineRule: "auto" },
      alignment: AlignmentType.CENTER,
    }),
    bodyP([TNR(noWidows(`Неисправности ноутбука «${d.equipmentName}», серийный номер ${d.serialNumber}: ${d.defects.trim()}.`))]),
    BL(),
    new Paragraph({
      children: [TNR("Корректность сведений подтверждаю:")],
      spacing: { line: 240, lineRule: "auto" },
    }),
    BL(),
    new Paragraph({
      children: [TNR(receiverRankShort)],
      spacing: { line: 240, lineRule: "auto" },
    }),
    new Paragraph({
      children: [TNR(receiverLastNameInitials)],
      spacing: { line: 240, lineRule: "auto" },
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      children: [TNR(`«___» ___________ ${d.year} г.`)],
      spacing: { line: 240, lineRule: "auto" },
    }),
  ];
}

function buildDoc(d: Payload): Document {
  const isSdacha = d.actType === "sdacha";

  // Формируем строку третьего участника (сдающий или выдающий).
  // Если данные не заполнены — подставляем прочерк для печати.
  const thirdPartyRank = (isSdacha ? d.surrendererRank : d.issuerRank)?.trim() || "";
  const thirdPartyName = (isSdacha ? d.surrendererName : d.issuerName)?.trim() || "___________";
  const thirdParty = [thirdPartyRank, thirdPartyName].filter(Boolean).join(" ");

  const receiverRank = d.receiverRank?.trim() || "";
  const receiverName = d.receiverName?.trim() || "___________";
  const receiverFull = [receiverRank, receiverName].filter(Boolean).join(" ");

  const verb = isSdacha ? "сдал(-а)" : "выдал(-а)";

  const intro = noWidows(
    `Настоящий акт составлен в том, что ${receiverFull} принял(-а), а ${thirdParty} ${verb} нижеперечисленное имущество:`,
  );

  // Пункт 1: ноутбук с комплектом.
  // Для акта выдачи указываем состояние («в исправном состоянии» или «за исключением…»).
  // Для акта сдачи — только запятая с оговоркой о дефектах, если они есть.
  const item1Base = noWidows(
    `1. Ноутбук «${d.equipmentName}» (серийный номер ${d.serialNumber}; в комплекте: ${d.kit})`,
  );

  let item1Text: string;
  if (d.defects?.trim()) {
    item1Text = `${item1Base} — в неисправном состоянии, а именно: ${d.defects.trim()} (подробнее см. Приложение).`;
  } else if (!isSdacha) {
    item1Text = `${item1Base} — в исправном состоянии.`;
  } else {
    item1Text = `${item1Base}.`;
  }

  const actionLabel = isSdacha ? "Сдал(-а):" : "Выдал(-а):";
  const actionName = (isSdacha ? d.surrendererName : d.issuerName)?.trim() || "";

  return new Document({
    sections: [
      {
        properties: PAGE,
        children: [
          ...headerBlock(d.commanderRank, d.commanderSign, d.year),
          bodyP([TNR(intro)]),
          bodyP([TNR(item1Text)]),
          ...additionalItems(d),
          BL(),
          signatureLine(`${actionLabel}   `, actionName, d.year),
          BL(), BL(),
          signatureLine("Принял(-а):", receiverName, d.year),
          BL(), BL(),
          ...appendix(d),
        ],
      },
    ],
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type должен быть application/json" }, { status: 415 });
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
    const d = parsed.data;

    // Имя файла формируется по фамилии получателя (акт сдачи) или сдающего (акт выдачи),
    // чтобы файл был однозначно идентифицируем в проводнике.
    const personKey =
      d.actType === "sdacha"
        ? (d.surrendererName?.split(" ")[0] ?? "документ")
        : (d.receiverName?.split(" ")[0] ?? "документ");

    const typeLabel = d.actType === "sdacha" ? "сдачи" : "выдачи";
    const filename = encodeURIComponent(`акт_${typeLabel}_ноутбука_${personKey}.docx`);

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