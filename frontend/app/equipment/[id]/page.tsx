"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, History, Save, Monitor, Cpu, MapPin, Info, Edit3, X, FileText, User as UserIcon, Calendar, Hash } from "lucide-react";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { equipmentApi } from "@/lib/api/equipment";
import { personnelApi } from "@/lib/api/personnel";
import { cleanEmptyStrings } from "@/lib/utils/transform";

const EQUIPMENT_TYPES = ["АРМ", "Ноутбук", "Сервер", "Принтер", "Другое"];
const STATUSES = ["В работе", "На складе", "В ремонте", "Списан"];
const STORAGE_TYPES = ["HDD", "SSD", "NVMe", "Другое"];

const equipmentSchema = z
	.object({
		equipment_type: z.string().min(1),
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
		laptop_functional: z.boolean().default(true),
		has_charger: z.boolean().default(false),
		charger_functional: z.boolean().default(true),
		has_mouse: z.boolean().default(false),
		mouse_functional: z.boolean().default(true),
		has_bag: z.boolean().default(false),
		bag_functional: z.boolean().default(true),
		operating_system: z.string().default(""),
		current_owner_id: z.number().nullable().optional(),
		current_location: z.string().default(""),
		status: z.string().default("В работе"),
		notes: z.string().default(""),
	})
	.superRefine((data, ctx) => {
		const isLaptopNotInUse =
			data.equipment_type === "Ноутбук" && data.status !== "В работе";

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
		register,
		handleSubmit,
		setFocus,
		setValue,
		watch,
		reset,
		formState: { errors },
	} = useForm<EquipmentFormInput, unknown, EquipmentFormData>({
		resolver: zodResolver(equipmentSchema),
		shouldFocusError: false,
	});

	useEffect(() => {
		if (equipment) {
			reset({
				equipment_type: equipment.equipment_type,
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
		mutationFn: (data: EquipmentFormData) =>
			equipmentApi.update(equipmentId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["equipment", equipmentId] });
			queryClient.invalidateQueries({ queryKey: ["equipment"] });
			setIsEditing(false);
			setError("");
			toast.success("Данные обновлены");
		},
		onError: (err: unknown) => {
			const error = err as { response?: { data?: { detail?: string } } };
			const detail = error.response?.data?.detail;
			setError(typeof detail === "string" ? detail : "Ошибка");
			toast.error("Ошибка при обновлении");
		},
	});

	const onSubmit = (data: EquipmentFormData) => {
		setError("");
		const cleanedData = cleanEmptyStrings(data);
		updateMutation.mutate(cleanedData as EquipmentFormData);
	};

	const onInvalidSubmit = (formErrors: FieldErrors<EquipmentFormInput>) => {
		toast.error("Проверьте обязательные поля формы");

		const firstErrorField = Object.keys(formErrors)[0] as
			| keyof EquipmentFormInput
			| undefined;

		if (firstErrorField && firstErrorField !== "inventory_number") {
			setFocus(firstErrorField);
		}
	};

	const currentType = watch("equipment_type");
	const currentStatus = watch("status");
	const currentOwnerId = watch("current_owner_id");
	const currentStorageType = watch("storage_type");
	const hasOpticalDrive = watch("has_optical_drive");
	const hasCardReader = watch("has_card_reader");
	const hasLaptop = watch("has_laptop");
	const hasCharger = watch("has_charger");
	const hasMouse = watch("has_mouse");
	const hasBag = watch("has_bag");
	const laptopFunctional = watch("laptop_functional");
	const chargerFunctional = watch("charger_functional");
	const mouseFunctional = watch("mouse_functional");
	const bagFunctional = watch("bag_functional");

	if (isLoading) {
		return (
			<div className="min-h-screen bg-slate-900 flex items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	if (!equipment) {
		return (
			<div className="min-h-screen bg-slate-900 flex items-center justify-center text-foreground">
				<p>Техника не найдена</p>
			</div>
		);
	}

	const getStatusBadge = (status: string) => {
		const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
			"В работе": "default",
			"На складе": "secondary",
			"В ремонте": "outline",
			Списан: "destructive",
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
							<h1 className="text-3xl font-bold tracking-tight">{equipment.inventory_number}</h1>
							{getStatusBadge(equipment.status)}
						</div>
						<p className="text-muted-foreground flex items-center gap-2">
							<span className="font-medium text-primary/80">{equipment.equipment_type}</span>
							{equipment.model && (
								<>
									<span className="opacity-30">•</span>
									<span>{equipment.manufacturer} {equipment.model}</span>
								</>
							)}
						</p>
					</div>
					<div className="flex gap-3">
						<Button 
							variant={isEditing ? "outline" : "secondary"} 
							onClick={() => setIsEditing(!isEditing)}
							className={!isEditing ? "bg-white/10 hover:bg-white/20 border-0" : "bg-transparent border-white/20"}
						>
							{isEditing ? (
								<><X className="mr-2 h-4 w-4" /> Отменить</>
							) : (
								<><Edit3 className="mr-2 h-4 w-4" /> Редактировать</>
							)}
						</Button>
					</div>
				</div>

				<Tabs defaultValue="details" className="space-y-6">
					<TabsList className="bg-background/50 border border-white/5 p-1">
						<TabsTrigger value="details" className="data-[state=active]:bg-primary/20">Детали устройства</TabsTrigger>
						<TabsTrigger value="movements" className="data-[state=active]:bg-primary/20">
							<History className="mr-2 h-4 w-4" />
							История ({movementHistory?.total || 0})
						</TabsTrigger>
					</TabsList>

					<TabsContent value="details" className="space-y-6">
						<form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}>
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
								{/* Основная колонка */}
								<div className="lg:col-span-2 space-y-6">
									{error && (
										<Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
											<AlertDescription>{error}</AlertDescription>
										</Alert>
									)}

									{/* Основная информация */}
									<Card className="glass-elevated border-white/10 overflow-hidden">
										<CardHeader className="bg-white/5 border-b border-white/10">
											<CardTitle className="text-lg flex items-center gap-2">
												<FileText className="h-4 w-4 text-primary" /> Основные данные
											</CardTitle>
										</CardHeader>
										<CardContent className="p-6 space-y-6">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
												<div className="space-y-2">
													<Label className="text-muted-foreground">Тип техники *</Label>
													{isEditing ? (
														<Select value={currentType} onValueChange={(val) => setValue("equipment_type", val)}>
															<SelectTrigger className={`bg-background/50 border-white/10 ${errors.equipment_type ? "border-destructive/50" : ""}`}>
																<SelectValue />
															</SelectTrigger>
															<SelectContent className="glass border-white/10">
																{EQUIPMENT_TYPES.map((type) => (
																	<SelectItem key={type} value={type}>{type}</SelectItem>
																))}
															</SelectContent>
														</Select>
													) : (
														<div className="p-2.5 rounded-md bg-white/5 border border-transparent font-medium">{equipment.equipment_type}</div>
													)}
												</div>

												<div className="space-y-2">
													<Label htmlFor="inventory_number" className="text-muted-foreground">Учетный номер *</Label>
													<Input
														id="inventory_number"
														{...register("inventory_number")}
														disabled={!isEditing}
														className="bg-background/50 border-white/10 font-mono focus:border-primary/50 disabled:opacity-100 disabled:bg-white/5"
													/>
												</div>
											</div>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
												<div className="space-y-2">
													<Label htmlFor="manufacturer" className="text-muted-foreground">Производитель</Label>
													<Input id="manufacturer" {...register("manufacturer")} disabled={!isEditing} className="bg-background/50 border-white/10 disabled:opacity-100 disabled:bg-white/5" />
												</div>
												<div className="space-y-2">
													<Label htmlFor="model" className="text-muted-foreground">Модель</Label>
													<Input id="model" {...register("model")} disabled={!isEditing} className="bg-background/50 border-white/10 disabled:opacity-100 disabled:bg-white/5" />
												</div>
											</div>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
												<div className="space-y-2">
													<Label htmlFor="serial_number" className="text-muted-foreground">Серийный номер (S/N)</Label>
													<Input id="serial_number" {...register("serial_number")} disabled={!isEditing} className="bg-background/50 border-white/10 font-mono text-sm disabled:opacity-100 disabled:bg-white/5" />
												</div>
												<div className="space-y-2">
													<Label htmlFor="mni_serial_number" className="text-muted-foreground">Серийный номер МНИ</Label>
													<Input id="mni_serial_number" {...register("mni_serial_number")} disabled={!isEditing} className="bg-background/50 border-white/10 font-mono text-sm disabled:opacity-100 disabled:bg-white/5" />
												</div>
											</div>
										</CardContent>
									</Card>

									{/* Технические характеристики */}
									<Card className="glass-elevated border-white/10 overflow-hidden">
										<CardHeader className="bg-white/5 border-b border-white/10">
											<CardTitle className="text-lg flex items-center gap-2">
												<Cpu className="h-4 w-4 text-primary" /> Спецификация
											</CardTitle>
										</CardHeader>
										<CardContent className="p-6 space-y-6">
											<div className="space-y-2">
												<Label htmlFor="cpu" className="text-muted-foreground">Процессор</Label>
												<Input id="cpu" {...register("cpu")} disabled={!isEditing} className="bg-background/50 border-white/10 disabled:opacity-100 disabled:bg-white/5" />
											</div>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
												<div className="space-y-2">
													<Label htmlFor="ram_gb" className="text-muted-foreground">RAM (ГБ)</Label>
													<Input id="ram_gb" type="number" {...register("ram_gb", { valueAsNumber: true })} disabled={!isEditing} className="bg-background/50 border-white/10 disabled:opacity-100 disabled:bg-white/5" />
												</div>
												<div className="space-y-2">
													<Label className="text-muted-foreground">Тип хранилища</Label>
													{isEditing ? (
														<Select value={currentStorageType} onValueChange={(val) => setValue("storage_type", val)}>
															<SelectTrigger className="bg-background/50 border-white/10">
																<SelectValue placeholder="Выберите тип" />
															</SelectTrigger>
															<SelectContent className="glass border-white/10">
																{STORAGE_TYPES.map((type) => (
																	<SelectItem key={type} value={type}>{type}</SelectItem>
																))}
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
													<Input id="storage_capacity_gb" type="number" {...register("storage_capacity_gb", { valueAsNumber: true })} disabled={!isEditing} className="bg-background/50 border-white/10 disabled:opacity-100 disabled:bg-white/5" />
												</div>
												<div className="space-y-2">
													<Label htmlFor="operating_system" className="text-muted-foreground">ОС</Label>
													<Input id="operating_system" {...register("operating_system")} disabled={!isEditing} className="bg-background/50 border-white/10 disabled:opacity-100 disabled:bg-white/5" />
												</div>
											</div>

											<div className="space-y-4">
												<Label className="text-xs font-bold uppercase tracking-widest text-primary/70">Периферия и аксессуары</Label>
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
													{/* Индивидуальные блоки для ноутбучных аксессуаров */}
													{[
														{ id: "has_optical_drive", label: "Оптический привод", type: "check" },
														{ id: "has_card_reader", label: "Картридер", type: "check" },
														{ id: "has_laptop", label: "Ноутбук", subId: "laptop_functional", subLabel: "Исправен" },
														{ id: "has_charger", label: "Зарядка", subId: "charger_functional", subLabel: "Исправна" },
														{ id: "has_mouse", label: "Мышь", subId: "mouse_functional", subLabel: "Исправна" },
														{ id: "has_bag", label: "Сумка", subId: "bag_functional", subLabel: "Исправна" },
													].map((item: any) => (
														<div key={item.id} className="rounded-xl border border-white/5 bg-white/5 p-4 flex flex-col justify-center">
															<div className="flex items-center justify-between">
																<Label htmlFor={item.id} className="font-medium cursor-pointer">{item.label}</Label>
																<Checkbox
																	id={item.id}
																	checked={watch(item.id as any)}
																	onCheckedChange={(val) => setValue(item.id as any, val as boolean)}
																	disabled={!isEditing}
																/>
															</div>
															{item.subId && watch(item.id as any) && (
																<div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
																	<span>{item.subLabel}</span>
																	<Checkbox
																		id={item.subId}
																		checked={watch(item.subId as any)}
																		onCheckedChange={(val) => setValue(item.subId as any, val as boolean)}
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
								</div>

								{/* Боковая колонка */}
								<div className="space-y-6">
									{/* Размещение */}
									<Card className="glass-elevated border-white/10 overflow-hidden">
										<CardHeader className="bg-white/5 border-b border-white/10">
											<CardTitle className="text-lg flex items-center gap-2">
												<MapPin className="h-4 w-4 text-primary" /> Размещение
											</CardTitle>
										</CardHeader>
										<CardContent className="p-6 space-y-6">
											<div className="space-y-2">
												<Label className="text-muted-foreground flex items-center gap-1.5">
													<UserIcon className="h-3 w-3" /> Владелец
												</Label>
												{isEditing ? (
													<Select
														value={currentOwnerId != null ? currentOwnerId.toString() : "__no_person__"}
														onValueChange={(val) =>
															setValue("current_owner_id", val === "__no_person__" ? null : parseInt(val, 10))
														}
													>
														<SelectTrigger className="bg-background/50 border-white/10">
															<SelectValue />
														</SelectTrigger>
														<SelectContent className="glass border-white/10">
															<SelectItem value="__no_person__">—</SelectItem>
															{personnelData?.items.map((person) => (
																<SelectItem key={person.id} value={person.id.toString()}>
																	{person.rank ? `${person.rank} ` : ""}{person.full_name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												) : (
													<div className="p-2.5 rounded-md bg-white/5 border border-transparent text-sm">
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
												<Input id="current_location" {...register("current_location")} disabled={!isEditing} className="bg-background/50 border-white/10 disabled:opacity-100 disabled:bg-white/5" />
											</div>

											<div className="space-y-2">
												<Label className="text-muted-foreground">Статус</Label>
												{isEditing ? (
													<Select value={currentStatus} onValueChange={(val) => setValue("status", val)}>
														<SelectTrigger className="bg-background/50 border-white/10">
															<SelectValue />
														</SelectTrigger>
														<SelectContent className="glass border-white/10">
															{STATUSES.map((status) => (
																<SelectItem key={status} value={status}>{status}</SelectItem>
															))}
														</SelectContent>
													</Select>
												) : (
													<div className="pt-1">{getStatusBadge(equipment.status)}</div>
												)}
											</div>
										</CardContent>
									</Card>

									{/* Примечания */}
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
												placeholder="Дополнительная информация..."
												className="bg-background/50 border-white/10 resize-none disabled:opacity-100 disabled:bg-white/5"
											/>
										</CardContent>
									</Card>

									{/* Мета-информация */}
									<Card className="bg-white/5 border-white/10">
										<CardContent className="p-5 space-y-3 text-xs text-muted-foreground">
											<div className="flex justify-between">
												<span className="flex items-center gap-1.5"><Hash className="h-3 w-3" /> ID устройства</span>
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
										{updateMutation.isPending ? "Сохранение..." : <><Save className="mr-2 h-4 w-4" /> Сохранить изменения</>}
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
								{movementHistory?.items.length === 0 ? (
									<div className="text-center py-20 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
										История перемещений пуста
									</div>
								) : (
									<div className="space-y-4">
										{movementHistory?.items.map((movement) => (
											<div
												key={movement.id}
												className="group relative border border-white/5 bg-white/5 rounded-xl p-5 hover:bg-white/10 transition-all"
											>
												<div className="flex justify-between items-start mb-4">
													<div>
														<div className="text-sm font-bold text-primary/90 mb-1">{movement.movement_type}</div>
														<div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
															<Calendar className="h-3 w-3" />
															{new Date(movement.created_at).toLocaleString("ru-RU")}
														</div>
													</div>
													{movement.document_number && (
														<Badge variant="outline" className="bg-background/30 border-white/10 text-[10px] tracking-wider uppercase">
															Док: {movement.document_number}
														</Badge>
													)}
												</div>

												<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
													<div className="space-y-3">
														<div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Источник</div>
														<div className="space-y-1">
															<div className="text-sm font-medium">{movement.from_location || "—"}</div>
															{movement.from_person_name && (
																<div className="text-xs text-muted-foreground italic flex items-center gap-1.5">
																	<UserIcon className="h-3 w-3" /> {movement.from_person_name}
																</div>
															)}
														</div>
													</div>
													<div className="space-y-3">
														<div className="text-[10px] uppercase tracking-widest text-primary/70 font-bold">Получатель / Место</div>
														<div className="space-y-1">
															<div className="text-sm font-medium">{movement.to_location}</div>
															{movement.to_person_name && (
																<div className="text-xs text-muted-foreground italic flex items-center gap-1.5">
																	<UserIcon className="h-3 w-3" /> {movement.to_person_name}
																</div>
															)}
														</div>
													</div>
												</div>

												{(movement.reason || movement.created_by_username) && (
													<div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
														{movement.reason && (
															<div className="text-xs">
																<span className="text-muted-foreground mr-1.5">Причина:</span>
																<span className="text-foreground/80">{movement.reason}</span>
															</div>
														)}
														{movement.created_by_username && (
															<div className="text-[10px] text-muted-foreground md:text-right self-end opacity-50">
																Оператор: {movement.created_by_username}
															</div>
														)}
													</div>
												)}
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