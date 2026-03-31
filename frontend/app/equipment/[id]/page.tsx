"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft, History, Save, Monitor, Cpu, MapPin, Info, Edit3, X,
	FileText, User as UserIcon, Calendar, Hash, Tag, Tv,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { equipmentApi } from "@/lib/api/equipment";
import {
	COMPLEX_EQUIPMENT_TYPES, STATUSES,
	SIMPLE_EQUIPMENT_TYPES, STORAGE_TYPES, isSimpleEquipmentType,
} from "@/lib/equipment-types";
import { personnelApi } from "@/lib/api/personnel";
import { cleanEmptyStrings } from "@/lib/utils/transform";

const equipmentSchema = z
	.object({
		equipment_type: z.string().min(1),
		display_name: z.string().max(255).default(""),
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
		current_owner_id: z.number().nullable().optional(),
		current_location: z.string().default(""),
		status: z.string().default("В работе"),
		notes: z.string().default(""),
	})
	.superRefine((data, ctx) => {
		const simple = isSimpleEquipmentType(data.equipment_type);
		if (simple) {
			const hasId =
				data.display_name.trim() ||
				data.serial_number.trim() ||
				data.inventory_number.trim() ||
				data.model.trim();
			if (!hasId) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["display_name"],
					message: "Укажите название или серийный номер устройства",
				});
			}
		} else {
			const isLaptopNotInUse = data.equipment_type === "Ноутбук" && data.status !== "В работе";
			if (!isLaptopNotInUse && !data.inventory_number.trim()) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["inventory_number"],
					message: "Учетный номер обязателен",
				});
			}
		}
	});

type EquipmentFormInput = z.input<typeof equipmentSchema>;
type EquipmentFormData = z.output<typeof equipmentSchema>;

