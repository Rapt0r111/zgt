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
	UnderlineType,
	VerticalAlignTable,
	Packer,
} from "docx";

const FONT = "Times New Roman";

const W_STAMP1 = 4253;
const W_STAMP2 = 2552;
const W_INFO   = 7371;
const W_WARN   = 8505;

const STAMP1_COL1 = 1696;
const STAMP1_COL2 = 567;
const STAMP1_COL3 = 1990;

const STAMP2_COL1 = 1191;
const STAMP2_COL2 = 1361;

const INFO_COL1 = 2551;
const INFO_COL2 = 851;
const INFO_COL3 = 3118;
const INFO_COL4 = 851;

const B_SOLID   = { style: BorderStyle.SINGLE, size: 4,  color: "000000" } as const;
const B_THICK   = { style: BorderStyle.SINGLE, size: 6,  color: "000000" } as const;
const B_THICK12 = { style: BorderStyle.SINGLE, size: 12, color: "auto"   } as const;
// B_INFO: bold borders specifically for Table 3 (Рис. 3) — size 18 ≈ 2.25pt
const B_INFO    = { style: BorderStyle.SINGLE, size: 18, color: "000000" } as const;
const B_NIL     = { style: BorderStyle.NIL,    size: 0,  color: "FFFFFF" } as const;

const CELL_MAR = { top: 50, bottom: 50, left: 80, right: 80 };

const VA_CENTER = VerticalAlignTable.CENTER;
const VA_TOP    = VerticalAlignTable.TOP;
const VA_BOTTOM = VerticalAlignTable.BOTTOM;

export interface TagData {
	inventoryNumber: string;
	mniSerial:       string;
	userName:        string;
	responsible:     string;
	copyNumber:      string;
	day:             string;
	month:           string;
	year:            string;
	subdivision:     string;
	organization:    string;
	mniType:         string;
}

function tr(text: string, opts: Record<string, unknown> = {}): TextRun {
	return new TextRun({ text, font: FONT, ...opts });
}

function pp(children: TextRun[], align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT): Paragraph {
	return new Paragraph({
		children,
		alignment: align,
		spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
	});
}

function ppc(children: TextRun[]): Paragraph {
	return pp(children, AlignmentType.CENTER);
}

function caption(text: string, spacingBefore = 200): Paragraph {
	return new Paragraph({
		children: [new TextRun({ text, font: FONT, size: 18, italics: true })],
		spacing: { before: spacingBefore, after: 60 },
	});
}

function emptyP(spacingAfter = 60): Paragraph {
	return new Paragraph({ children: [], spacing: { after: spacingAfter } });
}

