"use client";

import {
	useTransition,
	useState,
	useCallback,
	useMemo,
	useRef,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
	Tag,
	Download,
	ArrowLeft,
	RefreshCw,
	AlertCircle,
	User,
	Shield,
	Hash,
	Calendar,
	Building2,
	HardDrive,
	Eye,
	ChevronDown,
} from "lucide-react";
import Link from "next/link";

import { personnelApi } from "@/lib/api/personnel";
import { equipmentApi } from "@/lib/api/equipment";
import { PersonnelSelect } from "@/components/shared/personnel-select";
import { EquipmentSelect } from "@/components/shared/equipment-select";
import { Button } from "@/components/ui/button";
import type { Personnel } from "@/types/personnel";
import type { Equipment } from "@/types/equipment";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_GEN = [
	"января", "февраля", "марта", "апреля", "мая", "июня",
	"июля", "августа", "сентября", "октября", "ноября", "декабря",
] as const;

const MNI_TYPES = [
	"SSD M.2",
	"HDD 2.5\"",
	"SSD 2.5\"",
	"SSD mSATA",
	"Flash-карта",
] as const;

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) =>
	String(i + 1).padStart(2, "0"),
);

const MONTH_OPTIONS = MONTHS_GEN.map((m, i) => ({
	value: String(i + 1).padStart(2, "0"),
	label: m,
}));

// ─── Types ────────────────────────────────────────────────────────────────────

interface TagFormState {
	personnelId: number | undefined;
	equipmentId: number | undefined;
	responsibleName: string;
	copyNumber: string;
	day: string;
	month: string;
	year: string;
	subdivision: string;
	organization: string;
	mniType: string;
	// Manual overrides (auto-filled from equipment/personnel)
	manualInventory: string;
	manualMniSerial: string;
	manualUserName: string;
}

function makeInitialState(): TagFormState {
	const now = new Date();
	return {
		personnelId: undefined,
		equipmentId: undefined,
		responsibleName: "Халупа А.И.",
		copyNumber: "1",
		day: String(now.getDate()).padStart(2, "0"),
		month: String(now.getMonth() + 1).padStart(2, "0"),
		year: String(now.getFullYear()),
		subdivision: "Научная рота",
		organization: "Военная академия связи",
		mniType: "SSD M.2",
		manualInventory: "",
		manualMniSerial: "",
		manualUserName: "",
	};
}

// ─── Sub-component: Input field ───────────────────────────────────────────────

function Field({
	label,
	icon: Icon,
	children,
	hint,
}: {
	label: string;
	icon: React.ElementType;
	children: React.ReactNode;
	hint?: string;
}) {
	return (
		<div className="space-y-1.5">
			<label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
				<Icon className="w-3.5 h-3.5" />
				{label}
			</label>
			{children}
			{hint && <p className="text-[11px] text-slate-600">{hint}</p>}
		</div>
	);
}

const inputCls =
	"w-full rounded-lg px-3 py-2.5 text-sm bg-slate-800/60 border border-slate-700/60 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all";

const inputFilledCls =
	"w-full rounded-lg px-3 py-2.5 text-sm bg-slate-800/30 border border-slate-700/30 text-slate-300 focus:outline-none focus:border-blue-500/60 transition-all";

// ─── Sub-component: Tag Preview ───────────────────────────────────────────────