export default function EquipmentDetailPage() {
	const _router = useRouter();
	const params = useParams();
	const queryClient = useQueryClient();
	const [error, setError] = useState("");
	const [isEditing, setIsEditing] = useState(false);

	const equipmentId = parseInt(params.id as string, 10);

	const { data: equipment, isLoading } = useQuery({
		queryKey: ["equipment", equipmentId],
		queryFn: () => equipmentApi.getById(equipmentId),
	});

	const { data: personnelData } = useQuery({
		queryKey: ["personnel"],
		queryFn: () => personnelApi.getList({ limit: 1000 }),
	});

	const { data: movementHistory } = useQuery({
		queryKey: ["equipment", equipmentId, "movements"],
		queryFn: () => equipmentApi.getMovementHistory(equipmentId),
		enabled: !!equipment,
	});

	const {
		register, handleSubmit, setFocus, setValue, watch, reset,
		formState: { errors },
	} = useForm<EquipmentFormInput, unknown, EquipmentFormData>({
		resolver: zodResolver(equipmentSchema),
		shouldFocusError: false,
	});

	useEffect(() => {
		if (equipment) {
			reset({
				equipment_type: equipment.equipment_type,
				display_name: equipment.display_name || "",
				inventory_number: equipment.inventory_number || "",
				serial_number: equipment.serial_number || "",
				mni_serial_number: equipment.mni_serial_number || "",
				manufacturer: equipment.manufacturer || "",
				model: equipment.model || "",
				cpu: equipment.cpu || "",
				ram_gb: equipment.ram_gb,
				storage_type: equipment.storage_type || "",
				storage_capacity_gb: equipment.storage_capacity_gb,
				has_optical_drive: equipment.has_optical_drive,
				has_card_reader: equipment.has_card_reader,
				has_laptop: equipment.has_laptop,
				laptop_functional: equipment.laptop_functional,
				has_charger: equipment.has_charger,
				charger_functional: equipment.charger_functional,
				has_mouse: equipment.has_mouse,
				mouse_functional: equipment.mouse_functional,
				has_bag: equipment.has_bag,
				bag_functional: equipment.bag_functional,
				operating_system: equipment.operating_system || "",
				current_owner_id: equipment.current_owner_id,
				current_location: equipment.current_location || "",
				status: equipment.status,
				notes: equipment.notes || "",
			});
		}
	}, [equipment, reset]);

	const updateMutation = useMutation({
		mutationFn: (data: EquipmentFormData) => equipmentApi.update(equipmentId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["equipment", equipmentId] });
			queryClient.invalidateQueries({ queryKey: ["equipment"] });
			setIsEditing(false);
			setError("");
			toast.success("Данные обновлены");
		},
		onError: (err: unknown) => {
			const e = err as { response?: { data?: { detail?: string } } };
			const detail = e.response?.data?.detail;
			setError(typeof detail === "string" ? detail : "Ошибка");
			toast.error("Ошибка при обновлении");
		},
	});

	const onSubmit = (data: EquipmentFormData) => {
		setError("");
		const cleaned = cleanEmptyStrings(data);
		updateMutation.mutate(cleaned as EquipmentFormData);
	};

	const onInvalidSubmit = (formErrors: FieldErrors<EquipmentFormInput>) => {
		toast.error("Проверьте обязательные поля формы");
		const first = Object.keys(formErrors)[0] as keyof EquipmentFormInput | undefined;
		if (first && first !== "inventory_number") {
			setFocus(first as keyof EquipmentFormInput);
		}
	};

	const currentType = watch("equipment_type");
	const currentStatus = watch("status");
	const currentOwnerId = watch("current_owner_id");
	const currentStorageType = watch("storage_type");
	const isSimple = isSimpleEquipmentType(currentType);

	const inputCls = "bg-background/50 border-white/10 focus:border-primary/50 disabled:opacity-100 disabled:bg-white/5";

	if (isLoading) {
		return (
			<div className="min-h-screen bg-slate-900 flex items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			</div>
		);
	}

	if (!equipment) {
		return (
			<div className="min-h-screen bg-slate-900 flex items-center justify-center text-foreground">
				<p>Оборудование не найдено</p>
			</div>
		);
	}

	const displayLabel = equipment.display_name ||
		[equipment.manufacturer, equipment.model].filter(Boolean).join(" ") ||
		equipment.equipment_type;

	const getStatusBadge = (status: string) => {
		const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
			"В работе": "default", "На складе": "secondary",
			"В ремонте": "outline", "Сломан": "destructive",
		};
		return <Badge variant={variants[status] || "default"} className="px-3 shadow-sm">{status}</Badge>;
	};

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-foreground">
			<div className="max-w-6xl mx-auto">
				<Button variant="ghost" asChild className="mb-6 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
					<Link href="/equipment">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<div className="flex flex-wrap justify-between items-start mb-8 gap-4">
					<div>
						<div className="flex items-center gap-3 mb-1">
							<div className={`p-2 rounded-lg ${isSimpleEquipmentType(equipment.equipment_type) ? "bg-emerald-500/10" : "bg-primary/10"}`}>
								{isSimpleEquipmentType(equipment.equipment_type)
									? <Tv className="h-5 w-5 text-emerald-400" />
									: <Monitor className="h-5 w-5 text-primary" />
								}
							</div>
							<h1 className="text-3xl font-bold tracking-tight">{displayLabel}</h1>
							{getStatusBadge(equipment.status)}
						</div>
						<p className="text-muted-foreground flex items-center gap-2 ml-11">
							<span className="font-medium text-primary/80">{equipment.equipment_type}</span>
							{equipment.inventory_number && (
								<><span className="opacity-30">•</span><span className="font-mono text-xs">#{equipment.inventory_number}</span></>
							)}
							{equipment.serial_number && !equipment.inventory_number && (
								<><span className="opacity-30">•</span><span className="font-mono text-xs">S/N: {equipment.serial_number}</span></>
							)}
						</p>
					</div>
					<div className="flex gap-3">
						<Button
							variant={isEditing ? "outline" : "secondary"}
							onClick={() => setIsEditing(!isEditing)}
							className={!isEditing ? "bg-white/10 hover:bg-white/20 border-0" : "bg-transparent border-white/20"}
						>
							{isEditing ? <><X className="mr-2 h-4 w-4" /> Отменить</> : <><Edit3 className="mr-2 h-4 w-4" /> Редактировать</>}
						</Button>
					</div>
				</div>

				<Tabs defaultValue="details" className="space-y-6">
					<TabsList className="bg-background/50 border border-white/5 p-1">
						<TabsTrigger value="details" className="data-[state=active]:bg-primary/20">Детали</TabsTrigger>
						<TabsTrigger value="movements" className="data-[state=active]:bg-primary/20">
							<History className="mr-2 h-4 w-4" />
							История ({movementHistory?.total || 0})
						</TabsTrigger>
					</TabsList>

					<TabsContent value="details" className="space-y-6">
						<form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}>
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
								<div className="lg:col-span-2 space-y-6">
									{error && (
										<Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
											<AlertDescription>{error}</AlertDescription>
										</Alert>
									)}

									{/* Основные данные */}
									<Card className="glass-elevated border-white/10 overflow-hidden">
										<CardHeader className="bg-white/5 border-b border-white/10">
											<CardTitle className="text-lg flex items-center gap-2">
												<FileText className="h-4 w-4 text-primary" /> Основные данные
											</CardTitle>
										</CardHeader>
										<CardContent className="p-6 space-y-6">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
												<div className="space-y-2">
													<Label className="text-muted-foreground">Тип оборудования</Label>
													{isEditing ? (
														<Select value={currentType} onValueChange={(val) => setValue("equipment_type", val)}>
															<SelectTrigger className={`bg-background/50 border-white/10 ${errors.equipment_type ? "border-destructive/50" : ""}`}>
																<SelectValue />
															</SelectTrigger>
															<SelectContent className="glass border-white/10">
																{COMPLEX_EQUIPMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
																<SelectItem value="__sep__" disabled className="text-muted-foreground/40 text-xs py-1">──────</SelectItem>
																{SIMPLE_EQUIPMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
															</SelectContent>
														</Select>
													) : (
														<div className="p-2.5 rounded-md bg-white/5 border border-transparent font-medium flex items-center gap-2">
															{isSimpleEquipmentType(equipment.equipment_type)
																? <Tv className="h-3.5 w-3.5 text-emerald-400" />
																: <Monitor className="h-3.5 w-3.5 text-primary" />
															}
															{equipment.equipment_type}
														</div>
													)}
												</div>

												{/* Название — для простой техники */}
												<div className="space-y-2">
													<Label htmlFor="display_name" className="text-muted-foreground flex items-center gap-1.5">
														<Tag className="h-3 w-3" />
														{isSimple ? (
															<>Название <span className="text-destructive">*</span></>
														) : (
															"Название"
														)}
													</Label>
													<Input id="display_name" {...register("display_name")} disabled={!isEditing}
														placeholder="Samsung UE55TU7100…"
														className={`${inputCls} ${errors.display_name ? "border-destructive/50" : ""}`} />
													{errors.display_name && (
														<p className="text-xs text-destructive">{errors.display_name.message}</p>
													)}
												</div>
											</div>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
												<div className="space-y-2">
													<Label htmlFor="manufacturer" className="text-muted-foreground">Производитель</Label>
													<Input id="manufacturer" {...register("manufacturer")} disabled={!isEditing} className={inputCls} />
												</div>
												<div className="space-y-2">
													<Label htmlFor="model" className="text-muted-foreground">Модель</Label>
													<Input id="model" {...register("model")} disabled={!isEditing} className={inputCls} />
												</div>
											</div>

											{/* Инвентарный + серийный */}
											<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
												<div className="space-y-2">
													<Label htmlFor="inventory_number" className="text-muted-foreground">
														Инвентарный номер
														{!isSimple && <span className="text-destructive ml-1">*</span>}
													</Label>
													<Input id="inventory_number" {...register("inventory_number")} disabled={!isEditing}
														className={`font-mono ${inputCls} ${errors.inventory_number ? "border-destructive/50" : ""}`} />
													{errors.inventory_number && (
														<p className="text-xs text-destructive">{errors.inventory_number.message}</p>
													)}
												</div>
												<div className="space-y-2">
													<Label htmlFor="serial_number" className="text-muted-foreground">
														Серийный номер (S/N)
														{isSimple && <span className="text-primary/60 ml-1 text-[10px]">— основной ID</span>}
													</Label>
													<Input id="serial_number" {...register("serial_number")} disabled={!isEditing}
														className={`font-mono ${inputCls} ${errors.serial_number ? "border-destructive/50" : ""}`} />
													{errors.serial_number && (
														<p className="text-xs text-destructive">{errors.serial_number.message}</p>
													)}
												</div>
											</div>

											{/* МНИ — только для сложной техники */}
											{!isSimple && (
												<div className="space-y-2">
													<Label htmlFor="mni_serial_number" className="text-muted-foreground">Серийный номер МНИ</Label>
													<Input id="mni_serial_number" {...register("mni_serial_number")} disabled={!isEditing}
														className={`font-mono text-sm ${inputCls}`} />
												</div>
											)}
										</CardContent>
									</Card>

									{/* Технические характеристики — только для сложной техники */}
									{!isSimple && (
										<Card className="glass-elevated border-white/10 overflow-hidden">
											<CardHeader className="bg-white/5 border-b border-white/10">
												<CardTitle className="text-lg flex items-center gap-2">
													<Cpu className="h-4 w-4 text-primary" /> Спецификация
												</CardTitle>
											</CardHeader>
											<CardContent className="p-6 space-y-6">
												<div className="space-y-2">
													<Label htmlFor="cpu" className="text-muted-foreground">Процессор</Label>
													<Input id="cpu" {...register("cpu")} disabled={!isEditing} className={inputCls} />
												</div>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
													<div className="space-y-2">
														<Label htmlFor="ram_gb" className="text-muted-foreground">RAM (ГБ)</Label>
														<Input id="ram_gb" type="number" {...register("ram_gb", { valueAsNumber: true })} disabled={!isEditing} className={inputCls} />
													</div>
													<div className="space-y-2">
														<Label className="text-muted-foreground">Тип хранилища</Label>
														{isEditing ? (
															<Select value={currentStorageType} onValueChange={(val) => setValue("storage_type", val)}>
																<SelectTrigger className="bg-background/50 border-white/10">
																	<SelectValue placeholder="Выберите тип" />
																</SelectTrigger>
																<SelectContent className="glass border-white/10">
																	{STORAGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
																</SelectContent>
															</Select>
														) : (
															<div className="p-2.5 rounded-md bg-white/5 border border-transparent">{equipment.storage_type || "—"}</div>
														)}
													</div>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
													<div className="space-y-2">
														<Label htmlFor="storage_capacity_gb" className="text-muted-foreground">Объём (ГБ)</Label>
														<Input id="storage_capacity_gb" type="number" {...register("storage_capacity_gb", { valueAsNumber: true })} disabled={!isEditing} className={inputCls} />
													</div>
													<div className="space-y-2">
														<Label htmlFor="operating_system" className="text-muted-foreground">ОС</Label>
														<Input id="operating_system" {...register("operating_system")} disabled={!isEditing} className={inputCls} />
													</div>
												</div>

												{/* Периферия */}
												<div className="space-y-4">
													<Label className="text-xs font-bold uppercase tracking-widest text-primary/70">Периферия и аксессуары</Label>
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
														{([
															["has_optical_drive", "Оптический привод", null, null],
															["has_card_reader", "Картридер", null, null],
															["has_laptop", "Ноутбук", "laptop_functional", "Исправен"],
															["has_charger", "Зарядка", "charger_functional", "Исправна"],
															["has_mouse", "Мышь", "mouse_functional", "Исправна"],
															["has_bag", "Сумка", "bag_functional", "Исправна"],
														] as const).map(([id, label, subId, subLabel]) => (
															<div key={id} className="rounded-xl border border-white/5 bg-white/5 p-4">
																<div className="flex items-center justify-between">
																	<Label htmlFor={id} className="font-medium cursor-pointer">{label}</Label>
																	<Checkbox
																		id={id}
																		checked={watch(id as keyof EquipmentFormInput) as boolean}
																		onCheckedChange={(val) => setValue(id as keyof EquipmentFormInput, val as never)}
																		disabled={!isEditing}
																	/>
																</div>
																{subId && watch(id as keyof EquipmentFormInput) && (
																	<div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
																		<span>{subLabel}</span>
																		<Checkbox
																			id={subId}
																			checked={watch(subId as keyof EquipmentFormInput) as boolean}
																			onCheckedChange={(val) => setValue(subId as keyof EquipmentFormInput, val as never)}
																			disabled={!isEditing}
																		/>
																	</div>
																)}
															</div>
														))}
													</div>
												</div>
											</CardContent>
										</Card>
									)}
								</div>

								{/* Боковая колонка */}
								<div className="space-y-6">
									<Card className="glass-elevated border-white/10 overflow-hidden">
										<CardHeader className="bg-white/5 border-b border-white/10">
											<CardTitle className="text-lg flex items-center gap-2">
												<MapPin className="h-4 w-4 text-primary" /> Размещение
											</CardTitle>
										</CardHeader>
										<CardContent className="p-6 space-y-6">
											<div className="space-y-2">
												<Label className="text-muted-foreground flex items-center gap-1.5"><UserIcon className="h-3 w-3" /> Владелец</Label>
												{isEditing ? (
													<Select
														value={currentOwnerId != null ? currentOwnerId.toString() : "__no__"}
														onValueChange={(val) =>
															setValue("current_owner_id", val === "__no__" ? null : parseInt(val, 10))
														}
													>
														<SelectTrigger className="bg-background/50 border-white/10">
															<SelectValue />
														</SelectTrigger>
														<SelectContent className="glass border-white/10">
															<SelectItem value="__no__">—</SelectItem>
															{personnelData?.items.map((p) => (
																<SelectItem key={p.id} value={p.id.toString()}>
																	{p.rank ? `${p.rank} ` : ""}{p.full_name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												) : (
													<div className="p-2.5 rounded-md bg-white/5 text-sm">
														{equipment.current_owner_name ? (
															<div>
																<div className="font-semibold">{equipment.current_owner_name}</div>
																{equipment.current_owner_rank && (
																	<div className="text-xs text-muted-foreground mt-0.5">{equipment.current_owner_rank}</div>
																)}
															</div>
														) : "—"}
													</div>
												)}
											</div>
											<div className="space-y-2">
												<Label htmlFor="current_location" className="text-muted-foreground">Местоположение</Label>
												<Input id="current_location" {...register("current_location")} disabled={!isEditing} className={inputCls} />
											</div>
											<div className="space-y-2">
												<Label className="text-muted-foreground">Статус</Label>
												{isEditing ? (
													<Select value={currentStatus} onValueChange={(val) => setValue("status", val)}>
														<SelectTrigger className="bg-background/50 border-white/10">
															<SelectValue />
														</SelectTrigger>
														<SelectContent className="glass border-white/10">
															{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
														</SelectContent>
													</Select>
												) : (
													<div className="pt-1">{getStatusBadge(equipment.status)}</div>
												)}
											</div>
										</CardContent>
									</Card>

									<Card className="glass-elevated border-white/10 overflow-hidden">
										<CardHeader className="bg-white/5 border-b border-white/10">
											<CardTitle className="text-lg flex items-center gap-2">
												<Info className="h-4 w-4 text-primary" /> Примечания
											</CardTitle>
										</CardHeader>
										<CardContent className="p-6">
											<Textarea
												{...register("notes")}
												disabled={!isEditing}
												rows={4}
												placeholder="Дополнительная информация…"
												className="bg-background/50 border-white/10 resize-none disabled:opacity-100 disabled:bg-white/5"
											/>
										</CardContent>
									</Card>

									<Card className="bg-white/5 border-white/10">
										<CardContent className="p-5 space-y-3 text-xs text-muted-foreground">
											<div className="flex justify-between">
												<span className="flex items-center gap-1.5"><Hash className="h-3 w-3" /> ID</span>
												<span className="font-mono text-foreground/70">{equipment.id}</span>
											</div>
											<div className="flex justify-between">
												<span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Добавлено</span>
												<span className="text-foreground/70">{new Date(equipment.created_at).toLocaleDateString("ru-RU")}</span>
											</div>
											<div className="flex justify-between">
												<span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Изменено</span>
												<span className="text-foreground/70">{new Date(equipment.updated_at).toLocaleDateString("ru-RU")}</span>
											</div>
										</CardContent>
									</Card>
								</div>
							</div>

							{isEditing && (
								<div className="fixed bottom-8 right-8 z-50 flex gap-3 p-2 rounded-2xl glass-elevated border border-white/20 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
									<Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="hover:bg-white/10">
										Отмена
									</Button>
									<Button type="submit" disabled={updateMutation.isPending} className="gradient-primary border-0 px-6">
										{updateMutation.isPending ? "Сохранение..." : <><Save className="mr-2 h-4 w-4" /> Сохранить</>}
									</Button>
								</div>
							)}
						</form>
					</TabsContent>

					<TabsContent value="movements">
						<Card className="glass-elevated border-white/10 overflow-hidden">
							<CardHeader className="bg-white/5 border-b border-white/10 flex flex-row items-center justify-between py-6">
								<CardTitle className="text-lg">История перемещений</CardTitle>
								<Button asChild className="gradient-primary border-0 shadow-lg">
									<Link href={`/equipment/${equipmentId}/movements/create`}>
										Зафиксировать перемещение
									</Link>
								</Button>
							</CardHeader>
							<CardContent className="p-6">
								{!movementHistory?.items.length ? (
									<div className="text-center py-20 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
										История перемещений пуста
									</div>
								) : (
									<div className="space-y-4">
										{movementHistory?.items.map((movement) => (
											<div key={movement.id} className="border border-white/5 bg-white/5 rounded-xl p-5">
												<div className="flex justify-between items-start mb-3">
													<div className="text-sm font-bold text-primary/90">{movement.movement_type}</div>
													<div className="text-xs text-muted-foreground font-mono">
														{new Date(movement.created_at).toLocaleString("ru-RU")}
													</div>
												</div>
												<div className="grid grid-cols-2 gap-6 text-sm">
													<div>
														<div className="text-[10px] text-muted-foreground uppercase mb-1">Откуда</div>
														<div>{movement.from_location || "—"}</div>
														{movement.from_person_name && <div className="text-xs text-muted-foreground italic">{movement.from_person_name}</div>}
													</div>
													<div>
														<div className="text-[10px] text-primary/70 uppercase mb-1">Куда</div>
														<div>{movement.to_location}</div>
														{movement.to_person_name && <div className="text-xs text-muted-foreground italic">{movement.to_person_name}</div>}
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}