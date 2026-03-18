import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { buildTagsDocument } from "@/lib/acts/tags-docx-builder";

const MONTHS_GEN = [
	"января", "февраля", "марта", "апреля", "мая", "июня",
	"июля", "августа", "сентября", "октября", "ноября", "декабря",
] as const;

const TagsPayloadSchema = z.object({
	inventoryNumber: z.string().min(1).max(100),
	mniSerial: z.string().max(100).default(""),
	userName: z.string().max(200).default(""),
	responsible: z.string().max(200).default(""),
	copyNumber: z.string().max(10).default("1"),
	day: z.string().regex(/^\d{1,2}$/).default("01"),
	month: z.string().max(20).default("января"),
	year: z.string().regex(/^\d{4}$/).default(String(new Date().getFullYear())),
	subdivision: z.string().max(200).default("Научная рота"),
	organization: z.string().max(200).default("Военная академия связи"),
	mniType: z.string().max(100).default("SSD M.2"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
	const cookieStore = await cookies();
	const accessToken = cookieStore.get("access_token");

	if (!accessToken?.value) {
		return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
	}

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

	const parsed = TagsPayloadSchema.safeParse(raw);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Ошибка валидации", details: parsed.error.flatten() },
			{ status: 422 },
		);
	}

	try {
		const buffer = await buildTagsDocument(parsed.data);
		const lastName = parsed.data.userName.split(" ")[0] || "бирка";
		const filename = encodeURIComponent(`бирки_${lastName}.docx`);

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
		console.error("[tags/generate]", err);
		return NextResponse.json(
			{ error: "Ошибка формирования документа" },
			{ status: 500 },
		);
	}
}