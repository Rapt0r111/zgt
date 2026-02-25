import { NextRequest, NextResponse } from "next/server";
import { Packer } from "docx";
import { z } from "zod";
import { CONDITION_VALUES } from "@/lib/acts/shared";
import { buildActDocument } from "@/lib/acts/docx-builder";

const KitItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  condition: z.enum(CONDITION_VALUES).default("ok"),
  defectNote: z.string().max(500).nullish().transform((v) => v ?? ""),
});

const PhotoSchema = z.object({
  dataUrl: z.string().startsWith("data:image/"),
  caption: z.string().max(300).optional(),
});

const ActPayloadSchema = z.object({
  actType: z.enum(["sdacha", "vydacha"]),
  actNumber: z.string().max(50).optional().transform((v) => v?.trim() || ""),
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
  surrendererLabel: z.string().max(300).optional(),
  receiverLabel: z.string().max(300).optional(),
  issuerLabel: z.string().max(300).optional(),
  surrendererGenitiveLabel: z.string().max(300).optional(),
  receiverGenitiveLabel: z.string().max(300).optional(),
  issuerGenitiveLabel: z.string().max(300).optional(),
  receiverRankShort: z.string().max(100).optional(),
  receiverLastNameInitials: z.string().max(200).optional(),
  surrendererLastNameInitials: z.string().max(200).optional(),
  issuerLastNameInitials: z.string().max(200).optional(),
});

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
    const doc = await buildActDocument(parsed.data);
    const buffer = await Packer.toBuffer(doc);
    const d = parsed.data;

    const personLabel =
      d.actType === "sdacha"
        ? (d.surrendererLabel ?? "").split(" ").find((p) => p.length > 2) ?? "документ"
        : (d.receiverLabel ?? "").split(" ").find((p) => p.length > 2) ?? "документ";

    const actNumSuffix = (d.actNumber ?? "").trim() ? `_${d.actNumber}` : "";
    const typeLabel = d.actType === "sdacha" ? "сдачи" : "выдачи";
    const filename = encodeURIComponent(`акт_${typeLabel}_ноутбука_${personLabel}${actNumSuffix}.docx`);

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
    return NextResponse.json({ error: "Ошибка формирования документа" }, { status: 500 });
  }
}