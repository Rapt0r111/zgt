import {
	Document,
	Paragraph,
	TextRun,
	Table,
	TableRow,
	TableCell,
	AlignmentType,
	WidthType,
	BorderStyle,
	HeightRule,
	Packer,
} from "docx";

const V_CENTER = "center" as const;

const FONT = "Times New Roman";

const SOLID_BORDER = {
	style: BorderStyle.SINGLE,
	size: 8,
	color: "000000",
} as const;

function dxa(cm: number): number {
	return Math.round(cm * 567);
}

function cell(
	paragraphs: Paragraph[],
	widthCm: number,
	borders?: Record<string, typeof SOLID_BORDER>,
	vAlign: "top" | "center" | "bottom" = V_CENTER,
	margins?: { top?: number; bottom?: number; left?: number; right?: number },
): TableCell {
	return new TableCell({
		children: paragraphs,
		width: { size: dxa(widthCm), type: WidthType.DXA },
		verticalAlign: vAlign,
		borders: borders ?? {
			top: SOLID_BORDER,
			bottom: SOLID_BORDER,
			left: SOLID_BORDER,
			right: SOLID_BORDER,
		},
		margins: margins ?? { top: 50, bottom: 50, left: 80, right: 80 },
	});
}

function run(
	text: string,
	sizePt: number,
	bold = false,
	align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
): Paragraph {
	return new Paragraph({
		children: [
			new TextRun({
				text,
				font: FONT,
				size: sizePt * 2, // half-points
				bold,
			}),
		],
		alignment: align,
		spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
	});
}

function runCenter(text: string, sizePt: number, bold = false): Paragraph {
	return run(text, sizePt, bold, AlignmentType.CENTER);
}

export interface TagData {
	inventoryNumber: string; // e.g. "616/806дсп"
	mniSerial: string; // e.g. "2M012LQSK9UT"
	userName: string; // e.g. "Баймаков Д.А."
	responsible: string; // e.g. "Халупа А.И."
	copyNumber: string; // e.g. "1"
	day: string;
	month: string;
	year: string;
	subdivision: string; // e.g. "Научная рота"
	organization: string; // e.g. "Военная академия связи"
	mniType: string; // e.g. "SSD M.2"
}

// ─── STAMP #1 LARGE (7.5 × 3.5 cm) ─────────────────────────────────────────

function buildStamp1Large(d: TagData): Table {
	const invNum = d.inventoryNumber;
	const dateStr = `«${d.day}»  ${d.month}  ${d.year} г.`;

	return new Table({
		width: { size: dxa(7.5), type: WidthType.DXA },
		rows: [
			// Row 1: Уч. №XXX | Уч. №XXX | ДСП
			new TableRow({
				height: { value: dxa(0.9), rule: HeightRule.EXACT },
				children: [
					cell(
						[
							new Paragraph({
								children: [
									new TextRun({ text: "Уч. №", font: FONT, size: 16 }),
									new TextRun({ text: invNum, font: FONT, size: 16, bold: true }),
								],
								spacing: { before: 0, after: 0 },
							}),
						],
						4.0,
					),
					cell(
						[
							new Paragraph({
								children: [
									new TextRun({ text: "Уч. №", font: FONT, size: 16 }),
									new TextRun({ text: invNum, font: FONT, size: 16, bold: true }),
								],
								spacing: { before: 0, after: 0 },
							}),
						],
						4.0,
					),
					cell(
						[runCenter("Для служебного пользования", 8)],
						3.5,
					),
				],
			}),
			// Row 2: Экз. №X | ВАС | ВАС
			new TableRow({
				height: { value: dxa(0.6), rule: HeightRule.EXACT },
				children: [
					cell([run(`Экз. №${d.copyNumber}`, 8)], 3.0),
					cell([runCenter(d.organization.split(" ").map(w => w[0]).join("").slice(0, 3) || "ВАС", 9)], 4.5),
					cell([runCenter(d.organization.split(" ").map(w => w[0]).join("").slice(0, 3) || "ВАС", 9)], 4.5),
				],
			}),
			// Row 3: date | subdivision | subdivision
			new TableRow({
				height: { value: dxa(1.8), rule: HeightRule.EXACT },
				children: [
					cell(
						[
							run(dateStr, 8),
							new Paragraph({
								children: [
									new TextRun({ text: "", font: FONT, size: 8, break: 1 }),
									new TextRun({ text: "________________", font: FONT, size: 4, bold: true }),
								],
								spacing: { before: 0, after: 0 },
							}),
							run("(подпись)", 6),
						],
						3.0,
					),
					cell(
						[
							run(d.subdivision, 7),
							new Paragraph({
								children: [
									new TextRun({ text: "______________________________________", font: FONT, size: 6, bold: true }),
								],
								spacing: { before: 0, after: 0 },
							}),
							run("(наименование структурного подразделения)", 6),
						],
						4.5,
					),
					cell(
						[
							run(d.subdivision, 7),
							new Paragraph({
								children: [
									new TextRun({ text: "______________________________________", font: FONT, size: 6, bold: true }),
								],
								spacing: { before: 0, after: 0 },
							}),
							run("(наименование структурного подразделения)", 6),
						],
						4.5,
					),
				],
			}),
		],
	});
}

