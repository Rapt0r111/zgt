/**
 * POST /api/acts/generate
 * Генерирует акт сдачи/выдачи оборудования в формате DOCX.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  UnderlineType,
  TabStopType,
} from "docx";
import { z } from "zod";
import type { ActPayload } from "@/types/acts";

// ─── Валидация входных данных ─────────────────────────────────────────────────

const ActPayloadSchema = z.object({
  actType: z.enum(["sdacha", "vydacha"]),
  year: z.string().regex(/^\d{4}$/, "Год должен быть 4-значным числом"),
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

// ─── Типы ────────────────────────────────────────────────────────────────────

type ValidatedPayload = z.infer<typeof ActPayloadSchema>;

// ─── Утилиты ─────────────────────────────────────────────────────────────────

/**
 * Заменяет пробел после однобуквенных предлогов/союзов на неразрывный,
 * чтобы избежать висячих предлогов в конце строки.
 * Список: а в и к о с у — наиболее часто встречающиеся в актах.
 */
const PREPOSITION_RE = /([авиксуоАВИКСУО])\s+/g;

function noWidows(text: string): string {
  return text.replace(PREPOSITION_RE, (_, p) => p + " ");
}

// ─── DSL для построения параграфов ───────────────────────────────────────────

const TNR = (
  text: string,
  opts: Partial<ConstructorParameters<typeof TextRun>[0]> = {}
): TextRun =>
  new TextRun({
    text,
    font: "Times New Roman",
    size: 28,
    ...(opts as object),
  });

const BL = (): Paragraph =>
  new Paragraph({
    children: [],
    spacing: { after: 0, line: 240, lineRule: "auto" },
  });

const bodyParagraph = (children: TextRun[]): Paragraph =>
  new Paragraph({
    children,
    spacing: { after: 0, line: 240, lineRule: "auto" },
    indent: { firstLine: 709 },
    alignment: AlignmentType.BOTH,
  });

// ─── Блок УТВЕРЖДАЮ ──────────────────────────────────────────────────────────

function headerBlock(commanderRank: string, commanderSign: string, year: string): Paragraph[] {
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
      children: [TNR(commanderRank)],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 5387 },
    }),
    new Paragraph({
      children: [TNR(commanderSign)],
      spacing: { after: 0, line: 360, lineRule: "auto" },
      indent: { left: 4678, firstLine: 2693 },
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      children: [TNR(`«___» ________ ${year} г.`)],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 5387 },
    }),
    BL(),
    BL(),
    new Paragraph({
      children: [
        new TextRun({ text: "АКТ", font: "Times New Roman", size: 28, bold: true }),
        new TextRun({ text: "приема-передачи в эксплуатацию", font: "Times New Roman", size: 28, bold: true, break: 1 }),
        new TextRun({ text: "оборудования", font: "Times New Roman", size: 28, bold: true, break: 1 }),
      ],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [TNR(`г. Санкт-Петербург                                                        «___»___________${year} г.`)],
      spacing: { after: 0, line: 240, lineRule: "auto" },
    }),
    BL(),
    BL(),
  ];
}

// ─── Строка подписи ───────────────────────────────────────────────────────────

function signatureLine(label: string, name: string, year: string): Paragraph {
  return new Paragraph({
    children: [
      TNR(`${label}   `),
      new TextRun({
        text: `${name} `,
        font: "Times New Roman",
        size: 28,
        underline: { type: UnderlineType.SINGLE },
      }),
      TNR(`/_______________\t\t«___»___________${year} г.`),
    ],
    tabStops: [
      { type: TabStopType.RIGHT, position: 6237 },
      { type: TabStopType.RIGHT, position: 7088 },
    ],
    spacing: { after: 0, line: 240, lineRule: "auto" },
  });
}

// ─── Настройки страницы (A4) ──────────────────────────────────────────────────

const PAGE_SETTINGS = {
  page: {
    size: { width: 11906, height: 16838 },
    // top: 2cm, right: 0.6cm, bottom: 0.8cm, left: 1.2cm (в twips: 1cm ≈ 567)
    margin: { top: 1134, right: 850, bottom: 1134, left: 1701 },
  },
} as const;

// ─── Вспомогательные пункты: пропуска и флешки ───────────────────────────────

function buildExtraItems(d: ValidatedPayload, startIndex: number): Paragraph[] {
  const items: Paragraph[] = [];
  let idx = startIndex;
  if (d.passNumbers) {
    items.push(new Paragraph({
      children: [TNR(noWidows(`${idx}. Электронный пропуск № ${d.passNumbers}`))],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 709 },
    }));
    idx++;
  }
  if (d.flashDriveNumbers) {
    items.push(new Paragraph({
      children: [TNR(noWidows(`${idx}. USB-накопитель МО РФ № ${d.flashDriveNumbers}`))],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 709 },
    }));
    idx++;
  }
  return items;
}

// ─── Акт сдачи ───────────────────────────────────────────────────────────────

