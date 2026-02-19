import { NextRequest, NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType, TabStopType,
} from "docx";
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

const WIDOWS_RE = /([авиксуоАВИКСУО])\s+/g;
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

const PAGE = {
  page: {
    size: { width: 11906, height: 16838 },
    margin: { top: 1134, right: 850, bottom: 1134, left: 1701 },
  },
} as const;

function headerBlock(rank: string, sign: string, year: string): Paragraph[] {
  return [
    new Paragraph({ children: [TNR("УТВЕРЖДАЮ")], spacing: { after: 0, line: 240, lineRule: "auto" }, indent: { left: 5387 }, alignment: AlignmentType.CENTER }),
    new Paragraph({ children: [TNR("Командир роты (научной)")], spacing: { after: 0, line: 240, lineRule: "auto" }, indent: { left: 5387 } }),
    new Paragraph({ children: [TNR(rank)], spacing: { after: 0, line: 240, lineRule: "auto" }, indent: { left: 5387 } }),
    new Paragraph({ children: [TNR(sign)], spacing: { after: 0, line: 360, lineRule: "auto" }, indent: { left: 4678, firstLine: 2693 }, alignment: AlignmentType.RIGHT }),
    new Paragraph({ children: [TNR(`«___» ________ ${year} г.`)], spacing: { after: 0, line: 240, lineRule: "auto" }, indent: { left: 5387 } }),
    BL(), BL(),
    new Paragraph({
      children: [
        new TextRun({ text: "АКТ", font: "Times New Roman", size: 28, bold: true }),
        new TextRun({ text: "приема-передачи в эксплуатацию", font: "Times New Roman", size: 28, bold: true, break: 1 }),
        new TextRun({ text: "оборудования", font: "Times New Roman", size: 28, bold: true, break: 1 }),
      ],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [TNR(`г. Санкт-Петербург                                                        «___»___________${year} г.`)], spacing: { after: 0, line: 240, lineRule: "auto" } }),
    BL(), BL(),
  ];
}

function signatureLine(label: string, name: string, year: string): Paragraph {
  return new Paragraph({
    children: [
      TNR(`${label}   `),
      new TextRun({ text: `${name} `, font: "Times New Roman", size: 28, underline: { type: UnderlineType.SINGLE } }),
      TNR(`/_______________\t\t«___»___________${year} г.`),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: 6237 }, { type: TabStopType.RIGHT, position: 7088 }],
    spacing: { after: 0, line: 240, lineRule: "auto" },
  });
}

function extraItems(d: Payload, startIdx: number): Paragraph[] {
  const items: Paragraph[] = [];
  let i = startIdx;
  if (d.passNumbers) {
    items.push(new Paragraph({ children: [TNR(noWidows(`${i}. Электронный пропуск № ${d.passNumbers}`))], spacing: { after: 0, line: 240, lineRule: "auto" }, indent: { left: 709 } }));
    i++;
  }
  if (d.flashDriveNumbers) {
    items.push(new Paragraph({ children: [TNR(noWidows(`${i}. USB-накопитель МО РФ № ${d.flashDriveNumbers}`))], spacing: { after: 0, line: 240, lineRule: "auto" }, indent: { left: 709 } }));
  }
  return items;
}

function appendix(d: Payload): Paragraph[] {
  if (!d.defects) return [];
  return [
    new Paragraph({ children: [new TextRun({ text: "", break: 1 })], pageBreakBefore: true, spacing: { after: 0, line: 240, lineRule: "auto" } }),
    new Paragraph({ children: [TNR("Приложение", { bold: true })], spacing: { after: 0, line: 720, lineRule: "auto" }, alignment: AlignmentType.CENTER }),
    bodyP([TNR(noWidows(`Неисправности «${d.equipmentName}» №${d.serialNumber}`))]),
    BL(),
    new Paragraph({ children: [TNR("Корректность подтверждаю:")], spacing: { line: 240, lineRule: "auto" } }),
    new Paragraph({ children: [TNR(d.receiverRankShort ?? "рядовой")], spacing: { line: 240, lineRule: "auto" } }),
    new Paragraph({ children: [TNR(d.receiverLastNameInitials ?? "")], spacing: { line: 240, lineRule: "auto" }, alignment: AlignmentType.RIGHT }),
    new Paragraph({ children: [TNR(`«___» ___________${d.year} г.`)], spacing: { line: 240, lineRule: "auto" } }),
  ];
}

function buildDoc(d: Payload): Document {
  const isSdacha = d.actType === "sdacha";
  const thirdParty = isSdacha
    ? `${d.surrendererRank ?? ""} ${d.surrendererName ?? ""}`.trim()
    : `${d.issuerRank ?? ""} ${d.issuerName ?? ""}`.trim();
  const verb = isSdacha ? "сдал" : "выдал";
  const intro = noWidows(`Настоящий акт составлен в том, что ${d.receiverRank ?? ""} ${d.receiverName ?? ""} принял, а ${thirdParty} ${verb} нижеперечисленное имущество:`);

  const item1Base = noWidows(`1. Ноутбук «${d.equipmentName}» (серийный номер ${d.serialNumber} в комплекте: ${d.kit})${!isSdacha ? " в исправном состоянии" : ""}`);
  const item1Text = d.defects
    ? `${item1Base}${isSdacha ? "," : ""}, за исключением ${d.defects} (см. приложение).`
    : `${item1Base}.`;

  const actionLabel = isSdacha ? "Сдал:    " : "Выдал:   ";
  const actionName = isSdacha ? (d.surrendererName ?? "") : (d.issuerName ?? "");

  return new Document({
    sections: [{
      properties: PAGE,
      children: [
        ...headerBlock(d.commanderRank, d.commanderSign, d.year),
        bodyP([TNR(intro)]),
        bodyP([TNR(item1Text)]),
        ...extraItems(d, 2),
        BL(),
        signatureLine(actionLabel, actionName, d.year),
        BL(), BL(),
        signatureLine("Принял:", d.receiverName ?? "", d.year),
        BL(), BL(),
        ...appendix(d),
      ],
    }],
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ActPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const buffer = await Packer.toBuffer(buildDoc(parsed.data));
    const d = parsed.data;
    const personKey = d.actType === "sdacha"
      ? (d.surrendererName?.split(" ")[0] ?? "документ")
      : (d.receiverName?.split(" ")[0] ?? "документ");
    const filename = encodeURIComponent(`акт_${d.actType === "sdacha" ? "сдачи" : "выдачи"}_ноутбука_${personKey}.docx`);

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
    return NextResponse.json({ error: "Document generation failed" }, { status: 500 });
  }
}