// ─── TABLE 1: Stamp #1 Large (7.5 × 3.5 cm) ──────────────────────────────────
function buildStamp1Large(d: TagData): Table {
	const orgAbbr = d.organization.split(" ").map((w: string) => w[0]).join("").slice(0, 3).toUpperCase() || "ВАС";

	return new Table({
		width: { size: W_STAMP1, type: WidthType.DXA },
		columnWidths: [STAMP1_COL1, STAMP1_COL2, STAMP1_COL3],
		rows: [
			// Row 1: [Уч.№ (col1+col2)] | [ДСП (col3)]
			new TableRow({
				height: { value: 510, rule: HeightRule.EXACT },
				children: [
					new TableCell({
						columnSpan: 2,
						width: { size: STAMP1_COL1 + STAMP1_COL2, type: WidthType.DXA },
						margins: CELL_MAR,
						verticalAlign: VA_CENTER,
						// All 4 borders present
						borders: { top: B_SOLID, left: B_SOLID, bottom: B_SOLID, right: B_SOLID },
						children: [ppc([
							tr("Уч. №"),
							tr(d.inventoryNumber, { bold: true, underline: { type: UnderlineType.SINGLE } }),
						])],
					}),
					new TableCell({
						width: { size: STAMP1_COL3, type: WidthType.DXA },
						verticalAlign: VA_CENTER,
						borders: { top: B_SOLID, left: B_SOLID, bottom: B_SOLID, right: B_SOLID },
						children: [ppc([tr("Для служебного пользования")])],
					}),
				],
			}),
			// Row 2: [Экз.№ (col1)] | [Аббр. (col2+col3)]
			new TableRow({
				height: { value: 340, rule: HeightRule.EXACT },
				children: [
					new TableCell({
						width: { size: STAMP1_COL1, type: WidthType.DXA },
						margins: CELL_MAR,
						verticalAlign: VA_CENTER,
						// All 4 borders present
						borders: { top: B_SOLID, left: B_SOLID, bottom: B_SOLID, right: B_SOLID },
						children: [ppc([tr(`Экз. №${d.copyNumber}`, { size: 20 })])],
					}),
					new TableCell({
						columnSpan: 2,
						width: { size: STAMP1_COL2 + STAMP1_COL3, type: WidthType.DXA },
						margins: CELL_MAR,
						verticalAlign: VA_CENTER,
						borders: { top: B_SOLID, left: B_SOLID, bottom: B_SOLID, right: B_SOLID },
						children: [ppc([tr(orgAbbr)])],
					}),
				],
			}),
			// Row 3: [Дата/подпись (col1)] | [Подразделение×2 (col2+col3)]
			new TableRow({
				height: { value: 1020, rule: HeightRule.EXACT },
				children: [
					new TableCell({
						width: { size: STAMP1_COL1, type: WidthType.DXA },
						margins: CELL_MAR,
						verticalAlign: VA_CENTER,
						borders: { top: B_SOLID, left: B_SOLID, bottom: B_SOLID, right: B_SOLID },
						children: [
							ppc([
								tr("«", { size: 16 }),
								tr(d.day, { size: 16, underline: { type: UnderlineType.SINGLE } }),
								tr("» ", { size: 16 }),
								tr(d.month, { size: 16, underline: { type: UnderlineType.SINGLE } }),
							]),
							ppc([tr(`${d.year} г.`, { size: 16 })]),
							ppc([]),
							ppc([tr("________________", { size: 8, bold: true })]),
							ppc([tr("(подпись)", { size: 16 })]),
						],
					}),
					// Subdivision cell: centered, bottom-aligned, font size 7pt (size: 14)
					new TableCell({
						columnSpan: 2,
						width: { size: STAMP1_COL2 + STAMP1_COL3, type: WidthType.DXA },
						margins: CELL_MAR,
						verticalAlign: VA_BOTTOM,
						borders: { top: B_SOLID, left: B_SOLID, bottom: B_SOLID, right: B_SOLID },
						children: [
							ppc([tr(d.subdivision, { size: 14 })]),
							ppc([tr("_________________________________________", { size: 12 })]),
							ppc([tr("(наименование структурного подразделения)", { size: 12 })]),
							ppc([tr("", { size: 12 })]),
						],
					}),
				],
			}),
		],
	});
}

// ─── TABLE 2: Stamp #1 Small (4.5 × 2 cm) ────────────────────────────────────
function buildStamp1Small(d: TagData): Table {
	const orgAbbr = d.organization.split(" ").map((w: string) => w[0]).join("").slice(0, 3).toUpperCase() || "ВАС";

	return new Table({
		width: { size: W_STAMP2, type: WidthType.DXA },
		columnWidths: [STAMP2_COL1, STAMP2_COL2],
		rows: [
			new TableRow({
				height: { value: 284, rule: HeightRule.EXACT },
				children: [
					new TableCell({
						width: { size: STAMP2_COL1, type: WidthType.DXA }, margins: CELL_MAR, verticalAlign: VA_CENTER,
						// All 4 borders
						borders: { top: B_SOLID, left: B_SOLID, bottom: B_SOLID, right: B_SOLID },
						children: [ppc([
							tr("Уч. №", { size: 12, underline: { type: UnderlineType.SINGLE } }),
							tr(d.inventoryNumber, { size: 12, bold: true, underline: { type: UnderlineType.SINGLE } }),
						])],
					}),
					new TableCell({
						width: { size: STAMP2_COL2, type: WidthType.DXA }, margins: CELL_MAR, verticalAlign: VA_CENTER,
						// All 4 borders
						borders: { top: B_SOLID, left: B_SOLID, bottom: B_SOLID, right: B_SOLID },
						children: [ppc([tr("Не секретный", { size: 12 })])],
					}),
				],
			}),
			new TableRow({
				height: { value: 227, rule: HeightRule.EXACT },
				children: [
					new TableCell({
						width: { size: STAMP2_COL1, type: WidthType.DXA }, margins: CELL_MAR, verticalAlign: VA_CENTER,
						borders: { top: B_SOLID, left: B_SOLID, bottom: B_SOLID, right: B_SOLID },
						children: [ppc([tr(`Экз. №${d.copyNumber}`, { size: 12 })])],
					}),
					new TableCell({
						width: { size: STAMP2_COL2, type: WidthType.DXA }, margins: CELL_MAR, verticalAlign: VA_CENTER,
						// All 4 borders
						borders: { top: B_SOLID, left: B_SOLID, bottom: B_SOLID, right: B_SOLID },
						children: [ppc([tr(orgAbbr, { size: 12 })])],
					}),
				],
			}),
			new TableRow({
				height: { value: 510, rule: HeightRule.EXACT },
				children: [
					new TableCell({
						width: { size: STAMP2_COL1, type: WidthType.DXA }, margins: CELL_MAR, verticalAlign: VA_BOTTOM,
						borders: { top: B_SOLID, left: B_SOLID, bottom: B_SOLID, right: B_SOLID },
						children: [ppc([tr(`«${d.day}»  ${d.month}  ${d.year} г.`, { size: 12 })])],
					}),
					new TableCell({
						width: { size: STAMP2_COL2, type: WidthType.DXA }, margins: CELL_MAR, verticalAlign: VA_CENTER,
						borders: { top: B_SOLID, left: B_SOLID, bottom: B_SOLID, right: B_SOLID },
						children: [ppc([tr(d.subdivision, { size: 12 })])],
					}),
				],
			}),
		],
	});
}