// ─── STAMP #1 SMALL (4.5 × 2 cm) ────────────────────────────────────────────

function buildStamp1Small(d: TagData): Table {
	const invNum = d.inventoryNumber;
	const orgAbbr = d.organization.split(" ").map(w => w[0]).join("").slice(0, 3) || "ВАС";
	const dateStr = `«${d.day}»  ${d.month}  ${d.year} г.`;

	return new Table({
		width: { size: dxa(4.5), type: WidthType.DXA },
		rows: [
			// Row 1: Уч. №XXX | Не секретный
			new TableRow({
				height: { value: dxa(0.5), rule: HeightRule.EXACT },
				children: [
					cell(
						[
							new Paragraph({
								children: [
									new TextRun({ text: "Уч. ", font: FONT, size: 12 }),
									new TextRun({ text: "№", font: FONT, size: 12 }),
									new TextRun({ text: invNum, font: FONT, size: 12, bold: true }),
								],
								spacing: { before: 0, after: 0 },
							}),
						],
						2.1,
					),
					cell([runCenter("Не секретный", 8)], 2.4),
				],
			}),
			// Row 2: Экз. №X | ВАС
			new TableRow({
				height: { value: dxa(0.4), rule: HeightRule.EXACT },
				children: [
					cell([run(`Экз. №${d.copyNumber}`, 8)], 2.1),
					cell([runCenter(orgAbbr, 8)], 2.4),
				],
			}),
			// Row 3: date | subdivision
			new TableRow({
				height: { value: dxa(0.9), rule: HeightRule.EXACT },
				children: [
					cell([run(dateStr, 8)], 2.1),
					cell([run(d.subdivision, 8)], 2.4),
				],
			}),
		],
	});
}

// ─── MAIN INFO LABEL (13 × 4 cm) ─────────────────────────────────────────────

function buildMainLabel(d: TagData): Table {
	const invNum = d.inventoryNumber;

	const mniCell = (widthCm: number) =>
		new TableCell({
			children: [
				new Paragraph({
					children: [
						new TextRun({ text: `Уч. № `, font: FONT, size: 18 }),
						new TextRun({ text: invNum, font: FONT, size: 18 }),
					],
					spacing: { before: 0, after: 0 },
				}),
				new Paragraph({
					children: [
						new TextRun({ text: `Зав. №`, font: FONT, size: 18 }),
						new TextRun({ text: d.mniSerial, font: FONT, size: 18 }),
					],
					spacing: { before: 0, after: 0 },
				}),
			],
			width: { size: dxa(widthCm), type: WidthType.DXA },
			verticalAlign: V_CENTER,
			borders: {
				top: SOLID_BORDER,
				bottom: SOLID_BORDER,
				left: SOLID_BORDER,
				right: SOLID_BORDER,
			},
			margins: { top: 50, bottom: 50, left: 80, right: 80 },
		});

	return new Table({
		width: { size: dxa(13.0), type: WidthType.DXA },
		rows: [
			// Row 0: header spanning full width x2 (merged)
			new TableRow({
				height: { value: dxa(1.0), rule: HeightRule.EXACT },
				children: [
					new TableCell({
						columnSpan: 4,
						children: [
							new Paragraph({
								children: [
									new TextRun({ text: d.organization, font: FONT, size: 18, bold: true }),
								],
								alignment: AlignmentType.CENTER,
								spacing: { before: 0, after: 0 },
							}),
							new Paragraph({
								children: [
									new TextRun({ text: d.subdivision, font: FONT, size: 18, bold: true }),
								],
								alignment: AlignmentType.CENTER,
								spacing: { before: 0, after: 0 },
							}),
						],
						width: { size: dxa(13.0), type: WidthType.DXA },
						verticalAlign: V_CENTER,
						borders: {
							top: SOLID_BORDER,
							bottom: SOLID_BORDER,
							left: SOLID_BORDER,
							right: SOLID_BORDER,
						},
					}),
				],
			}),
			// Row 1: Пользователь | (empty) | name | (empty)
			new TableRow({
				height: { value: dxa(0.6), rule: HeightRule.EXACT },
				children: [
					cell([run("Пользователь", 9)], 4.5),
					cell([run("", 9)], 1.5),
					cell([run(d.userName, 9)], 5.5),
					cell([run("", 9)], 1.5),
				],
			}),
			// Row 2: Отв. за ЗИ | (empty) | responsible | (empty)
			new TableRow({
				height: { value: dxa(0.6), rule: HeightRule.EXACT },
				children: [
					cell([run("Отв. за ЗИ", 9)], 4.5),
					cell([run("", 9)], 1.5),
					cell([run(d.responsible, 9)], 5.5),
					cell([run("", 9)], 1.5),
				],
			}),
			// Row 3: Установлены МНИ | type | уч/зав (x2)
			new TableRow({
				height: { value: dxa(0.8), rule: HeightRule.EXACT },
				children: [
					cell([run("Установлены МНИ:", 9)], 4.5),
					cell([run(d.mniType, 9)], 1.5),
					mniCell(3.5),
					mniCell(3.5),
				],
			}),
			// Row 4: evacuation notice
			new TableRow({
				height: { value: dxa(0.5), rule: HeightRule.EXACT },
				children: [
					new TableCell({
						columnSpan: 4,
						children: [
							runCenter("Эвакуируется во 2 очередь", 9, true),
						],
						width: { size: dxa(13.0), type: WidthType.DXA },
						verticalAlign: V_CENTER,
						borders: {
							top: SOLID_BORDER,
							bottom: SOLID_BORDER,
							left: SOLID_BORDER,
							right: SOLID_BORDER,
						},
					}),
				],
			}),
		],
	});
}

