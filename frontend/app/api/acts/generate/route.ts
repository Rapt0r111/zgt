/**
 * POST /api/acts/generate
 *
 * Генерирует акт сдачи или выдачи оборудования в формате DOCX.
 * Использует библиотеку docx (npm install docx).
 *
 * Размещение: frontend/app/api/acts/generate/route.ts
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
  TabStopPosition,
  PageBreak,
} from "docx";

// ─── Типы ────────────────────────────────────────────────────────────────────
interface ActPayload {
  actType: "sdacha" | "vydacha";
  year: string;
  commanderRank: string;
  commanderSign: string;
  equipmentName: string;
  serialNumber: string;
  kit: string; // "ноутбук, мышь, сумка"
  defects?: string | null;
  // Акт сдачи
  surrendererRank?: string;
  surrendererName?: string;
  receiverRank?: string;
  receiverName?: string;
  // Акт выдачи
  issuerRank?: string;
  issuerName?: string;
  receiverRankShort?: string;
  receiverLastNameInitials?: string;
}

// ─── Хелперы ─────────────────────────────────────────────────────────────────
const TNR = (text: string, opts: Partial<ConstructorParameters<typeof TextRun>[0]> = {}) =>
  new TextRun({ text, font: "Times New Roman", size: 28, ...(opts as Record<string, any>) });

const BL = () =>
  new Paragraph({
    children: [],
    spacing: { after: 0, line: 240, lineRule: "auto" },
  });

// ─── Общие блоки ─────────────────────────────────────────────────────────────
function headerBlock(commanderRank: string, commanderSign: string, year: string) {
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
      children: [TNR(commanderRank + " ")],
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
    new Paragraph({
      children: [],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 3969 },
    }),
    new Paragraph({
      children: [],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 2552 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "АКТ", font: "Times New Roman", size: 28, bold: true }),
        new TextRun({
          text: "приема-передачи в эксплуатацию",
          font: "Times New Roman",
          size: 28,
          bold: true,
          break: 1,
        }),
        new TextRun({
          text: "оборудования",
          font: "Times New Roman",
          size: 28,
          bold: true,
          break: 1,
        }),
      ],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        TNR(
          `г. Санкт-Петербург                                                        «___»___________${year} г.`
        ),
      ],
      spacing: { after: 0, line: 240, lineRule: "auto" },
    }),
    BL(),
    BL(),
  ];
}

// ─── Акт сдачи ───────────────────────────────────────────────────────────────
function buildSdachaAct(d: ActPayload): Document {
  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, right: 850, bottom: 1134, left: 1701 },
          },
        },
        children: [
          ...headerBlock(d.commanderRank, d.commanderSign, d.year),
          new Paragraph({
            children: [
              TNR(
                `Настоящий акт составлен в том, что ${d.receiverRank} ${d.receiverName} принял, а ${d.surrendererRank} ${d.surrendererName} сдал нижеперечисленное имущество:`
              ),
            ],
            spacing: { after: 0, line: 240, lineRule: "auto" },
            indent: { firstLine: 709 },
            alignment: AlignmentType.BOTH,
          }),
          new Paragraph({
            children: [
              TNR(
                `1. Ноутбук «${d.equipmentName}» (серийный номер ${d.serialNumber} в комплекте: ${d.kit}).`
              ),
            ],
            spacing: { after: 0, line: 240, lineRule: "auto" },
            indent: { firstLine: 709 },
            alignment: AlignmentType.BOTH,
          }),
          BL(),
          new Paragraph({
            children: [
              TNR("Сдал:     "),
              new TextRun({
                text: (d.surrendererName ?? "") + " ",
                font: "Times New Roman",
                size: 28,
                underline: { type: UnderlineType.SINGLE },
              }),
              new TextRun({
                text: "/_______________\t\t«___»___________" + d.year + " г.",
                font: "Times New Roman",
                size: 28,
              }),
            ],
            tabStops: [
              { type: TabStopType.RIGHT, position: 6237 },
              { type: TabStopType.RIGHT, position: 6946 },
            ],
            spacing: { after: 0, line: 240, lineRule: "auto" },
          }),
          BL(),
          BL(),
          new Paragraph({
            children: [
              TNR("Принял: "),
              new TextRun({
                text: (d.receiverName ?? "") + " ",
                font: "Times New Roman",
                size: 28,
                underline: { type: UnderlineType.SINGLE },
              }),
              new TextRun({
                text: "/_______________\t\t«___»___________" + d.year + " г.",
                font: "Times New Roman",
                size: 28,
              }),
            ],
            tabStops: [
              { type: TabStopType.RIGHT, position: 6237 },
              { type: TabStopType.RIGHT, position: 7088 },
            ],
            spacing: { after: 0, line: 240, lineRule: "auto" },
          }),
          new Paragraph({
            children: [],
            spacing: { after: 0, line: 240, lineRule: "auto" },
            indent: { left: 4962 },
          }),
        ],
      },
    ],
  });
}

// ─── Акт выдачи ──────────────────────────────────────────────────────────────
function buildVydachaAct(d: ActPayload): Document {
  const children: (Paragraph)[] = [
    ...headerBlock(d.commanderRank, d.commanderSign, d.year),
    new Paragraph({
      children: [
        TNR(
          `Настоящий акт составлен в том, что ${d.receiverRank} ${d.receiverName} принял, а ${d.issuerRank} ${d.issuerName} выдал нижеперечисленное имущество:`
        ),
      ],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { firstLine: 709 },
      alignment: AlignmentType.BOTH,
    }),
    new Paragraph({
      children: [
        TNR(
          `1. Ноутбук «${d.equipmentName}» (серийный номер ${d.serialNumber} в комплекте: ${d.kit}) в исправном состоянии,`
        ),
        ...(d.defects
          ? [
              new TextRun({
                text: `за исключением ${d.defects}`,
                font: "Times New Roman",
                size: 28,
                break: 1,
              }),
              new TextRun({
                text: " (см. приложение).",
                font: "Times New Roman",
                size: 28,
              }),
            ]
          : [TNR(".")]),
      ],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { firstLine: 709 },
      alignment: AlignmentType.BOTH,
    }),
    new Paragraph({
      children: [TNR("2. Электронный пропуск №")],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 709 },
      alignment: AlignmentType.BOTH,
    }),
    new Paragraph({
      children: [TNR("3. USB-накопитель МО РФ №")],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 709 },
      alignment: AlignmentType.BOTH,
    }),
    BL(),
    new Paragraph({
      children: [
        TNR("Выдал:    "),
        new TextRun({
          text: (d.issuerName ?? "") + " ",
          font: "Times New Roman",
          size: 28,
          underline: { type: UnderlineType.SINGLE },
        }),
        new TextRun({
          text: "/_______________\t\t«___»___________" + d.year + " г.",
          font: "Times New Roman",
          size: 28,
        }),
      ],
      tabStops: [
        { type: TabStopType.RIGHT, position: 6237 },
        { type: TabStopType.RIGHT, position: 6946 },
      ],
      spacing: { after: 0, line: 240, lineRule: "auto" },
    }),
    BL(),
    BL(),
    new Paragraph({
      children: [
        TNR("Принял: "),
        new TextRun({
          text: (d.receiverName ?? "") + " ",
          font: "Times New Roman",
          size: 28,
          underline: { type: UnderlineType.SINGLE },
        }),
        new TextRun({
          text: "/_______________\t\t«___»___________" + d.year + " г.",
          font: "Times New Roman",
          size: 28,
        }),
      ],
      tabStops: [
        { type: TabStopType.RIGHT, position: 6237 },
        { type: TabStopType.RIGHT, position: 7088 },
      ],
      spacing: { after: 0, line: 240, lineRule: "auto" },
    }),
    new Paragraph({
      children: [],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 4962 },
    }),
    new Paragraph({
      children: [],
      spacing: { after: 0, line: 240, lineRule: "auto" },
      indent: { left: 4962 },
    }),
  ];

  // Приложение (2-я страница) — только если есть дефекты
  if (d.defects) {
    children.push(
      new Paragraph({
        children: [new PageBreak()],
        spacing: { after: 0, line: 240, lineRule: "auto" },
      }),
      new Paragraph({
        children: [TNR("Приложение", { bold: true })],
        spacing: { after: 0, line: 720, lineRule: "auto" },
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [
          TNR(
            `Неисправности «${d.equipmentName}» №${d.serialNumber}`
          ),
        ],
        spacing: { line: 360, lineRule: "auto" },
        indent: { firstLine: 709 },
        alignment: AlignmentType.BOTH,
      }),
      BL(),
      new Paragraph({
        children: [TNR("Корректность подтверждаю:")],
        spacing: { line: 240, lineRule: "auto" },
      }),
      new Paragraph({
        children: [TNR((d.receiverRankShort ?? "рядовой") + " ")],
        spacing: { line: 240, lineRule: "auto" },
      }),
      new Paragraph({
        children: [TNR(d.receiverLastNameInitials ?? "")],
        spacing: { line: 240, lineRule: "auto" },
        alignment: AlignmentType.RIGHT,
      }),
      new Paragraph({
        children: [TNR(`«___» ___________${d.year} г.`)],
        spacing: { line: 240, lineRule: "auto" },
      })
    );
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, right: 850, bottom: 1134, left: 1701 },
          },
        },
        children,
      },
    ],
  });
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as ActPayload;

    let doc: Document;
    if (payload.actType === "sdacha") {
      doc = buildSdachaAct(payload);
    } else {
      doc = buildVydachaAct(payload);
    }

    const buffer = await Packer.toBuffer(doc);

    const personKey =
      payload.actType === "sdacha"
        ? payload.surrendererName?.split(" ")[0] ?? "документ"
        : payload.receiverName?.split(" ")[0] ?? "документ";

    const filename = encodeURIComponent(
      `акт_${payload.actType === "sdacha" ? "сдачи" : "выдачи"}_ноутбука_${personKey}.docx`
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (err) {
    console.error("[acts/generate]", err);
    return NextResponse.json({ error: "Ошибка генерации документа" }, { status: 500 });
  }
}