function buildSdachaDoc(d: ValidatedPayload): Document {
  const intro = noWidows(`Настоящий акт составлен в том, что ${d.receiverRank ?? ""} ${d.receiverName ?? ""} принял, а ${d.surrendererRank ?? ""} ${d.surrendererName ?? ""} сдал нижеперечисленное имущество:`);

  const item1Base = noWidows(`1. Ноутбук «${d.equipmentName}» (серийный номер ${d.serialNumber} в комплекте: ${d.kit})`);

  const item1Children: TextRun[] = d.defects
    ? [TNR(item1Base + noWidows(`, за исключением ${d.defects} (см. приложение).`))]
    : [TNR(item1Base + ".")];

  const appendixChildren: Paragraph[] = d.defects
    ? [
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
        bodyParagraph([TNR(noWidows(`Неисправности «${d.equipmentName}» №${d.serialNumber}`))]),
        BL(),
        new Paragraph({ children: [TNR("Корректность подтверждаю:")], spacing: { line: 240, lineRule: "auto" } }),
        new Paragraph({ children: [TNR(d.receiverRankShort ?? "рядовой")], spacing: { line: 240, lineRule: "auto" } }),
        new Paragraph({
          children: [TNR(d.receiverLastNameInitials ?? "")],
          spacing: { line: 240, lineRule: "auto" },
          alignment: AlignmentType.RIGHT,
        }),
        new Paragraph({ children: [TNR(`«___» ___________${d.year} г.`)], spacing: { line: 240, lineRule: "auto" } }),
      ]
    : [];

  // Дополнительные пункты: пропуска и флешки
  const extraItems = buildExtraItems(d, 2);

  return new Document({
    sections: [{
      properties: PAGE_SETTINGS,
      children: [
        ...headerBlock(d.commanderRank, d.commanderSign, d.year),
        bodyParagraph([TNR(intro)]),
        bodyParagraph(item1Children),
        ...extraItems,
        BL(),
        signatureLine("Сдал:    ", d.surrendererName ?? "", d.year),
        BL(),
        BL(),
        signatureLine("Принял:", d.receiverName ?? "", d.year),
        BL(),
        BL(),
        ...appendixChildren,
      ],
    }],
  });
}

// ─── Акт выдачи ──────────────────────────────────────────────────────────────

function buildVydachaDoc(d: ValidatedPayload): Document {
  const intro = noWidows(`Настоящий акт составлен в том, что ${d.receiverRank ?? ""} ${d.receiverName ?? ""} принял, а ${d.issuerRank ?? ""} ${d.issuerName ?? ""} выдал нижеперечисленное имущество:`);

  const item1Base = noWidows(`1. Ноутбук «${d.equipmentName}» (серийный номер ${d.serialNumber} в комплекте: ${d.kit}) в исправном состоянии`);

  const item1Children: TextRun[] = d.defects
    ? [TNR(item1Base + `, за исключением ${d.defects} (см. приложение).`)]
    : [TNR(item1Base + ".")];

  const appendixChildren: Paragraph[] = d.defects
    ? [
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
        bodyParagraph([TNR(`Неисправности «${d.equipmentName}» №${d.serialNumber}`)]),
        BL(),
        new Paragraph({ children: [TNR("Корректность подтверждаю:")], spacing: { line: 240, lineRule: "auto" } }),
        new Paragraph({ children: [TNR(d.receiverRankShort ?? "рядовой")], spacing: { line: 240, lineRule: "auto" } }),
        new Paragraph({
          children: [TNR(d.receiverLastNameInitials ?? "")],
          spacing: { line: 240, lineRule: "auto" },
          alignment: AlignmentType.RIGHT,
        }),
        new Paragraph({ children: [TNR(`«___» ___________${d.year} г.`)], spacing: { line: 240, lineRule: "auto" } }),
      ]
    : [];

  return new Document({
    sections: [{
      properties: PAGE_SETTINGS,
      children: [
        ...headerBlock(d.commanderRank, d.commanderSign, d.year),
        bodyParagraph([TNR(intro)]),
        bodyParagraph(item1Children),
        ...buildExtraItems(d, 2),
        BL(),
        signatureLine("Выдал:   ", d.issuerName ?? "", d.year),
        BL(),
        BL(),
        signatureLine("Принял:", d.receiverName ?? "", d.year),
        BL(),
        BL(),
        ...appendixChildren,
      ],
    }],
  });
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limiting заголовок (если nginx/edge перед Next.js не стоит)
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type должен быть application/json" }, { status: 415 });
  }

  let rawPayload: unknown;
  try {
    rawPayload = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалидный JSON" }, { status: 400 });
  }

  const parsed = ActPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const payload = parsed.data;

  try {
    const doc = payload.actType === "sdacha"
      ? buildSdachaDoc(payload)
      : buildVydachaDoc(payload);

    const buffer = await Packer.toBuffer(doc);

    const personKey =
      payload.actType === "sdacha"
        ? (payload.surrendererName?.split(" ")[0] ?? "документ")
        : (payload.receiverName?.split(" ")[0] ?? "документ");

    const filename = encodeURIComponent(
      `акт_${payload.actType === "sdacha" ? "сдачи" : "выдачи"}_ноутбука_${personKey}.docx`
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[acts/generate]", err);
    return NextResponse.json({ error: "Ошибка генерации документа" }, { status: 500 });
  }
}