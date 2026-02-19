"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Monitor, Laptop, Cpu, HardDrive, MapPin, User as UserIcon, Save, Info } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PersonnelSelect } from "@/components/shared/personnel-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { equipmentApi } from "@/lib/api/equipment";
import { cleanEmptyStrings } from "@/lib/utils/transform";

const EQUIPMENT_TYPES = ["АРМ", "ПЭВМ", "Ноутбук", "Сервер", "Принтер", "Другое"];
const STATUSES = ["В работе", "На складе", "В ремонте", "Сломан"];
const STORAGE_TYPES = ["HDD", "SSD", "NVMe", "Другое"];

const equipmentSchema = z
	.object({
		is_personal: z.boolean().default(false),
		equipment_type: z.string().min(1, "Выберите тип техники"),
		inventory_number: z.string().default(""),
		serial_number: z.string().default(""),
		mni_serial_number: z.string().default(""),
		manufacturer: z.string().default(""),
		model: z.string().default(""),
		cpu: z.string().default(""),
		ram_gb: z.number().optional(),
		storage_type: z.string().default(""),
		storage_capacity_gb: z.number().optional(),
		has_optical_drive: z.boolean().default(false),
		has_card_reader: z.boolean().default(false),
		has_laptop: z.boolean().default(false),
		laptop_functional: z.boolean().default(false),
		has_charger: z.boolean().default(false),
		charger_functional: z.boolean().default(false),
		has_mouse: z.boolean().default(false),
		mouse_functional: z.boolean().default(false),
		has_bag: z.boolean().default(false),
		bag_functional: z.boolean().default(false),
		operating_system: z.string().default(""),
		current_owner_id: z.number().optional(),
		current_location: z.string().default(""),
		status: z.string().default("В работе"),
		notes: z.string().default(""),
	})
	.superRefine((data, ctx) => {
		if (data.is_personal) return; // личное — инвентарный не обязателен
		const isLaptopNotInUse = data.equipment_type === "Ноутбук" && data.status !== "В работе";
		if (!isLaptopNotInUse && !data.inventory_number.trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["inventory_number"],
				message: "Учетный номер обязателен",
			});
		}
	});

type EquipmentFormInput = z.input<typeof equipmentSchema>;
type EquipmentFormData = z.output<typeof equipmentSchema>;