// ─── TABLE 3: Main Info Label (13 × 4 cm) — ALL BOLD BORDERS ─────────────────
function buildMainLabel(d: TagData): Table {
	// B_INFO has size: 18 (≈2.25pt) — visually bold/thick borders
	const ALL_INFO = { top: B_INFO, left: B_INFO, bottom: B_INFO, right: B_INFO };
	return new Table({
		width: { size: W_INFO, type: WidthType.DXA },
		columnWidths: [INFO_COL1, INFO_COL2, INFO_COL3, INFO_COL4],
		rows: [
			new TableRow({
				height: { value: 510, rule: HeightRule.EXACT },
				children: [
					new TableCell({
						columnSpan: 4, width: { size: W_INFO, type: WidthType.DXA }, margins: CELL_MAR,
						verticalAlign: VA_CENTER, borders: ALL_INFO,
						children: [ppc([tr(d.organization, { size: 18, bold: true })]), ppc([tr(d.subdivision, { size: 18, bold: true })])],
					}),
				],
			}),
			new TableRow({
				height: { value: 340, rule: HeightRule.EXACT },
				children: [
					new TableCell({ width: { size: INFO_COL1 + 1, type: WidthType.DXA }, margins: CELL_MAR,
						verticalAlign: VA_CENTER, borders: ALL_INFO,
						children: [pp([tr("Пользователь", { size: 18 })])],
					}),
					new TableCell({ width: { size: INFO_COL2, type: WidthType.DXA }, margins: CELL_MAR,
						borders: ALL_INFO,
						children: [new Paragraph({ children: [] })],
					}),
					new TableCell({ width: { size: INFO_COL3 + 1, type: WidthType.DXA }, margins: CELL_MAR,
						verticalAlign: VA_CENTER, borders: ALL_INFO,
						children: [pp([tr(d.userName)])],
					}),
					new TableCell({ width: { size: INFO_COL4, type: WidthType.DXA }, margins: CELL_MAR,
						borders: ALL_INFO,
						children: [ppc([])],
					}),
				],
			}),
			new TableRow({
				height: { value: 340, rule: HeightRule.EXACT },
				children: [
					new TableCell({ width: { size: INFO_COL1 + 1, type: WidthType.DXA }, margins: CELL_MAR,
						verticalAlign: VA_CENTER, borders: ALL_INFO,
						children: [pp([tr("Отв. за ЗИ", { size: 18 })])],
					}),
					new TableCell({ width: { size: INFO_COL2, type: WidthType.DXA }, margins: CELL_MAR,
						borders: ALL_INFO,
						children: [new Paragraph({ children: [] })],
					}),
					new TableCell({ width: { size: INFO_COL3 + 1, type: WidthType.DXA }, margins: CELL_MAR,
						verticalAlign: VA_CENTER, borders: ALL_INFO,
						children: [pp([tr(d.responsible, { size: 18 })])],
					}),
					new TableCell({ width: { size: INFO_COL4, type: WidthType.DXA }, margins: CELL_MAR,
						borders: ALL_INFO,
						children: [ppc([])],
					}),
				],
			}),
			new TableRow({
				height: { value: 510, rule: HeightRule.EXACT },
				children: [
					new TableCell({ width: { size: INFO_COL1 + 1, type: WidthType.DXA }, margins: CELL_MAR,
						borders: ALL_INFO,
						children: [pp([tr("Установлены МНИ:", { size: 18 })])],
					}),
					new TableCell({ width: { size: INFO_COL2, type: WidthType.DXA }, margins: CELL_MAR,
						verticalAlign: VA_CENTER, borders: ALL_INFO,
						children: [ppc([tr(d.mniType, { size: 18 })])],
					}),
					new TableCell({
						columnSpan: 2, width: { size: INFO_COL3 + INFO_COL4, type: WidthType.DXA }, margins: CELL_MAR,
						borders: ALL_INFO,
						children: [
							pp([tr(`Уч. № ${d.inventoryNumber}`, { size: 18 })]),
							pp([tr(`Зав. №${d.mniSerial}`, { size: 18 })]),
						],
					}),
				],
			}),
			new TableRow({
				height: { value: 283, rule: HeightRule.EXACT },
				children: [
					new TableCell({
						columnSpan: 4, width: { size: W_INFO, type: WidthType.DXA }, margins: CELL_MAR,
						borders: ALL_INFO,
						children: [pp([tr("Эвакуируется во 2 очередь", { size: 18, bold: true })])],
					}),
				],
			}),
		],
	});
}