// ─── WARNING LABEL (15 × 1 cm) ───────────────────────────────────────────────

function buildWarningLabel1(): Table {
	return new Table({
		width: { size: dxa(15.0), type: WidthType.DXA },
		rows: [
			new TableRow({
				height: { value: dxa(0.9), rule: HeightRule.EXACT },
				children: [
					cell(
						[runCenter("Обработка секретной информации запрещена!", 10, true)],
						15.0,
					),
				],
			}),
		],
	});
}

function buildWarningLabel2(): Table {
	return new Table({
		width: { size: dxa(15.0), type: WidthType.DXA },
		rows: [
			new TableRow({
				height: { value: dxa(0.9), rule: HeightRule.EXACT },
				children: [
					cell(
						[
							runCenter(
								"При обнаружении вредоносного программного обеспечения сообщить в службу защиты государственной тайны по телефону 9555",
								9,
								true,
							),
						],
						15.0,
					),
				],
			}),
		],
	});
}

function spacer(): Paragraph {
	return new Paragraph({
		children: [],
		spacing: { before: 0, after: 160, line: 240, lineRule: "auto" },
	});
}

function sectionTitle(text: string): Paragraph {
	return new Paragraph({
		children: [
			new TextRun({ text, font: FONT, size: 20, bold: true, italics: true }),
		],
		spacing: { before: 240, after: 80, line: 240, lineRule: "auto" },
	});
}

// ─── MAIN BUILDER ─────────────────────────────────────────────────────────────

export async function buildTagsDocument(d: TagData): Promise<Buffer> {
	const doc = new Document({
		sections: [
			{
				properties: {
					page: {
						size: { width: 11906, height: 16838 }, // A4
						margin: { top: 720, right: 720, bottom: 720, left: 720 },
					},
				},
				children: [
					sectionTitle("Рис. 1 – Штамп №1 (7,5 × 3,5 см)"),
					buildStamp1Large(d),
					spacer(),

					sectionTitle("Рис. 2 – Штамп №1 для ноутбуков Aquarius (4,5 × 2 см)"),
					buildStamp1Small(d),
					spacer(),

					sectionTitle("Рис. 3 – Табличка на корпус СВТ (13 × 4 см)"),
					buildMainLabel(d),
					spacer(),

					sectionTitle("Рис. 4а – Предупреждение об обработке секретной информации (15 × 1 см)"),
					buildWarningLabel1(),
					spacer(),

					sectionTitle("Рис. 4б – Предупреждение о вредоносном ПО (15 × 1 см)"),
					buildWarningLabel2(),
				],
			},
		],
	});

	return Packer.toBuffer(doc);
}