function TagPreview({
	inventory,
	mniSerial,
	userName,
	responsible,
	copyNumber,
	dateStr,
	subdivision,
	organization,
	mniType,
}: {
	inventory: string;
	mniSerial: string;
	userName: string;
	responsible: string;
	copyNumber: string;
	dateStr: string;
	subdivision: string;
	organization: string;
	mniType: string;
}) {
	const orgAbbr = organization
		.split(" ")
		.map((w) => w[0])
		.join("")
		.slice(0, 3) || "ВАС";

	const labelStyle: React.CSSProperties = {
		fontFamily: "Times New Roman, serif",
		color: "#000",
	};

	// Solid border for all tables
	const cellBorder = "1px solid #000";
	// Bold border for Table 3 (Info label)
	const cellBorderBold = "2px solid #000";

	return (
		<div className="space-y-6">
			{/* Stamp 1 Large */}
			<div>
				<p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">
					Штамп №1 — Рис. 1 (7,5 × 3,5 см)
				</p>
				<div
					className="bg-white rounded border-2 border-slate-300 overflow-hidden"
					style={{ width: "283px", ...labelStyle }}
				>
					<table
						style={{ borderCollapse: "collapse", width: "100%", fontSize: "8px" }}
					>
						<tbody>
							{/* Row 1: Уч.№ | Уч.№ | ДСП — all borders */}
							<tr style={{ height: "28px" }}>
								<td style={{ border: cellBorder, padding: "2px 4px", width: "34%" }}>
									Уч. №<strong>{inventory || "___"}</strong>
								</td>
								<td style={{ border: cellBorder, padding: "2px 4px", width: "34%" }}>
									Уч. №<strong>{inventory || "___"}</strong>
								</td>
								<td
									style={{
										border: cellBorder,
										padding: "2px 4px",
										textAlign: "center",
										fontSize: "7px",
										width: "32%",
									}}
								>
									Для служебного пользования
								</td>
							</tr>
							{/* Row 2: Экз.№ | Аббр. | Аббр. — all borders */}
							<tr style={{ height: "18px" }}>
								<td style={{ border: cellBorder, padding: "2px 4px" }}>
									Экз. №{copyNumber}
								</td>
								<td
									style={{
										border: cellBorder,
										padding: "2px 4px",
										textAlign: "center",
									}}
								>
									{orgAbbr}
								</td>
								<td
									style={{
										border: cellBorder,
										padding: "2px 4px",
										textAlign: "center",
									}}
								>
									{orgAbbr}
								</td>
							</tr>
							{/* Row 3: Дата/подпись | Подразделение (centered, bottom, 7px) */}
							<tr style={{ height: "54px" }}>
								<td
									style={{
										border: cellBorder,
										padding: "2px 4px",
										verticalAlign: "top",
										fontSize: "7px",
										width: "34%",
									}}
								>
									{dateStr}
									<br />
									<span style={{ borderBottom: cellBorder, display: "inline-block", width: "80px" }}>
										&nbsp;
									</span>
									<br />
									<span style={{ fontSize: "6px" }}>(подпись)</span>
								</td>
								{/* Cell spanning cols 2+3: centered, bottom, font 7px */}
								<td
									colSpan={2}
									style={{
										border: cellBorder,
										padding: "2px 4px",
										verticalAlign: "bottom",
										fontSize: "7px",
										textAlign: "center",
										width: "66%",
									}}
								>
									<div>{subdivision}</div>
									<div style={{ borderBottom: cellBorder, width: "100%" }}>&nbsp;</div>
									<div style={{ fontSize: "6px" }}>(наименование структурного подразделения)</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			{/* Stamp 1 Small */}
			<div>
				<p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">
					Штамп №1 — Рис. 2 (4,5 × 2 см)
				</p>
				<div
					className="bg-white rounded border-2 border-slate-300 overflow-hidden"
					style={{ width: "170px", ...labelStyle }}
				>
					<table
						style={{ borderCollapse: "collapse", width: "100%", fontSize: "8px" }}
					>
						<tbody>
							<tr style={{ height: "16px" }}>
								<td style={{ border: cellBorder, padding: "1px 3px", width: "47%" }}>
									Уч. №<strong>{inventory || "___"}</strong>
								</td>
								<td
									style={{
										border: cellBorder,
										padding: "1px 3px",
										textAlign: "center",
										width: "53%",
										fontSize: "7px",
									}}
								>
									Не секретный
								</td>
							</tr>
							<tr style={{ height: "12px" }}>
								<td style={{ border: cellBorder, padding: "1px 3px" }}>
									Экз. №{copyNumber}
								</td>
								<td
									style={{
										border: cellBorder,
										padding: "1px 3px",
										textAlign: "center",
									}}
								>
									{orgAbbr}
								</td>
							</tr>
							<tr style={{ height: "28px" }}>
								<td
									style={{
										border: cellBorder,
										padding: "1px 3px",
										fontSize: "7px",
										verticalAlign: "bottom",
									}}
								>
									{dateStr}
								</td>
								<td
									style={{
										border: cellBorder,
										padding: "1px 3px",
										fontSize: "7px",
										verticalAlign: "center",
									}}
								>
									{subdivision}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			{/* Main label — Рис. 3: ALL BOLD borders (2px) */}
			<div>
				<p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">
					Рис. 3 — Информационная табличка (13 × 4 см)
				</p>
				<div
					className="bg-white rounded border-2 border-slate-300 overflow-hidden"
					style={{ width: "491px", ...labelStyle }}
				>
					<table
						style={{ borderCollapse: "collapse", width: "100%", fontSize: "9px" }}
					>
						<tbody>
							<tr style={{ height: "27px" }}>
								<td
									colSpan={4}
									style={{
										border: cellBorderBold,
										padding: "2px 4px",
										textAlign: "center",
										fontWeight: "bold",
									}}
								>
									{organization}
									<br />
									{subdivision}
								</td>
							</tr>
							<tr style={{ height: "18px" }}>
								<td style={{ border: cellBorderBold, padding: "2px 4px", width: "35%" }}>
									Пользователь
								</td>
								<td style={{ border: cellBorderBold, padding: "2px 4px", width: "12%" }} />
								<td style={{ border: cellBorderBold, padding: "2px 4px", width: "41%" }}>
									{userName || "___"}
								</td>
								<td style={{ border: cellBorderBold, padding: "2px 4px", width: "12%" }} />
							</tr>
							<tr style={{ height: "18px" }}>
								<td style={{ border: cellBorderBold, padding: "2px 4px" }}>
									Отв. за ЗИ
								</td>
								<td style={{ border: cellBorderBold, padding: "2px 4px" }} />
								<td style={{ border: cellBorderBold, padding: "2px 4px" }}>
									{responsible || "___"}
								</td>
								<td style={{ border: cellBorderBold, padding: "2px 4px" }} />
							</tr>
							<tr style={{ height: "25px" }}>
								<td style={{ border: cellBorderBold, padding: "2px 4px" }}>
									Установлены МНИ:
								</td>
								<td style={{ border: cellBorderBold, padding: "2px 4px", fontSize: "8px" }}>
									{mniType}
								</td>
								<td style={{ border: cellBorderBold, padding: "2px 4px", fontSize: "8px" }}>
									Уч. № {inventory || "___"}
									<br />
									Зав. №{mniSerial || "___"}
								</td>
								<td style={{ border: cellBorderBold, padding: "2px 4px", fontSize: "8px" }}>
									Уч. № {inventory || "___"}
									<br />
									Зав. №{mniSerial || "___"}
								</td>
							</tr>
							<tr style={{ height: "15px" }}>
								<td
									colSpan={4}
									style={{
										border: cellBorderBold,
										padding: "2px 4px",
										textAlign: "center",
										fontWeight: "bold",
									}}
								>
									Эвакуируется во 2 очередь
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			{/* Warning labels */}
			<div>
				<p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">
					Рис. 4 — Предупредительные таблички (15 × 1 см)
				</p>
				<div className="space-y-2">
					<div
						className="bg-white rounded border-2 border-slate-300"
						style={{ width: "566px", ...labelStyle }}
					>
						<table
							style={{ borderCollapse: "collapse", width: "100%", fontSize: "10px" }}
						>
							<tbody>
								<tr style={{ height: "26px" }}>
									<td
										style={{
											border: "2px solid #000",
											padding: "2px 8px",
											textAlign: "center",
											fontWeight: "bold",
										}}
									>
										Обработка секретной информации запрещена!
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div
						className="bg-white rounded border-2 border-slate-300"
						style={{ width: "566px", ...labelStyle }}
					>
						<table
							style={{ borderCollapse: "collapse", width: "100%", fontSize: "9px" }}
						>
							<tbody>
								<tr style={{ height: "26px" }}>
									<td
										style={{
											border: "2px solid #000",
											padding: "2px 8px",
											textAlign: "center",
											fontWeight: "bold",
										}}
									>
										При обнаружении вредоносного программного обеспечения сообщить в
										службу защиты государственной тайны по телефону 9555
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TagsPage() {
	const [form, setForm] = useState<TagFormState>(makeInitialState);
	const [isPending, startTransition] = useTransition();
	const [generateError, setGenerateError] = useState<string | null>(null);
	const [showPreview, setShowPreview] = useState(true);

	const setField = useCallback(
		<K extends keyof TagFormState>(key: K) =>
			(value: TagFormState[K]) =>
				setForm((prev) => ({ ...prev, [key]: value })),
		[],
	);

	// ─── Data queries (no useEffect!) ─────────────────────────────────────────

	const { data: personnelData } = useQuery({
		queryKey: ["personnel", { limit: 1000 }],
		queryFn: () => personnelApi.getList({ limit: 1000 }),
		staleTime: 5 * 60 * 1000,
	});

	const { data: equipmentData } = useQuery({
		queryKey: ["equipment", { is_personal: false, limit: 1000 }],
		queryFn: () => equipmentApi.getList({ is_personal: false, limit: 1000 }),
		staleTime: 5 * 60 * 1000,
	});

	// ─── Derived values (no useEffect, pure computation) ─────────────────────

	const selectedPersonnel = useMemo(
		() => personnelData?.items.find((p) => p.id === form.personnelId),
		[personnelData, form.personnelId],
	);

	const selectedEquipment = useMemo(
		() => equipmentData?.items.find((e) => e.id === form.equipmentId),
		[equipmentData, form.equipmentId],
	);

	// Auto-derived values: prefer manual override, fall back to DB data
	const effectiveInventory = useMemo(
		() =>
			form.manualInventory.trim() ||
			selectedEquipment?.inventory_number ||
			"",
		[form.manualInventory, selectedEquipment],
	);

	const effectiveMniSerial = useMemo(
		() =>
			form.manualMniSerial.trim() ||
			selectedEquipment?.mni_serial_number ||
			selectedEquipment?.serial_number ||
			"",
		[form.manualMniSerial, selectedEquipment],
	);

	const effectiveUserName = useMemo(() => {
		if (form.manualUserName.trim()) return form.manualUserName.trim();
		if (selectedPersonnel) {
			const parts = selectedPersonnel.full_name.trim().split(/\s+/);
			if (parts.length >= 3)
				return `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`;
			if (parts.length === 2) return `${parts[0]} ${parts[1][0]}.`;
			return selectedPersonnel.full_name;
		}
		// Fall back to equipment owner
		if (selectedEquipment?.current_owner_name) {
			const n = selectedEquipment.current_owner_name.trim().split(/\s+/);
			if (n.length >= 3) return `${n[0]} ${n[1][0]}.${n[2][0]}.`;
			if (n.length === 2) return `${n[0]} ${n[1][0]}.`;
			return selectedEquipment.current_owner_name;
		}
		return "";
	}, [form.manualUserName, selectedPersonnel, selectedEquipment]);

	const dateStr = useMemo(() => {
		const m = parseInt(form.month) - 1;
		return `«${form.day}»  ${MONTHS_GEN[m] ?? ""}  ${form.year} г.`;
	}, [form.day, form.month, form.year]);

	const canGenerate = effectiveInventory.trim() !== "";

	// ─── Generate handler ─────────────────────────────────────────────────────

	const handleGenerate = () => {
		if (!canGenerate || isPending) return;
		setGenerateError(null);

		startTransition(async () => {
			try {
				const payload = {
					inventoryNumber: effectiveInventory,
					mniSerial: effectiveMniSerial,
					userName: effectiveUserName,
					responsible: form.responsibleName,
					copyNumber: form.copyNumber,
					day: form.day,
					month: MONTHS_GEN[parseInt(form.month) - 1] ?? "января",
					year: form.year,
					subdivision: form.subdivision,
					organization: form.organization,
					mniType: form.mniType,
				};

				const res = await fetch("/api/acts/tags/generate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
					credentials: "include",
				});

				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(
						(err as { error?: string }).error ?? "Ошибка генерации",
					);
				}

				const blob = await res.blob();
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				const lastName = effectiveUserName.split(" ")[0] || "бирки";
				a.href = url;
				a.download = `бирки_${lastName}.docx`;
				a.click();
				URL.revokeObjectURL(url);
			} catch (e) {
				setGenerateError(
					e instanceof Error ? e.message : "Неизвестная ошибка",
				);
			}
		});
	};

	const currentYear = new Date().getFullYear();
	const yearOptions = [currentYear - 1, currentYear, currentYear + 1].map(String);

	const sectionCls =
		"bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 space-y-4";

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 text-foreground">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-6">
					<Button
						variant="ghost"
						asChild
						className="mb-4 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
					>
						<Link href="/acts">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Назад к актам
						</Link>
					</Button>
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 bg-emerald-600/20 border border-emerald-500/30 rounded-lg flex items-center justify-center">
							<Tag className="w-5 h-5 text-emerald-400" />
						</div>
						<div>
							<h1 className="text-2xl font-bold tracking-tight">
								Генерация бирок
							</h1>
							<p className="text-muted-foreground mt-1">
								Формирование штампов и информационных табличек на СВТ
							</p>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
					{/* ── Left: Form ── */}
					<div className="space-y-6">
						{/* Equipment & Personnel */}
						<div className={sectionCls}>
							<div className="flex items-center gap-2 mb-1">
								<HardDrive className="w-4 h-4 text-emerald-400" />
								<h2 className="text-sm font-semibold text-slate-200">
									Оборудование и личный состав
								</h2>
							</div>

							<Field
								label="Выбрать технику из базы"
								icon={HardDrive}
								hint="Инвентарный и МНИ номера заполнятся автоматически"
							>
								<EquipmentSelect
									value={form.equipmentId}
									onValueChange={(id) => {
										const eq = equipmentData?.items.find((e) => e.id === id);
										setForm((prev) => ({
											...prev,
											equipmentId: id,
											manualInventory: "",
											manualMniSerial: "",
											manualUserName: "",
											// автоматически выбираем владельца из базы, если он есть
											personnelId: eq?.current_owner_id ?? prev.personnelId,
										}));
									}}
									placeholder="Поиск по модели, номеру…"
								/>
							</Field>

							{selectedEquipment && (
								<div className="rounded-lg bg-emerald-900/20 border border-emerald-800/40 px-3 py-2.5 text-xs text-emerald-300 space-y-1">
									{selectedEquipment.inventory_number && (
										<div>
											Инв. №:{" "}
											<span className="font-mono font-semibold">
												{selectedEquipment.inventory_number}
											</span>
										</div>
									)}
									{(selectedEquipment.mni_serial_number ||
										selectedEquipment.serial_number) && (
											<div>
												МНИ / S/N:{" "}
												<span className="font-mono font-semibold">
													{selectedEquipment.mni_serial_number ||
														selectedEquipment.serial_number}
												</span>
											</div>
										)}
									{selectedEquipment.current_owner_name && (
										<div>
											Владелец:{" "}
											<span className="font-semibold">
												{selectedEquipment.current_owner_name}
											</span>
										</div>
									)}
								</div>
							)}

							<div className="flex items-center gap-3">
								<div className="flex-1 h-px bg-slate-700/60" />
								<span className="text-xs text-slate-600">или вручную</span>
								<div className="flex-1 h-px bg-slate-700/60" />
							</div>

							<Field
								label="Учётный номер (Уч. №)"
								icon={Hash}
							>
								<input
									type="text"
									value={effectiveInventory}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											equipmentId: undefined,
											manualInventory: e.target.value,
										}))
									}
									placeholder="616/806дсп"
									className={selectedEquipment && !form.manualInventory ? inputFilledCls : inputCls}
								/>
							</Field>

							<Field
								label="Заводской номер МНИ (Зав. №)"
								icon={Hash}
								hint="Серийный номер SSD/HDD. Напр.: 2M012LQSK9UT"
							>
								<input
									type="text"
									value={effectiveMniSerial}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											equipmentId: undefined,
											manualMniSerial: e.target.value,
										}))
									}
									placeholder="2M012LQSK9UT"
									className={`font-mono ${selectedEquipment && !form.manualMniSerial ? inputFilledCls : inputCls}`}
								/>
							</Field>

							<Field label="Пользователь (ФИО)" icon={User}>
								<PersonnelSelect
									value={form.personnelId}
									onValueChange={(id) =>
										setForm((prev) => ({
											...prev,
											personnelId: id,
											manualUserName: "",
										}))
									}
									placeholder="Выбрать из базы…"
								/>
							</Field>

							{form.personnelId && (
								<p className="text-xs text-slate-500">
									↳ В бирке: {effectiveUserName}
								</p>
							)}

							{!form.personnelId && (
								<input
									type="text"
									value={form.manualUserName}
									onChange={(e) => setField("manualUserName")(e.target.value)}
									placeholder="или введите вручную: Баймаков Д.А."
									className={inputCls}
								/>
							)}
						</div>

						{/* Responsible & Copy */}
						<div className={sectionCls}>
							<div className="flex items-center gap-2 mb-1">
								<Shield className="w-4 h-4 text-emerald-400" />
								<h2 className="text-sm font-semibold text-slate-200">
									Ответственный и реквизиты
								</h2>
							</div>

							<Field label="Отв. за ЗИ (ФИО)" icon={Shield}>
								<input
									type="text"
									value={form.responsibleName}
									onChange={(e) => setField("responsibleName")(e.target.value)}
									placeholder="Халупа А.И."
									className={inputCls}
								/>
							</Field>

							<div className="grid grid-cols-2 gap-4">
								<Field label="Экз. №" icon={Hash}>
									<input
										type="text"
										value={form.copyNumber}
										onChange={(e) => setField("copyNumber")(e.target.value)}
										placeholder="1"
										className={inputCls}
									/>
								</Field>

								<Field label="Тип МНИ" icon={HardDrive}>
									<div className="relative">
										<select
											value={form.mniType}
											onChange={(e) => setField("mniType")(e.target.value)}
											className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-100 appearance-none cursor-pointer focus:outline-none focus:border-blue-500/60 transition-all"
										>
											{MNI_TYPES.map((t) => (
												<option key={t} value={t} className="bg-slate-800">
													{t}
												</option>
											))}
											<option value="другое" className="bg-slate-800">
												Другое
											</option>
										</select>
										<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
									</div>
								</Field>
							</div>
						</div>

						{/* Date */}
						<div className={sectionCls}>
							<div className="flex items-center gap-2 mb-1">
								<Calendar className="w-4 h-4 text-emerald-400" />
								<h2 className="text-sm font-semibold text-slate-200">
									Дата утверждения
								</h2>
							</div>

							<div className="grid grid-cols-3 gap-3">
								<Field label="День" icon={Calendar}>
									<div className="relative">
										<select
											value={form.day}
											onChange={(e) => setField("day")(e.target.value)}
											className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-100 appearance-none cursor-pointer focus:outline-none focus:border-blue-500/60 transition-all"
										>
											{DAY_OPTIONS.map((d) => (
												<option key={d} value={d} className="bg-slate-800">
													{d}
												</option>
											))}
										</select>
										<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
									</div>
								</Field>

								<Field label="Месяц" icon={Calendar}>
									<div className="relative">
										<select
											value={form.month}
											onChange={(e) => setField("month")(e.target.value)}
											className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-100 appearance-none cursor-pointer focus:outline-none focus:border-blue-500/60 transition-all"
										>
											{MONTH_OPTIONS.map(({ value, label }) => (
												<option key={value} value={value} className="bg-slate-800">
													{label}
												</option>
											))}
										</select>
										<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
									</div>
								</Field>

								<Field label="Год" icon={Calendar}>
									<div className="relative">
										<select
											value={form.year}
											onChange={(e) => setField("year")(e.target.value)}
											className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-100 appearance-none cursor-pointer focus:outline-none focus:border-blue-500/60 transition-all"
										>
											{yearOptions.map((y) => (
												<option key={y} value={y} className="bg-slate-800">
													{y} г.
												</option>
											))}
										</select>
										<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
									</div>
								</Field>
							</div>
							<p className="text-xs text-slate-600">Итог: {dateStr}</p>
						</div>

						{/* Organization */}
						<div className={sectionCls}>
							<div className="flex items-center gap-2 mb-1">
								<Building2 className="w-4 h-4 text-emerald-400" />
								<h2 className="text-sm font-semibold text-slate-200">
									Организация
								</h2>
							</div>

							<Field label="Организация" icon={Building2}>
								<input
									type="text"
									value={form.organization}
									onChange={(e) => setField("organization")(e.target.value)}
									className={inputCls}
								/>
							</Field>

							<Field label="Подразделение" icon={Building2}>
								<input
									type="text"
									value={form.subdivision}
									onChange={(e) => setField("subdivision")(e.target.value)}
									className={inputCls}
								/>
							</Field>
						</div>

						{/* Error */}
						{generateError && (
							<div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">
								<AlertCircle className="w-4 h-4 flex-shrink-0" />
								{generateError}
							</div>
						)}

						{/* Generate button */}
						<button
							type="button"
							onClick={handleGenerate}
							disabled={!canGenerate || isPending}
							className={`w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-sm font-semibold transition-all ${canGenerate && !isPending
									? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 active:scale-[0.98]"
									: "bg-slate-800/60 text-slate-600 cursor-not-allowed border border-slate-700/40"
								}`}
						>
							{isPending ? (
								<>
									<RefreshCw className="w-4 h-4 animate-spin" />
									Формирование документа…
								</>
							) : (
								<>
									<Download className="w-4 h-4" />
									Сформировать и скачать DOCX
								</>
							)}
						</button>

						{!canGenerate && (
							<p className="text-xs text-slate-600 text-center">
								Укажите учётный номер (Уч. №) для генерации
							</p>
						)}
					</div>

					{/* ── Right: Preview ── */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
								Предварительный просмотр
							</p>
							<button
								type="button"
								onClick={() => setShowPreview((v) => !v)}
								className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
							>
								<Eye className="w-3.5 h-3.5" />
								{showPreview ? "Свернуть" : "Развернуть"}
							</button>
						</div>

						{showPreview && (
							<div className="rounded-2xl overflow-hidden border border-slate-700/40 shadow-2xl">
								<div className="bg-slate-800/60 border-b border-slate-700/40 px-4 py-2.5 flex items-center gap-2">
									<div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
									<div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
									<div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
									<span className="text-xs text-slate-500 ml-2">
										бирки_{effectiveUserName.split(" ")[0] || "документ"}.docx
									</span>
								</div>
								<div className="bg-slate-100 p-6 overflow-auto max-h-[700px]">
									<TagPreview
										inventory={effectiveInventory}
										mniSerial={effectiveMniSerial}
										userName={effectiveUserName}
										responsible={form.responsibleName}
										copyNumber={form.copyNumber}
										dateStr={dateStr}
										subdivision={form.subdivision}
										organization={form.organization}
										mniType={form.mniType}
									/>
								</div>
							</div>
						)}

						<div className="bg-slate-900/40 border border-slate-800/40 rounded-xl p-4">
							<p className="text-xs text-slate-500 leading-relaxed">
								<span className="text-slate-400 font-medium">Формат:</span>{" "}
								A4, Times New Roman. Генерируются все 4 вида бирок согласно
								образцам: Штамп №1 (7,5×3,5 и 4,5×2 см), информационная
								табличка (13×4 см) и предупредительные таблички (15×1 см).
								Таблица Рис. 3 — с жирными границами.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}