// ─── TABLE 4: Warning — обработка (15 × 1 cm) ────────────────────────────────
function buildWarningLabel1(): Table {
	return new Table({
		width: { size: W_WARN, type: WidthType.DXA },
		columnWidths: [W_WARN],
		rows: [new TableRow({
			height: { value: 510, rule: HeightRule.EXACT },
			children: [new TableCell({
				width: { size: W_WARN, type: WidthType.DXA }, margins: CELL_MAR, verticalAlign: VA_CENTER,
				borders: { top: B_THICK, left: B_THICK, bottom: B_THICK, right: B_THICK },
				children: [new Paragraph({
					children: [tr("Обработка секретной информации запрещена!", { bold: true, italics: true })],
					alignment: AlignmentType.CENTER,
					spacing: { before: 30, after: 30 },
				})],
			})],
		})],
	});
}

// ─── TABLE 5: Warning — вредоносное ПО (15 × 1 cm) ───────────────────────────
function buildWarningLabel2(): Table {
	return new Table({
		width: { size: W_WARN, type: WidthType.DXA },
		columnWidths: [W_WARN],
		rows: [new TableRow({
			height: { value: 510, rule: HeightRule.EXACT },
			children: [new TableCell({
				width: { size: W_WARN, type: WidthType.DXA }, margins: CELL_MAR,
				borders: { top: B_THICK, left: B_THICK, bottom: B_THICK, right: B_THICK },
				children: [new Paragraph({
					children: [tr("При обнаружении вредоносного программного обеспечения сообщить в службу защиты государственной тайны по телефону 9555", { size: 18, bold: true, italics: true })],
					alignment: AlignmentType.CENTER,
					spacing: { before: 30, after: 30 },
				})],
			})],
		})],
	});
}

// ─── MAIN BUILDER ─────────────────────────────────────────────────────────────
export async function buildTagsDocument(d: TagData): Promise<Buffer> {
	const doc = new Document({
		sections: [{
			properties: {
				page: {
					size: { width: 11906, height: 16838 },
					margin: { top: 720, right: 720, bottom: 720, left: 720 },
				},
			},
			children: [
				new Paragraph({
					children: [tr("Образцы штампа №1 и информационных табличек, наносимых на корпус средств вычислительной техники", { bold: true, size: 22 })],
					alignment: AlignmentType.CENTER,
					spacing: { after: 200 },
				}),
				buildStamp1Large(d),
				caption("Рис. 1 – Образец штампа №1 прикрепляемого к МНИ (идентификатору доступа, средству вычислительной техники) (длина – 7,5 см, высота – 3,5 см)"),
				buildStamp1Small(d),
				caption("Рис. 2 – Образец штампа №1 прикрепляемого к МНИ (для ноутбуков Aquarius CMP NS685U R11) (длина – 4,5 см, высота – 2 см)"),
				buildMainLabel(d),
				caption("Рис. 3 – Образец таблички, наносимой на корпус средства вычислительной техники (моноблока, ноутбука, системного блока) (длина – 13 см, высота – 4 см)"),
				emptyP(60),
				buildWarningLabel1(),
				emptyP(120),
				buildWarningLabel2(),
				new Paragraph({
					children: [tr("⁴ Образцы представлены в натуральном размере, рекомендуется наносить таблички на двусторонний скотч либо клей ПВА.", { size: 16 })],
					spacing: { before: 120, after: 60 },
				}),
				new Paragraph({
					children: [tr("⁵ Указывается серийный номер МНИ.", { size: 16 })],
					spacing: { before: 0, after: 0 },
				}),
			],
		}],
	});

	return Packer.toBuffer(doc);
}