export default function CreateEquipmentPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [error, setError] = useState("");

	const initialIsPersonal = searchParams.get("personal") === "true";

	const { register, handleSubmit, setFocus, setValue, watch, formState: { errors } } = useForm<EquipmentFormInput, unknown, EquipmentFormData>({
		resolver: zodResolver(equipmentSchema),
		shouldFocusError: false,
		defaultValues: {
			is_personal: initialIsPersonal,
			equipment_type: initialIsPersonal ? "Ноутбук" : "",
			status: "В работе",
			has_optical_drive: false, has_card_reader: false,
			has_laptop: false, laptop_functional: false,
			has_charger: false, charger_functional: false,
			has_mouse: false, mouse_functional: false,
			has_bag: false, bag_functional: false,
		},
	});

	const isPersonal = watch("is_personal");
	const currentType = watch("equipment_type");
	const currentStatus = watch("status");
	const currentOwnerId = watch("current_owner_id");
	const currentStorageType = watch("storage_type");
	const hasOpticalDrive = watch("has_optical_drive");
	const hasCardReader = watch("has_card_reader");
	const hasLaptop = watch("has_laptop");
	const laptopFunctional = watch("laptop_functional");
	const hasCharger = watch("has_charger");
	const chargerFunctional = watch("charger_functional");
	const hasMouse = watch("has_mouse");
	const mouseFunctional = watch("mouse_functional");
	const hasBag = watch("has_bag");
	const bagFunctional = watch("bag_functional");

	const createMutation = useMutation({
		mutationFn: (data: EquipmentFormData) =>
			equipmentApi.create(cleanEmptyStrings(data) as any),
		onSuccess: (_, variables) => {
			toast.success(variables.is_personal ? "Личный ноутбук добавлен" : "Техника добавлена");
			router.push(variables.is_personal ? "/personal-items" : "/equipment");
		},
		onError: (err: unknown) => {
			const e = err as { response?: { data?: { detail?: string } } };
			const detail = e.response?.data?.detail;
			setError(typeof detail === "string" ? detail : "Ошибка при создании");
			toast.error("Ошибка при создании");
		},
	});

	const onSubmit = (data: EquipmentFormData) => {
		setError("");
		createMutation.mutate(data);
	};

	const onInvalidSubmit = (formErrors: FieldErrors<EquipmentFormInput>) => {
		toast.error("Проверьте обязательные поля формы");
		const firstErrorField = Object.keys(formErrors)[0] as keyof EquipmentFormInput | undefined;
		if (firstErrorField && firstErrorField !== "inventory_number") setFocus(firstErrorField as any);
	};

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-foreground">
			<div className="max-w-4xl mx-auto">
				<Button variant="ghost" asChild className="mb-6 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
					<Link href="/equipment">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<div className="mb-6">
					<h1 className="text-3xl font-bold tracking-tight">Добавление техники</h1>
					<p className="text-muted-foreground mt-1">Заполните данные для регистрации новой единицы оборудования</p>
				</div>

				<Card className="glass-elevated border-white/10 shadow-2xl overflow-hidden">
					<CardHeader className="bg-white/5 border-b border-white/10 py-6">
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg font-semibold flex items-center gap-2">
								{isPersonal
									? <Laptop className="h-5 w-5 text-purple-400" />
									: <Monitor className="h-5 w-5 text-primary" />
								}
								Форма регистрации
							</CardTitle>

							{/* Переключатель личного имущества */}
							<button
								type="button"
								onClick={() => setValue("is_personal", !isPersonal)}
								className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all ${
									isPersonal
										? "bg-purple-500/15 border-purple-500/30"
										: "bg-white/5 border-white/10 hover:bg-white/10"
								}`}
							>
								{/* Самодельный toggle */}
								<div className={`relative w-9 h-5 rounded-full transition-colors ${isPersonal ? "bg-purple-500" : "bg-white/20"}`}>
									<div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPersonal ? "translate-x-4" : "translate-x-0.5"}`} />
								</div>
								<div className="text-sm select-none text-left">
									<span className={isPersonal ? "text-purple-300 font-semibold" : "text-muted-foreground"}>
										Личное имущество
									</span>
									{isPersonal && (
										<p className="text-[10px] text-purple-400/70 mt-0.5">Не принадлежит МО</p>
									)}
								</div>
							</button>
						</div>

						{/* Плашка когда личное */}
						{isPersonal && (
							<div className="flex items-start gap-3 mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
								<Laptop className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
								<p className="text-xs text-purple-300/80 leading-relaxed">
									Личный ноутбук не требует обязательного инвентарного номера МО.
									После сохранения он будет отображаться в разделе «Личные вещи».
								</p>
							</div>
						)}
					</CardHeader>

					<form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}>
						<CardContent className="space-y-8 p-8">
							{error && (
								<Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							{/* Секция: Основная информация */}
							<div className="space-y-4">
								<h3 className="text-sm font-bold uppercase tracking-widest text-primary/70 border-b border-white/5 pb-2">
									Основная информация
								</h3>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label className="text-muted-foreground">Тип техники *</Label>
										<Select
											value={currentType}
											onValueChange={(val) => setValue("equipment_type", val)}
										>
											<SelectTrigger className={`bg-background/50 border-white/10 focus:border-primary/50 ${errors.equipment_type ? "border-destructive/50" : ""}`}>
												<SelectValue placeholder="Выберите тип" />
											</SelectTrigger>
											<SelectContent className="glass border-white/10">
												{EQUIPMENT_TYPES.map((type) => (
													<SelectItem key={type} value={type}>{type}</SelectItem>
												))}
											</SelectContent>
										</Select>
										{errors.equipment_type && <p className="text-xs text-destructive">{errors.equipment_type.message}</p>}
									</div>

									<div className="space-y-2">
										<Label htmlFor="inventory_number" className="text-muted-foreground">
											Учетный номер
											{!isPersonal && !(currentType === "Ноутбук" && currentStatus !== "В работе") ? " *" : ""}
											{isPersonal && <span className="ml-1 text-purple-400/60 text-[10px] font-normal">(опционально для личного)</span>}
										</Label>
										<Input
											id="inventory_number"
											{...register("inventory_number")}
											placeholder="570/720/321"
											className={`bg-background/50 border-white/10 font-mono focus:border-primary/50 ${errors.inventory_number ? "border-destructive/50" : ""}`}
										/>
										<p className="text-[10px] text-muted-foreground opacity-70">Пример: 570/720/321</p>
										{errors.inventory_number && <p className="text-xs text-destructive">{errors.inventory_number.message}</p>}
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="manufacturer" className="text-muted-foreground">Производитель</Label>
										<Input id="manufacturer" {...register("manufacturer")} placeholder="Dell, HP, Lenovo..."
											className="bg-background/50 border-white/10 focus:border-primary/50" />
									</div>
									<div className="space-y-2">
										<Label htmlFor="model" className="text-muted-foreground">Модель</Label>
										<Input id="model" {...register("model")} placeholder="OptiPlex 7090"
											className="bg-background/50 border-white/10 focus:border-primary/50" />
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="serial_number" className="text-muted-foreground font-mono text-xs uppercase">Серийный номер (S/N)</Label>
										<Input id="serial_number" {...register("serial_number")} placeholder="S/N: ABC123XYZ"
											className="bg-background/50 border-white/10 font-mono focus:border-primary/50" />
									</div>
									<div className="space-y-2">
										<Label htmlFor="mni_serial_number" className="text-muted-foreground font-mono text-xs uppercase">Серийный номер МНИ</Label>
										<Input id="mni_serial_number" {...register("mni_serial_number")} placeholder="МНИ: MNI789456"
											className="bg-background/50 border-white/10 font-mono focus:border-primary/50" />
									</div>
								</div>
							</div>

							{/* Секция: Характеристики */}
							<div className="space-y-4">
								<h3 className="text-sm font-bold uppercase tracking-widest text-primary/70 border-b border-white/5 pb-2 flex items-center gap-2">
									<Cpu className="h-4 w-4" /> Характеристики
								</h3>
								<div className="space-y-2">
									<Label htmlFor="cpu" className="text-muted-foreground">Процессор</Label>
									<Input id="cpu" {...register("cpu")} placeholder="Intel Core i5-10400"
										className="bg-background/50 border-white/10 focus:border-primary/50" />
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="ram_gb" className="text-muted-foreground">Объём RAM (ГБ)</Label>
										<Input id="ram_gb" type="number" {...register("ram_gb", { valueAsNumber: true })} placeholder="16"
											className="bg-background/50 border-white/10 focus:border-primary/50" />
									</div>
									<div className="space-y-2">
										<Label className="text-muted-foreground flex items-center gap-2"><HardDrive className="h-3 w-3" /> Тип хранилища</Label>
										<Select value={currentStorageType} onValueChange={(val) => setValue("storage_type", val)}>
											<SelectTrigger className="bg-background/50 border-white/10 focus:border-primary/50">
												<SelectValue placeholder="Выберите тип" />
											</SelectTrigger>
											<SelectContent className="glass border-white/10">
												{STORAGE_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
											</SelectContent>
										</Select>
									</div>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="storage_capacity_gb" className="text-muted-foreground">Объём хранилища (ГБ)</Label>
										<Input id="storage_capacity_gb" type="number" {...register("storage_capacity_gb", { valueAsNumber: true })} placeholder="512"
											className="bg-background/50 border-white/10 focus:border-primary/50" />
									</div>
									<div className="space-y-2">
										<Label htmlFor="operating_system" className="text-muted-foreground">Операционная система</Label>
										<Input id="operating_system" {...register("operating_system")} placeholder="Windows 10 Pro"
											className="bg-background/50 border-white/10 focus:border-primary/50" />
									</div>
								</div>

								<div className="space-y-4 pt-2">
									<Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Комплектация и периферия</Label>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
										<div className="space-y-3">
											{([
												["has_optical_drive", hasOpticalDrive, "Оптический привод"],
												["has_card_reader", hasCardReader, "Картридер"],
												["has_laptop", hasLaptop, "Ноутбук (наличие)"],
												["laptop_functional", laptopFunctional, "Ноутбук исправен"],
											] as const).map(([field, val, label]) => (
												<div key={field} className="flex items-center space-x-3">
													<Checkbox id={field} checked={val as boolean}
														onCheckedChange={(c) => setValue(field, c as boolean)} />
													<Label htmlFor={field} className="text-sm font-medium cursor-pointer">{label}</Label>
												</div>
											))}
										</div>
										<div className="space-y-3">
											{([
												["has_charger", hasCharger, "Зарядка (наличие)"],
												["charger_functional", chargerFunctional, "Зарядка исправна"],
												["has_mouse", hasMouse, "Мышь (наличие)"],
												["mouse_functional", mouseFunctional, "Мышь исправна"],
											] as const).map(([field, val, label]) => (
												<div key={field} className="flex items-center space-x-3">
													<Checkbox id={field} checked={val as boolean}
														onCheckedChange={(c) => setValue(field, c as boolean)} />
													<Label htmlFor={field} className="text-sm font-medium cursor-pointer">{label}</Label>
												</div>
											))}
										</div>
										<div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/5 mt-1">
											{([
												["has_bag", hasBag, "Сумка (наличие)"],
												["bag_functional", bagFunctional, "Сумка исправна"],
											] as const).map(([field, val, label]) => (
												<div key={field} className="flex items-center space-x-3">
													<Checkbox id={field} checked={val as boolean}
														onCheckedChange={(c) => setValue(field, c as boolean)} />
													<Label htmlFor={field} className="text-sm font-medium cursor-pointer">{label}</Label>
												</div>
											))}
										</div>
									</div>
								</div>
							</div>

							{/* Секция: Размещение */}
							<div className="space-y-4">
								<h3 className="text-sm font-bold uppercase tracking-widest text-primary/70 border-b border-white/5 pb-2 flex items-center gap-2">
									<MapPin className="h-4 w-4" /> Размещение
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label className="text-muted-foreground flex items-center gap-1.5"><UserIcon className="h-3 w-3" /> Ответственное лицо</Label>
										<PersonnelSelect value={currentOwnerId} onValueChange={(val) => setValue("current_owner_id", val)}
											placeholder="Выберите владельца (опционально)" />
									</div>
									<div className="space-y-2">
										<Label className="text-muted-foreground">Статус оборудования</Label>
										<Select value={currentStatus} onValueChange={(val) => setValue("status", val)}>
											<SelectTrigger className="bg-background/50 border-white/10 focus:border-primary/50">
												<SelectValue />
											</SelectTrigger>
											<SelectContent className="glass border-white/10">
												{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
											</SelectContent>
										</Select>
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="current_location" className="text-muted-foreground">Местоположение</Label>
									<Input id="current_location" {...register("current_location")} placeholder="Каб. 205, Склад №1"
										className="bg-background/50 border-white/10 focus:border-primary/50" />
								</div>
							</div>

							{/* Секция: Дополнительно */}
							<div className="space-y-4">
								<h3 className="text-sm font-bold uppercase tracking-widest text-primary/70 border-b border-white/5 pb-2 flex items-center gap-2">
									<Info className="h-4 w-4" /> Дополнительно
								</h3>
								<div className="space-y-2">
									<Label htmlFor="notes" className="text-muted-foreground">Примечания</Label>
									<Textarea id="notes" {...register("notes")} placeholder="Дополнительные сведения о технике..." rows={4}
										className="bg-background/50 border-white/10 focus:border-primary/50 resize-none" />
								</div>
							</div>
						</CardContent>

						<CardFooter className="bg-white/5 flex justify-between border-t border-white/10 py-6 px-8">
							<Button type="button" variant="ghost" asChild className="hover:bg-white/10 text-muted-foreground transition-colors">
								<Link href="/equipment">Отмена</Link>
							</Button>
							<Button type="submit" disabled={createMutation.isPending}
								className={`border-0 shadow-lg px-8 font-semibold ${isPersonal ? "bg-purple-600 hover:bg-purple-700" : "gradient-primary"}`}>
								{createMutation.isPending ? (
									<div className="flex items-center gap-2">
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
										Сохранение...
									</div>
								) : (
									<div className="flex items-center gap-2">
										<Save className="h-4 w-4" />
										{isPersonal ? "Добавить личный ноутбук" : "Создать запись"}
									</div>
								)}
							</Button>
						</CardFooter>
					</form>
				</Card>
			</div>
		</div>
	);
}